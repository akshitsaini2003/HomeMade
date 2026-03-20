const ApiError = require('../utils/ApiError');
const { verifyAccessToken } = require('../utils/jwt');
const User = require('../models/User');

const protect = async (req, _res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return next(new ApiError(401, 'Unauthorized: access token missing'));
  }

  try {
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub).select('-password');
    if (!user) {
      return next(new ApiError(401, 'Unauthorized: user not found'));
    }

    if (user.isBlocked) {
      return next(new ApiError(403, 'Account is blocked'));
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(new ApiError(401, 'Unauthorized: invalid access token'));
  }
};

module.exports = {
  protect
};
