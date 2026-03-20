const { body, param } = require('express-validator');

const createOrderValidator = [
  body('menuId').isMongoId(),
  body('slot').isIn(['lunch', 'dinner']),
  body('quantity').isInt({ min: 1, max: 20 }),
  body('fulfillmentType').optional().isIn(['pickup', 'dinein']),
  body('walletUse').optional().isFloat({ min: 0 }),
  body('couponCode').optional({ values: 'falsy' }).isString().isLength({ min: 2, max: 40 }),
  body('useLoyalty').optional().isBoolean(),
  body('addonSelections').optional().isArray(),
  body('addonSelections.*.addonId').optional().isMongoId(),
  body('addonSelections.*.quantity').optional().isInt({ min: 1, max: 20 })
];

const verifyPaymentValidator = [
  body('orderId').isMongoId(),
  body('razorpayOrderId').notEmpty(),
  body('razorpayPaymentId').notEmpty(),
  body('razorpaySignature').notEmpty()
];

const cancelOrderValidator = [
  param('orderId').isMongoId(),
  body('reason').optional().isString().isLength({ max: 200 })
];

const markOrderStatusValidator = [
  param('orderId').isMongoId(),
  body('orderStatus').isIn(['confirmed', 'preparing', 'ready', 'delivered', 'cancelled']),
  body('cancellationReason').optional().isString().isLength({ max: 200 })
];

module.exports = {
  createOrderValidator,
  verifyPaymentValidator,
  cancelOrderValidator,
  markOrderStatusValidator
};
