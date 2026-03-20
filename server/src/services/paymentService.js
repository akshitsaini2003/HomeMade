const crypto = require('crypto');
const razorpay = require('../config/razorpay');
const env = require('../config/env');

const createRazorpayOrder = async ({ amount, receipt, notes = {} }) => {
  if (!env.razorpay.keyId || !env.razorpay.keySecret) {
    throw new Error('Razorpay credentials are not configured');
  }

  return razorpay.orders.create({
    amount: Math.round(amount * 100),
    currency: 'INR',
    receipt,
    notes
  });
};

const verifyRazorpaySignature = ({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) => {
  if (!env.razorpay.keySecret) return false;

  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', env.razorpay.keySecret)
    .update(body)
    .digest('hex');

  return expectedSignature === razorpaySignature;
};

const verifyWebhookSignature = ({ payload, signature }) => {
  if (!env.razorpay.webhookSecret) return false;

  const expected = crypto
    .createHmac('sha256', env.razorpay.webhookSecret)
    .update(payload)
    .digest('hex');

  return expected === signature;
};

const createRefund = async ({ paymentId, amount }) => {
  return razorpay.payments.refund(paymentId, {
    amount: Math.round(amount * 100),
    speed: 'normal'
  });
};

module.exports = {
  createRazorpayOrder,
  verifyRazorpaySignature,
  verifyWebhookSignature,
  createRefund
};
