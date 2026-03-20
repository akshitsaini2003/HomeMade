const ContactInquiry = require('../models/ContactInquiry');
const asyncHandler = require('../utils/asyncHandler');
const { sendTemplatedEmail } = require('../services/emailService');
const { sendEmail } = require('../utils/email');
const { runInBackground } = require('../utils/backgroundTask');
const env = require('../config/env');

const submitContactForm = asyncHandler(async (req, res) => {
  const inquiry = await ContactInquiry.create(req.body);

  runInBackground('contact-emails', async () => {
    await Promise.allSettled([
      sendTemplatedEmail('contactConfirmation', inquiry.email, { name: inquiry.name }),
      sendEmail({
        to: env.adminEmail || inquiry.email,
        subject: `New Contact Inquiry from ${inquiry.name}`,
        html: `
          <p>Name: ${inquiry.name}</p>
          <p>Email: ${inquiry.email}</p>
          <p>Phone: ${inquiry.phone}</p>
          <p>Message: ${inquiry.message}</p>
        `
      })
    ]);
  });

  res.status(201).json({
    success: true,
    message: 'Inquiry submitted successfully. We will get back soon.',
    data: inquiry
  });
});

const listInquiries = asyncHandler(async (_req, res) => {
  const inquiries = await ContactInquiry.find().sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: inquiries });
});

const updateInquiryStatus = asyncHandler(async (req, res) => {
  const inquiry = await ContactInquiry.findByIdAndUpdate(
    req.params.inquiryId,
    { status: req.body.status || 'responded' },
    { new: true }
  );

  res.json({ success: true, message: 'Inquiry status updated', data: inquiry });
});

module.exports = {
  submitContactForm,
  listInquiries,
  updateInquiryStatus
};
