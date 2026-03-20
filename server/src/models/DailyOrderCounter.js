const mongoose = require('mongoose');

const dailyOrderCounterSchema = new mongoose.Schema(
  {
    dateKey: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    sequence: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('DailyOrderCounter', dailyOrderCounterSchema);
