const Razorpay = require('razorpay');
const env = require('./env');

const razorpay = new Razorpay({
  key_id: env.razorpay.keyId || 'test_key',
  key_secret: env.razorpay.keySecret || 'test_secret'
});

module.exports = razorpay;
