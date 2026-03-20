const { body } = require('express-validator');

const registerValidator = [
  body('name').trim().notEmpty().isLength({ min: 2, max: 80 }),
  body('email').trim().isEmail().normalizeEmail(),
  body('phone').trim().isLength({ min: 10, max: 15 }),
  body('password').isStrongPassword({ minLength: 8, minSymbols: 1 })
];

const loginValidator = [
  body('email').trim().isEmail().normalizeEmail(),
  body('password').notEmpty()
];

const emailOtpValidator = [
  body('email').trim().isEmail().normalizeEmail(),
  body('otp').trim().isLength({ min: 6, max: 6 }).isNumeric()
];

const forgotPasswordValidator = [
  body('email').trim().isEmail().normalizeEmail()
];

const resetPasswordValidator = [
  body('email').trim().isEmail().normalizeEmail(),
  body('otp').trim().isLength({ min: 6, max: 6 }).isNumeric(),
  body('newPassword').isStrongPassword({ minLength: 8, minSymbols: 1 })
];

module.exports = {
  registerValidator,
  loginValidator,
  emailOtpValidator,
  forgotPasswordValidator,
  resetPasswordValidator
};
