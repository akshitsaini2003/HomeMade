const express = require('express');
const { protect } = require('../middlewares/auth');
const { requireAdmin } = require('../middlewares/admin');
const validate = require('../middlewares/validate');
const { contactValidator } = require('../validators/contactValidators');
const contactController = require('../controllers/contactController');

const router = express.Router();

router.post('/', contactValidator, validate, contactController.submitContactForm);
router.get('/admin', protect, requireAdmin, contactController.listInquiries);
router.patch('/admin/:inquiryId', protect, requireAdmin, contactController.updateInquiryStatus);

module.exports = router;
