const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middlewares/authMiddleware');

router.get('/activar/:token', authController.activarCuenta);
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/verify-mfa', authController.verifyMFA);
router.post('/refresh', authController.refresh);
router.post('/logout', authenticateToken, authController.logout);
router.get('/sessions', authenticateToken, authController.getActiveSessions);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

module.exports = router;
