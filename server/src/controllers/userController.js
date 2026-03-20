const dayjs = require('dayjs');
const User = require('../models/User');
const Order = require('../models/Order');
const Coupon = require('../models/Coupon');
const WalletTransaction = require('../models/WalletTransaction');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const env = require('../config/env');

const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).lean();
  res.json({
    success: true,
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      walletBalance: user.walletBalance,
      loyaltyPoints: user.loyaltyPoints,
      createdAt: user.createdAt
    }
  });
});

const updateProfile = asyncHandler(async (req, res) => {
  const allowed = ['name', 'phone'];
  const updates = {};

  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      updates[key] = req.body[key];
    }
  }

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true
  });

  res.json({ success: true, message: 'Profile updated', data: user });
});

const getDashboard = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const today = dayjs().startOf('day').toDate();

  const [
    user,
    totalOrders,
    upcomingOrders,
    completedOrders,
    totalSpentAgg,
    lastFiveOrders
  ] = await Promise.all([
    User.findById(userId).lean(),
    Order.countDocuments({ userId }),
    Order.countDocuments({ userId, mealDate: { $gte: today }, orderStatus: { $nin: ['cancelled'] } }),
    Order.countDocuments({ userId, orderStatus: 'delivered' }),
    Order.aggregate([
      { $match: { userId, paymentStatus: 'completed' } },
      { $group: { _id: null, totalSpent: { $sum: '$totalAmount' } } }
    ]),
    Order.find({ userId }).sort({ createdAt: -1 }).limit(5).lean()
  ]);

  res.json({
    success: true,
    data: {
      profile: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone
      },
      walletBalance: user.walletBalance,
      loyaltyPoints: user.loyaltyPoints,
      stats: {
        totalOrders,
        upcomingOrders,
        completedOrders,
        totalSpent: totalSpentAgg[0]?.totalSpent || 0
      },
      recentOrders: lastFiveOrders
    }
  });
});

const getWalletTransactions = asyncHandler(async (req, res) => {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 20);

  const [transactions, total] = await Promise.all([
    WalletTransaction.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    WalletTransaction.countDocuments({ userId: req.user._id })
  ]);

  res.json({
    success: true,
    data: {
      items: transactions,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
});

const redeemLoyalty = asyncHandler(async (req, res) => {
  const points = Number(req.body.points || 0);
  if (points <= 0) {
    throw new ApiError(400, 'Points must be positive');
  }

  if (points % env.loyalty.redeemPoints !== 0) {
    throw new ApiError(400, `Points must be in multiples of ${env.loyalty.redeemPoints}`);
  }

  const walletCredit = (points / env.loyalty.redeemPoints) * env.loyalty.redeemValue;

  const user = await User.findOneAndUpdate(
    { _id: req.user._id, loyaltyPoints: { $gte: points } },
    { $inc: { loyaltyPoints: -points, walletBalance: walletCredit } },
    { new: true }
  );

  if (!user) {
    throw new ApiError(400, 'Not enough loyalty points');
  }

  await WalletTransaction.create({
    userId: req.user._id,
    amount: walletCredit,
    type: 'credit',
    reason: 'loyalty bonus',
    meta: { redeemedPoints: points }
  });

  res.json({
    success: true,
    message: `Redeemed ${points} points for INR ${walletCredit.toFixed(2)}`,
    data: { walletCredit, loyaltyPoints: user.loyaltyPoints }
  });
});

const getOrderStats = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const stats = await Order.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id: '$orderStatus',
        count: { $sum: 1 }
      }
    }
  ]);

  res.json({ success: true, data: stats });
});

const listActiveCoupons = asyncHandler(async (_req, res) => {
  const now = new Date();
  const coupons = await Coupon.find({
    isActive: true,
    $and: [
      { $or: [{ validFrom: null }, { validFrom: { $lte: now } }] },
      { $or: [{ validTo: null }, { validTo: { $gte: now } }] }
    ]
  })
    .sort({ createdAt: -1 })
    .lean();

  res.json({ success: true, data: coupons });
});

module.exports = {
  getProfile,
  updateProfile,
  getDashboard,
  getWalletTransactions,
  redeemLoyalty,
  getOrderStats,
  listActiveCoupons
};
