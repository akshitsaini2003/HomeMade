const User = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');
const ApiError = require('../utils/ApiError');

const creditWallet = async ({ userId, amount, reason, orderId = null, session = null, meta = {} }) => {
  if (amount <= 0) return null;

  const user = await User.findByIdAndUpdate(
    userId,
    { $inc: { walletBalance: amount } },
    { new: true, session }
  );

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  await WalletTransaction.create(
    [{ userId, amount, type: 'credit', reason, orderId, meta }],
    { session }
  );

  return user;
};

const debitWallet = async ({ userId, amount, reason, orderId = null, session = null, meta = {} }) => {
  if (amount <= 0) return null;

  const user = await User.findOneAndUpdate(
    { _id: userId, walletBalance: { $gte: amount } },
    { $inc: { walletBalance: -amount } },
    { new: true, session }
  );

  if (!user) {
    throw new ApiError(400, 'Insufficient wallet balance');
  }

  await WalletTransaction.create(
    [{ userId, amount, type: 'debit', reason, orderId, meta }],
    { session }
  );

  return user;
};

module.exports = {
  creditWallet,
  debitWallet
};
