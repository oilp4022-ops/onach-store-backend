const Database = require('../database');
const db = Database.getInstance();

const listarRoles = async (req, res) => {
    try {
        const roles = await db.query('SELECT id_rol, nombre, descripcion, estado, fecha_creacion FROM roles ORDER BY id_rol');
        res.json(roles);
    } catch (err) {
        console.error('Error al listar roles:', err);
        res.status(500).json({ error: 'Error al consultar el catálogo de roles.' });
    }
};

const crearRol = async (req, res) => {
    try {
        const { nombre, descripcion, estado } = req.body;
        const nombreNormalizado = String(nombre || '').trim().toLowerCase();
        if (!nombreNormalizado) return res.status(400).json({ error: 'El nombre del rol es obligatorio.' });

        const existe = await db.query('SELECT id_rol FROM roles WHERE nombre = ?', [nombreNormalizado]);
        if (existe.length) return res.status(409).json({ error: 'El rol ya existe.' });

        const result = await db.query(
            'INSERT INTO roles (nombre, descripcion, estado) VALUES (?, ?, ?)',
            [nombreNormalizado, descripcion || '', estado || 'activo']
        );
        res.status(201).json({ message: 'Rol creado correctamente.', id: result.insertId });
    } catch (err) {
        console.error('Error al crear rol:', err);
        res.status(500).json({ error: 'Error al crear el rol.' });
    }
};

const actualizarRol = async (req, res) => {
    try {
        const { nombre, descripcion, estado } = req.body;
        const nombreNormalizado = String(nombre || '').trim().toLowerCase();
        if (!nombreNormalizado) return res.status(400).json({ error: 'El nombre del rol es obligatorio.' });

        const result = await db.query(
            'UPDATE roles SET nombre = ?, descripcion = ?, estado = ? WHERE id_rol = ?',
            [nombreNormalizado, descripcion || '', estado || 'activo', req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Rol no encontrado.' });
        res.json({ message: 'Rol actualizado correctamente.' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ya existe otro rol con ese nombre.' });
        console.error('Error al actualizar rol:', err);
        res.status(500).json({ error: 'Error al actualizar el rol.' });
    }
};

const eliminarRol = async (req, res) => {
    try {
        const role = await db.query('SELECT nombre FROM roles WHERE id_rol = ?', [req.params.id]);
        if (!role.length) return res.status(404).json({ error: 'Rol no encontrado.' });

        const users = await db.query('SELECT COUNT(*) AS total FROM clientes WHERE rol = ?', [role[0].nombre]);
        if (Number(users[0].total) > 0) {
            return res.status(409).json({ error: 'No se puede eliminar un rol que está asignado a usuarios. Desasígnalo primero.' });
        }

        await db.query('DELETE FROM roles WHERE id_rol = ?', [req.params.id]);
        res.json({ message: 'Rol eliminado correctamente.' });
    } catch (err) {
        console.error('Error al eliminar rol:', err);
        res.status(500).json({ error: 'Error al eliminar el rol.' });
    }
};

module.exports = { listarRoles, crearRol, actualizarRol, eliminarRol };
