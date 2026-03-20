const mongoose = require('mongoose');
const { ORDER_STATUS, PAYMENT_STATUS, SLOT_TYPES, FULFILLMENT_TYPES } = require('../utils/constants');

const addonOrderItemSchema = new mongoose.Schema(
  {
    addonId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    total: {
      type: Number,
      required: true,
      min: 0
    }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderCode: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    menuId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Menu',
      required: true
    },
    orderDate: {
      type: Date,
      default: Date.now,
      index: true
    },
    dailyOrderNumber: {
      type: Number,
      default: null,
      min: 1,
      index: true
    },
    mealDate: {
      type: Date,
      required: true,
      index: true
    },
    slot: {
      type: String,
      enum: SLOT_TYPES,
      required: true,
      index: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    addonTotal: {
      type: Number,
      default: 0,
      min: 0
    },
    addonItems: {
      type: [addonOrderItemSchema],
      default: []
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    couponCode: {
      type: String,
      default: null
    },
    couponDiscount: {
      type: Number,
      default: 0,
      min: 0
    },
    walletUsed: {
      type: Number,
      default: 0,
      min: 0
    },
    loyaltyPointsRedeemed: {
      type: Number,
      default: 0,
      min: 0
    },
    amountPaidOnline: {
      type: Number,
      default: 0,
      min: 0
    },
    paymentMethod: {
      type: String,
      enum: ['razorpay', 'wallet', 'hybrid'],
      required: true
    },
    razorpayOrderId: {
      type: String,
      default: null,
      index: true
    },
    paymentId: {
      type: String,
      default: null,
      index: true
    },
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUS,
      default: 'pending',
      index: true
    },
    orderStatus: {
      type: String,
      enum: ORDER_STATUS,
      default: 'pending',
      index: true
    },
    fulfillmentType: {
      type: String,
      enum: FULFILLMENT_TYPES,
      default: 'pickup'
    },
    deliveredCreditIssued: {
      type: Boolean,
      default: false
    },
    deliveredCreditAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    loyaltyPointsCredited: {
      type: Number,
      default: 0,
      min: 0
    },
    cancellationReason: {
      type: String,
      default: null
    },
    cancelledAt: {
      type: Date,
      default: null
    },
    refundMethod: {
      type: String,
      enum: ['wallet', 'source', null],
      default: null
    },
    refundStatus: {
      type: String,
      enum: ['none', 'requested', 'approved', 'rejected', 'processed'],
      default: 'none'
    },
    notes: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ mealDate: 1, slot: 1 });
orderSchema.index({ paymentStatus: 1, orderStatus: 1, createdAt: 1 });
orderSchema.index({ mealDate: 1, dailyOrderNumber: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Order', orderSchema);
