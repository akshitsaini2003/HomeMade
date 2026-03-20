const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    image: { type: String, required: true }
  },
  { _id: false }
);

const addonSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    price: { type: Number, required: true, min: 0 },
    image: { type: String, default: '' },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: false }
);

const slotAvailabilitySchema = new mongoose.Schema(
  {
    slot: { type: String, enum: ['lunch', 'dinner'], lowercase: true, trim: true, required: true },
    totalPlates: { type: Number, required: true, min: 0 },
    remainingPlates: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const menuSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      unique: true,
      index: true
    },
    items: {
      type: [menuItemSchema],
      validate: [(items) => items.length > 0, 'At least one menu item is required']
    },
    addons: {
      type: [addonSchema],
      default: []
    },
    platePrice: {
      type: Number,
      required: true,
      min: 0
    },
    totalPlates: {
      type: Number,
      required: true,
      min: 1
    },
    remainingPlates: {
      type: Number,
      required: true,
      min: 0
    },
    cutoffTime: {
      type: Date,
      required: true,
      index: true
    },
    slots: {
      type: [String],
      enum: ['lunch', 'dinner'],
      default: ['lunch', 'dinner']
    },
    slotAvailability: {
      type: [slotAvailabilitySchema],
      default: []
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  { timestamps: true }
);

menuSchema.index({ date: 1, isActive: 1 });

module.exports = mongoose.model('Menu', menuSchema);
