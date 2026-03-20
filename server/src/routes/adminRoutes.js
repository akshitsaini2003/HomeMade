const express = require('express');
const { protect } = require('../middlewares/auth');
const { requireAdmin } = require('../middlewares/admin');
const validate = require('../middlewares/validate');
const {
  blockUserValidator,
  creditUserLoyaltyValidator,
  refundDecisionValidator,
  settingsValidator,
  bulkNotificationValidator,
  couponIdValidator,
  couponCreateValidator,
  couponUpdateValidator
} = require('../validators/adminValidators');
const adminController = require('../controllers/adminController');

const router = express.Router();

router.use(protect, requireAdmin);

router.get('/dashboard', adminController.getDashboard);
router.get('/inventory', adminController.getInventoryInsights);
router.get('/orders', adminController.listOrders);
router.get('/orders/export', adminController.exportOrdersCsv);
router.get('/orders/daily-summary', adminController.dailySummary);

router.get('/users', adminController.listUsers);
router.get('/users/:userId/orders', adminController.getUserHistory);
router.patch('/users/:userId/block', blockUserValidator, validate, adminController.blockUser);
router.post('/users/:userId/loyalty-credit', creditUserLoyaltyValidator, validate, adminController.creditUserLoyalty);

router.get('/refunds', adminController.getRefundRequests);
router.patch('/refunds/:orderId', refundDecisionValidator, validate, adminController.decideRefund);

router.get('/settings', adminController.getSettings);
router.patch('/settings', settingsValidator, validate, adminController.updateSettings);

router.post('/notify', bulkNotificationValidator, validate, adminController.sendBulkAnnouncement);
router.get('/inquiries', adminController.listContactInquiries);
router.get('/coupons', adminController.listCoupons);
router.post('/coupons', couponCreateValidator, validate, adminController.createCoupon);
router.patch('/coupons/:couponId', [...couponIdValidator, ...couponUpdateValidator], validate, adminController.updateCoupon);
router.patch('/coupons/:couponId/toggle', couponIdValidator, validate, adminController.toggleCoupon);

module.exports = router;
