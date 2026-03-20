const express = require('express');
const { protect } = require('../middlewares/auth');
const { requireAdmin } = require('../middlewares/admin');
const validate = require('../middlewares/validate');
const {
  createOrderValidator,
  cancelOrderValidator,
  markOrderStatusValidator
} = require('../validators/orderValidators');
const orderController = require('../controllers/orderController');

const router = express.Router();

router.post('/', protect, createOrderValidator, validate, orderController.createOrder);
router.get('/my', protect, orderController.listMyOrders);
router.get('/my/:orderId', protect, orderController.getOrderById);
router.post('/my/:orderId/cancel', protect, cancelOrderValidator, validate, orderController.cancelOrder);
router.get('/my/:orderId/invoice', protect, orderController.downloadInvoice);
router.patch('/admin/:orderId/status', protect, requireAdmin, markOrderStatusValidator, validate, orderController.markOrderStatus);

module.exports = router;
