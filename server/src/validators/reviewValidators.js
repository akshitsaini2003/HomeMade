const { body, param } = require('express-validator');

const createReviewValidator = [
  body('orderId').isMongoId(),
  body('menuId').isMongoId(),
  body('rating').isInt({ min: 1, max: 5 }),
  body('tasteRating').isInt({ min: 1, max: 5 }),
  body('quantityRating').isInt({ min: 1, max: 5 }),
  body('packagingRating').isInt({ min: 1, max: 5 }),
  body('valueRating').isInt({ min: 1, max: 5 }),
  body('comment').optional().isString().isLength({ max: 600 })
];

const reviewIdValidator = [
  param('reviewId').isMongoId()
];

module.exports = {
  createReviewValidator,
  reviewIdValidator
};
