const mongoose = require('mongoose');

const contactInquirySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    status: {
      type: String,
      enum: ['new', 'responded'],
      default: 'new',
      index: true
    }
  },
  { timestamps: true }
);

contactInquirySchema.index({ createdAt: -1 });

module.exports = mongoose.model('ContactInquiry', contactInquirySchema);
