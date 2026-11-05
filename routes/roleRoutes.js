const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');

router.use(authenticateToken, authorizeRoles('admin', 'superadmin'));
router.get('/', roleController.listarRoles);
router.post('/', roleController.crearRol);
router.put('/:id', roleController.actualizarRol);
router.delete('/:id', roleController.eliminarRol);

module.exports = router;
