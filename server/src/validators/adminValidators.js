const { body, param } = require('express-validator');

const blockUserValidator = [
  param('userId').isMongoId(),
  body('isBlocked').isBoolean()
];

const creditUserLoyaltyValidator = [
  param('userId').isMongoId(),
  body('points').isInt({ min: 1, max: 100000 }),
  body('reason').optional().isString().isLength({ max: 200 })
];

const refundDecisionValidator = [
  param('orderId').isMongoId(),
  body('approve').isBoolean(),
  body('method').optional().isIn(['wallet', 'source']),
  body('reason').optional().isString().isLength({ max: 200 })
];

const settingsValidator = [
  body('businessName').optional().isString().isLength({ max: 100 }),
  body('address').optional().isString().isLength({ max: 300 }),
  body('contact').optional().isString().isLength({ max: 40 }),
  body('deliveryCharges').optional().isFloat({ min: 0 }),
  body('loyaltyPointsPerOrder').optional().isInt({ min: 1 }),
  body('loyaltyRedeemPoints').optional().isInt({ min: 1 }),
  body('loyaltyRedeemValue').optional().isInt({ min: 1 })
];

const bulkNotificationValidator = [
  body('title').notEmpty().isLength({ max: 120 }),
  body('message').notEmpty().isLength({ max: 1200 }),
  body('channel').optional().isIn(['email', 'inapp', 'both'])
];

const couponIdValidator = [
  param('couponId').isMongoId()
];

const couponCreateValidator = [
  body('code').notEmpty().isString().isLength({ min: 2, max: 40 }),
  body('title').optional().isString().isLength({ max: 120 }),
  body('description').optional().isString().isLength({ max: 300 }),
  body('discountPercent').isFloat({ min: 1, max: 100 }),
  body('maxDiscountAmount').isFloat({ min: 0 }),
  body('minOrderAmount').optional().isFloat({ min: 0 }),
  body('isActive').optional().isBoolean(),
  body('validFrom').optional({ values: 'falsy' }).isISO8601(),
  body('validTo').optional({ values: 'falsy' }).isISO8601()
];

const couponUpdateValidator = [
  body('code').optional().isString().isLength({ min: 2, max: 40 }),
  body('title').optional().isString().isLength({ max: 120 }),
  body('description').optional().isString().isLength({ max: 300 }),
  body('discountPercent').optional().isFloat({ min: 1, max: 100 }),
  body('maxDiscountAmount').optional().isFloat({ min: 0 }),
  body('minOrderAmount').optional().isFloat({ min: 0 }),
  body('isActive').optional().isBoolean(),
  body('validFrom').optional({ values: 'falsy' }).isISO8601(),
  body('validTo').optional({ values: 'falsy' }).isISO8601()
];

module.exports = {
  blockUserValidator,
  creditUserLoyaltyValidator,
  refundDecisionValidator,
  settingsValidator,
  bulkNotificationValidator,
  couponIdValidator,
  couponCreateValidator,
  couponUpdateValidator
};
