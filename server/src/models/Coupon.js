const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    title: {
      type: String,
      default: '',
      trim: true,
      maxlength: 120
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: 300
    },
    discountPercent: {
      type: Number,
      required: true,
      min: 1,
      max: 100
    },
    maxDiscountAmount: {
      type: Number,
      required: true,
      min: 0
    },
    minOrderAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    validFrom: {
      type: Date,
      default: null
    },
    validTo: {
      type: Date,
      default: null
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  { timestamps: true }
);

couponSchema.index({ isActive: 1, validFrom: 1, validTo: 1 });

module.exports = mongoose.model('Coupon', couponSchema);
