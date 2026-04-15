const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');

router.get('/cart', authenticateToken, cartController.getCart);
router.post('/cart', authenticateToken, cartController.addToCart);
router.delete('/cart/:id', authenticateToken, cartController.removeFromCart);

module.exports = router;