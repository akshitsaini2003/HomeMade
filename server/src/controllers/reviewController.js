const Review = require('../models/Review');
const Order = require('../models/Order');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const createReview = asyncHandler(async (req, res) => {
  const {
    orderId,
    menuId,
    rating,
    tasteRating,
    quantityRating,
    packagingRating,
    valueRating,
    comment
  } = req.body;

  const order = await Order.findOne({ _id: orderId, userId: req.user._id });
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  if (order.orderStatus !== 'delivered') {
    throw new ApiError(400, 'You can review only delivered orders');
  }

  const existing = await Review.findOne({ orderId });
  if (existing) {
    throw new ApiError(409, 'Review already submitted for this order');
  }

  const review = await Review.create({
    userId: req.user._id,
    orderId,
    menuId,
    rating,
    tasteRating,
    quantityRating,
    packagingRating,
    valueRating,
    comment
  });

  res.status(201).json({ success: true, message: 'Review submitted', data: review });
});

const listMenuReviews = asyncHandler(async (req, res) => {
  const menuId = req.params.menuId || req.query.menuId;
  if (!menuId) {
    throw new ApiError(400, 'menuId is required');
  }

  const reviews = await Review.find({ menuId })
    .populate('userId', 'name')
    .sort({ createdAt: -1 })
    .lean();

  const avg = reviews.length
    ? reviews.reduce((acc, current) => acc + current.rating, 0) / reviews.length
    : 0;

  res.json({
    success: true,
    data: {
      averageRating: Number(avg.toFixed(2)),
      count: reviews.length,
      reviews
    }
  });
});

const myReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ userId: req.user._id })
    .populate('orderId', 'orderCode mealDate slot')
    .sort({ createdAt: -1 })
    .lean();

  res.json({ success: true, data: reviews });
});

module.exports = {
  createReview,
  listMenuReviews,
  myReviews
};
