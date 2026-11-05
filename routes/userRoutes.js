const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');

// Catálogo de usuarios: solo administradores autenticados.
router.use(authenticateToken, authorizeRoles('admin', 'superadmin'));
router.get('/', userController.obtenerUsuarios);
router.get('/:id', userController.obtenerUsuarioPorId);
router.post('/', userController.crearUsuarioAdmin);
router.put('/:id', userController.actualizarUsuarioAdmin);
router.delete('/:id', userController.eliminarUsuarioAdmin);

module.exports = router;
