// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Importar nuestros 3 niveles de seguridad
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');
const auditLogger = require('../middlewares/auditMiddleware');

// RUTA 1: Eliminar Usuario (Máxima Seguridad)
// Flujo: 1. Verifica login -> 2. Verifica si es SUPERADMIN -> 3. Registra en el log -> 4. Borra
router.delete('/admin/deleteUser/:id', authenticateToken, authorizeRoles('superadmin'), auditLogger, adminController.deleteUser);

// RUTA 2: Reportes Financieros (Nivel Alto)
// Flujo: 1. Verifica login -> 2. Verifica si es superadmin O admin -> 3. Registra en el log -> 4. Muestra
router.get('/financial/reports', authenticateToken, authorizeRoles('superadmin', 'admin'), auditLogger, adminController.getFinancialReports);

module.exports = router;