const User = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');

const addLoyaltyPoints = async ({ userId, points, orderId = null, session = null, meta = {} }) => {
  if (points <= 0) return;

  await User.findByIdAndUpdate(userId, { $inc: { loyaltyPoints: points } }, { session });

  await WalletTransaction.create(
    [{
      userId,
      amount: points,
      type: 'credit',
      reason: 'loyalty bonus',
      orderId,
      meta: { points, ...meta }
    }],
    { session }
  );
};

const deductLoyaltyPoints = async ({ userId, points, orderId = null, session = null, meta = {} }) => {
  if (points <= 0) return 0;

  const user = await User.findById(userId).select('loyaltyPoints').session(session);
  if (!user) return 0;

  const deduction = Math.min(Number(user.loyaltyPoints || 0), Number(points || 0));
  if (deduction <= 0) return 0;

  user.loyaltyPoints -= deduction;
  await user.save({ session });

  await WalletTransaction.create(
    [{
      userId,
      amount: deduction,
      type: 'debit',
      reason: 'loyalty bonus',
      orderId,
      meta: { ...meta, reversed: true }
    }],
    { session }
  );

  return deduction;
};

const redeemLoyaltyPoints = async ({ userId, points, session = null }) => {
  if (points <= 0) return null;
  return User.findOneAndUpdate(
    { _id: userId, loyaltyPoints: { $gte: points } },
    { $inc: { loyaltyPoints: -points } },
    { new: true, session }
  );
};

module.exports = {
  addLoyaltyPoints,
  deductLoyaltyPoints,
  redeemLoyaltyPoints
};
