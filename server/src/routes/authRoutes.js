const express = require('express');
const validate = require('../middlewares/validate');
const { authLimiter } = require('../middlewares/rateLimiter');
const { protect } = require('../middlewares/auth');
const {
  registerValidator,
  loginValidator,
  emailOtpValidator,
  forgotPasswordValidator,
  resetPasswordValidator
} = require('../validators/authValidators');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/register', authLimiter, registerValidator, validate, authController.register);
router.post('/verify-email', authLimiter, emailOtpValidator, validate, authController.verifyEmail);
router.post('/resend-verification', authLimiter, forgotPasswordValidator, validate, authController.resendVerificationOtp);
router.post('/login', authLimiter, loginValidator, validate, authController.login);
router.post('/refresh', authController.refresh);
router.post('/forgot-password', authLimiter, forgotPasswordValidator, validate, authController.forgotPassword);
router.post('/reset-password', authLimiter, resetPasswordValidator, validate, authController.resetPassword);
router.post('/logout', authController.logout);
router.get('/me', protect, authController.me);

module.exports = router;
