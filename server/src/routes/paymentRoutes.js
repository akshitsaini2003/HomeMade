const express = require('express');
const { protect } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { verifyPaymentValidator } = require('../validators/orderValidators');
const paymentController = require('../controllers/paymentController');

const router = express.Router();

router.post('/verify', protect, verifyPaymentValidator, validate, paymentController.verifyPayment);
router.post('/webhook', paymentController.razorpayWebhook);

module.exports = router;
