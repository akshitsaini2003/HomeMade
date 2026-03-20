const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      unique: true
    },
    menuId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Menu',
      required: true
    },
    rating: { type: Number, min: 1, max: 5, required: true },
    tasteRating: { type: Number, min: 1, max: 5, required: true },
    quantityRating: { type: Number, min: 1, max: 5, required: true },
    packagingRating: { type: Number, min: 1, max: 5, required: true },
    valueRating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, trim: true, maxlength: 600, default: '' }
  },
  { timestamps: true }
);

reviewSchema.index({ menuId: 1, createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);
