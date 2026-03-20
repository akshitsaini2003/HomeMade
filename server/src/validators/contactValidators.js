const { body } = require('express-validator');

const contactValidator = [
  body('name').trim().notEmpty().isLength({ min: 2, max: 80 }),
  body('email').trim().isEmail().normalizeEmail(),
  body('phone').trim().isLength({ min: 10, max: 15 }),
  body('message').trim().notEmpty().isLength({ min: 10, max: 2000 })
];

module.exports = {
  contactValidator
};
