// controllers/adminController.js
const Database = require('../database');
const db = Database.getInstance();

// Endpoint Crítico 1: Eliminar un usuario (Solo SUPERADMIN)
const deleteUser = async (req, res) => {
    const userId = req.params.id;
    try {
        // Validación extra de seguridad: No puedes borrarte a ti mismo
        if (req.user.id == userId) {
            return res.status(403).json({ error: 'No puedes auto-eliminarte.' });
        }

        const result = await db.query('DELETE FROM clientes WHERE id_cliente = ?', [userId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }
        res.json({ message: `Usuario con ID ${userId} eliminado permanentemente.` });
    } catch (error) {
        res.status(500).json({ error: 'Error al intentar eliminar el usuario.' });
    }
};

// Endpoint Crítico 2: Ver reportes financieros (SUPERADMIN y ADMIN)
const getFinancialReports = async (req, res) => {
    try {
        // Aquí iría la consulta real a la tabla de ventas. Lo simulamos para la práctica:
        const reporte = {
            mesActual: "Marzo 2026",
            ingresosMensuales: 12540.50,
            ventasTotales: 85,
            crecimiento: "+12.5%"
        };
        res.json({ message: 'Reporte financiero clasificado generado exitosamente.', data: reporte });
    } catch (error) {
        res.status(500).json({ error: 'Error generando reporte financiero.' });
    }
};

module.exports = { deleteUser, getFinancialReports };