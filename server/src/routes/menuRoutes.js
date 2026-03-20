const express = require('express');
const { protect } = require('../middlewares/auth');
const { requireAdmin } = require('../middlewares/admin');
const validate = require('../middlewares/validate');
const { imageUpload } = require('../middlewares/upload');
const { createMenuValidator, menuIdValidator, updateMenuValidator } = require('../validators/menuValidators');
const menuController = require('../controllers/menuController');

const router = express.Router();

router.get('/tomorrow', menuController.getTomorrowMenu);
router.get('/by-date', menuController.getMenuByDate);

router.get('/admin/list', protect, requireAdmin, menuController.listMenus);
router.post('/admin', protect, requireAdmin, imageUpload.array('images', 30), createMenuValidator, validate, menuController.createMenu);
router.patch('/admin/:menuId', protect, requireAdmin, imageUpload.array('images', 30), updateMenuValidator, validate, menuController.updateMenu);
router.patch('/admin/:menuId/toggle', protect, requireAdmin, menuIdValidator, validate, menuController.toggleMenu);
router.delete('/admin/:menuId', protect, requireAdmin, menuIdValidator, validate, menuController.deleteMenu);

module.exports = router;
