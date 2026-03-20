const express = require('express');
const { protect } = require('../middlewares/auth');
const notificationController = require('../controllers/notificationController');

const router = express.Router();

router.get('/', protect, notificationController.listNotifications);
router.patch('/:notificationId/read', protect, notificationController.markAsRead);
router.patch('/read-all', protect, notificationController.markAllAsRead);

module.exports = router;
