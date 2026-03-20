const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    businessName: { type: String, default: 'HomeMade' },
    address: { type: String, default: '' },
    contact: { type: String, default: '' },
    deliveryCharges: { type: Number, default: 0 },
    loyaltyPointsPerOrder: { type: Number, default: 10 },
    loyaltyRedeemPoints: { type: Number, default: 100 },
    loyaltyRedeemValue: { type: Number, default: 50 }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Setting', settingsSchema);
