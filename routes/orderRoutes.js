const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticateToken } = require('../middlewares/authMiddleware');

router.post('/orders', authenticateToken, orderController.placeOrder);

module.exports = router;