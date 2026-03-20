const dayjs = require('dayjs');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const PendingSignup = require('../models/PendingSignup');
const AuthToken = require('../models/AuthToken');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { generateOtp, hashOtp } = require('../utils/otp');
const { sendTemplatedEmail } = require('../services/emailService');
const { runInBackground } = require('../utils/backgroundTask');

const buildAuthResponse = (user, accessToken, refreshToken) => ({
  user: {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isVerified: user.isVerified,
    walletBalance: user.walletBalance,
    loyaltyPoints: user.loyaltyPoints
  },
  tokens: {
    accessToken,
    refreshToken
  }
});

const issueTokens = async (user) => {
  const accessToken = generateAccessToken({ sub: String(user._id), role: user.role });
  const refreshToken = generateRefreshToken({ sub: String(user._id), role: user.role });

  await AuthToken.create({
    userId: user._id,
    token: refreshToken,
    type: 'refresh',
    expiresAt: dayjs().add(7, 'day').toDate()
  });

  return { accessToken, refreshToken };
};

const register = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser?.isVerified) {
    throw new ApiError(409, 'Email already registered');
  }

  if (existingUser && !existingUser.isVerified) {
    await User.deleteOne({ _id: existingUser._id });
  }

  const otp = generateOtp();
  const passwordHash = await bcrypt.hash(password, 12);

  await PendingSignup.findOneAndUpdate(
    { email },
    {
      name,
      email,
      phone,
      password: passwordHash,
      emailVerificationOTP: hashOtp(otp),
      emailVerificationOTPExpiry: dayjs().add(10, 'minute').toDate(),
      expiresAt: dayjs().add(1, 'day').toDate()
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    }
  );

  runInBackground('register-email-verification', async () => {
    await sendTemplatedEmail('emailVerification', email, { name, otp });
  });

  res.status(201).json({
    success: true,
    message: 'Registration successful. Please verify your email using OTP.',
    data: {
      email
    }
  });
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const verifiedUser = await User.findOne({ email });
  if (verifiedUser?.isVerified) {
    return res.json({ success: true, message: 'Email already verified' });
  }

  const pending = await PendingSignup.findOne({ email }).select('+password');
  if (!pending) {
    throw new ApiError(404, 'No pending verification found. Please register again.');
  }

  const otpHash = hashOtp(otp);
  if (
    otpHash !== pending.emailVerificationOTP
    || dayjs().isAfter(dayjs(pending.emailVerificationOTPExpiry))
  ) {
    throw new ApiError(400, 'Invalid or expired OTP');
  }

  const createdUser = await User.create({
    name: pending.name,
    email: pending.email,
    phone: pending.phone,
    password: pending.password,
    role: 'user',
    isVerified: true
  });

  await PendingSignup.deleteOne({ _id: pending._id });

  runInBackground('welcome-email', async () => {
    await sendTemplatedEmail('welcome', createdUser.email, { name: createdUser.name });
  });

  res.json({ success: true, message: 'Email verified successfully' });
});

const resendVerificationOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (user?.isVerified) {
    return res.json({ success: true, message: 'Email already verified' });
  }

  const pending = await PendingSignup.findOne({ email });
  if (!pending) {
    throw new ApiError(404, 'No pending verification found. Please register again.');
  }

  const otp = generateOtp();
  pending.emailVerificationOTP = hashOtp(otp);
  pending.emailVerificationOTPExpiry = dayjs().add(10, 'minute').toDate();
  pending.expiresAt = dayjs().add(1, 'day').toDate();
  await pending.save();

  runInBackground('resend-email-verification', async () => {
    await sendTemplatedEmail('emailVerification', pending.email, { name: pending.name, otp });
  });

  res.json({ success: true, message: 'Verification OTP resent' });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  let user = await User.findOne({ email }).select('+password');
  if (user && !user.isVerified) {
    await User.deleteOne({ _id: user._id });
    user = null;
  }

  if (!user) {
    const pending = await PendingSignup.findOne({ email }).lean();
    if (pending) {
      throw new ApiError(403, 'Email verification pending. Please verify OTP before login.');
    }
    throw new ApiError(401, 'Invalid credentials');
  }

  if (user.isBlocked) {
    throw new ApiError(403, 'Account is blocked by admin');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid credentials');
  }

  user.lastLoginAt = new Date();
  await user.save();

  const { accessToken, refreshToken } = await issueTokens(user);

  res.json({
    success: true,
    message: 'Login successful',
    data: buildAuthResponse(user, accessToken, refreshToken)
  });
});

const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.body.refreshToken;
  if (!refreshToken) {
    throw new ApiError(400, 'Refresh token is required');
  }

  const decoded = verifyRefreshToken(refreshToken);
  const tokenDoc = await AuthToken.findOne({ token: refreshToken, userId: decoded.sub });
  if (!tokenDoc) {
    throw new ApiError(401, 'Invalid refresh token');
  }

  const user = await User.findById(decoded.sub);
  if (!user) {
    throw new ApiError(401, 'User not found');
  }

  const accessToken = generateAccessToken({ sub: String(user._id), role: user.role });

  res.json({
    success: true,
    message: 'Access token refreshed',
    data: { accessToken }
  });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    return res.json({ success: true, message: 'If email is registered, OTP has been sent' });
  }

  const otp = generateOtp();
  user.resetPasswordOTP = hashOtp(otp);
  user.resetPasswordOTPExpiry = dayjs().add(10, 'minute').toDate();
  await user.save();

  runInBackground('forgot-password-otp', async () => {
    await sendTemplatedEmail('passwordReset', user.email, { name: user.name, otp });
  });

  res.json({ success: true, message: 'Reset OTP sent to email' });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const otpHash = hashOtp(otp);
  if (!user.resetPasswordOTP || user.resetPasswordOTP !== otpHash || dayjs().isAfter(user.resetPasswordOTPExpiry)) {
    throw new ApiError(400, 'Invalid or expired OTP');
  }

  user.password = newPassword;
  user.resetPasswordOTP = null;
  user.resetPasswordOTPExpiry = null;
  await user.save();

  await AuthToken.deleteMany({ userId: user._id });

  res.json({ success: true, message: 'Password reset successful' });
});

const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.body.refreshToken;
  if (refreshToken) {
    await AuthToken.deleteOne({ token: refreshToken });
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json({
    success: true,
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isVerified: user.isVerified,
      walletBalance: user.walletBalance,
      loyaltyPoints: user.loyaltyPoints,
      createdAt: user.createdAt
    }
  });
});

module.exports = {
  register,
  verifyEmail,
  resendVerificationOtp,
  login,
  refresh,
  forgotPassword,
  resetPassword,
  logout,
  me
};
