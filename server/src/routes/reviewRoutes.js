const express = require('express');
const { protect } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { createReviewValidator } = require('../validators/reviewValidators');
const reviewController = require('../controllers/reviewController');

const router = express.Router();

router.get('/menu/:menuId', reviewController.listMenuReviews);
router.post('/', protect, createReviewValidator, validate, reviewController.createReview);
router.get('/my', protect, reviewController.myReviews);

module.exports = router;
