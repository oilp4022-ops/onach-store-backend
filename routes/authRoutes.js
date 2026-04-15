// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');


const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');

console.log("✅ Archivo de rutas de autenticación cargado correctamente.");

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/verify-mfa', authController.verifyMFA);
router.post('/refresh', authController.refresh);

// LÍNEA 13: Ahora authenticateToken sí es una función válida
router.get('/sessions', authenticateToken, authController.getActiveSessions);

// Rutas de Recuperación
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

module.exports = router;