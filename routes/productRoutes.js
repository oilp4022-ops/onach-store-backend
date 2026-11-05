const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticateToken } = require('../middlewares/authMiddleware');

router.get('/', productController.getProducts);
router.get('/productos', productController.getProducts);
router.get('/productos/:id', productController.getProductById);

router.post('/products', authenticateToken, productController.createProduct);
router.put('/products/:id', authenticateToken, productController.updateProduct);
router.delete('/products/:id', authenticateToken, productController.deleteProduct);

// Maestro/detalle: variantes de producto
router.get('/products/:productId/variants', authenticateToken, productController.listVariants);
router.post('/products/:productId/variants', authenticateToken, productController.createVariant);
router.put('/products/:productId/variants/:variantId', authenticateToken, productController.updateVariant);
router.delete('/products/:productId/variants/:variantId', authenticateToken, productController.deleteVariant);

module.exports = router;
