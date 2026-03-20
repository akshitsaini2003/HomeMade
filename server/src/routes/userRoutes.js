const express = require('express');
const { protect } = require('../middlewares/auth');
const userController = require('../controllers/userController');

const router = express.Router();

router.get('/profile', protect, userController.getProfile);
router.patch('/profile', protect, userController.updateProfile);
router.get('/dashboard', protect, userController.getDashboard);
router.get('/wallet', protect, userController.getWalletTransactions);
router.get('/stats', protect, userController.getOrderStats);
router.post('/loyalty/redeem', protect, userController.redeemLoyalty);
router.get('/coupons/active', protect, userController.listActiveCoupons);

module.exports = router;
