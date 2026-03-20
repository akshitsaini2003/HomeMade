const { body, param } = require('express-validator');

const createMenuValidator = [
  body('date').isISO8601(),
  body('platePrice').isFloat({ min: 0 }),
  body('totalPlates').isInt({ min: 1 }),
  body('cutoffTime').isISO8601(),
  body('slots').optional().custom((value) => Array.isArray(value) || typeof value === 'string'),
  body('slotAvailability').optional().custom((value) => Array.isArray(value) || typeof value === 'string'),
  body('items').optional().custom((value) => Array.isArray(value) || typeof value === 'string'),
  body('addons').optional().custom((value) => Array.isArray(value) || typeof value === 'string')
];

const menuIdValidator = [
  param('menuId').isMongoId()
];

const updateMenuValidator = [
  param('menuId').isMongoId(),
  body('platePrice').optional().isFloat({ min: 0 }),
  body('totalPlates').optional().isInt({ min: 1 }),
  body('remainingPlates').optional().isInt({ min: 0 }),
  body('cutoffTime').optional().isISO8601(),
  body('isActive').optional().isBoolean(),
  body('slots').optional().custom((value) => Array.isArray(value) || typeof value === 'string'),
  body('items').optional().custom((value) => Array.isArray(value) || typeof value === 'string'),
  body('addons').optional().custom((value) => Array.isArray(value) || typeof value === 'string')
];

module.exports = {
  createMenuValidator,
  menuIdValidator,
  updateMenuValidator
};
