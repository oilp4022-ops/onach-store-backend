const bcrypt = require('bcryptjs');
const Database = require('../database');
const { validatePassword } = require('../utils/passwordPolicy');
const db = Database.getInstance();

const obtenerUsuarios = async (req, res) => {
    try {
        const usuarios = await db.query('SELECT id_cliente, nombre, apellido, email, rol, estado FROM clientes ORDER BY id_cliente DESC');
        res.json(usuarios);
    } catch (err) {
        console.error('Error al obtener usuarios:', err);
        res.status(500).json({ error: 'Error al consultar la lista de usuarios.' });
    }
};

const obtenerUsuarioPorId = async (req, res) => {
    try {
        const usuarios = await db.query('SELECT id_cliente, nombre, apellido, email, rol, estado FROM clientes WHERE id_cliente = ?', [req.params.id]);
        if (usuarios.length === 0) return res.status(404).json({ error: 'Usuario no encontrado.' });
        res.json(usuarios[0]);
    } catch (err) {
        console.error('Error al obtener usuario:', err);
        res.status(500).json({ error: 'Error al consultar el usuario.' });
    }
};

const validateRole = async (rol) => {
    const roleExists = await db.query("SELECT id_rol FROM roles WHERE nombre = ? AND estado = 'activo'", [rol]);
    return roleExists.length > 0;
};

const crearUsuarioAdmin = async (req, res) => {
    try {
        const { nombre, apellido, email, password, rol, estado } = req.body;
        const normalizedEmail = String(email || '').trim().toLowerCase();
        const normalizedRole = String(rol || 'cliente').trim().toLowerCase();

        if (!nombre || !normalizedEmail || !password) return res.status(400).json({ error: 'Nombre, email y contraseña son obligatorios.' });
        if (!(await validateRole(normalizedRole))) return res.status(400).json({ error: 'El rol seleccionado no existe o está inactivo.' });

        const passwordCheck = validatePassword(password);
        if (!passwordCheck.valid) return res.status(400).json({ error: 'La contraseña no cumple con los requisitos de seguridad.', details: passwordCheck.errors });

        const existe = await db.query('SELECT id_cliente FROM clientes WHERE LOWER(email) = ?', [normalizedEmail]);
        if (existe.length > 0) return res.status(409).json({ error: 'El correo ya se encuentra registrado.' });

        const hashedPassword = await bcrypt.hash(password, 12);
        await db.query(
            'INSERT INTO clientes (nombre, apellido, email, password_hash, rol, estado) VALUES (?, ?, ?, ?, ?, ?)',
            [nombre.trim(), String(apellido || '').trim(), normalizedEmail, hashedPassword, normalizedRole, estado || 'activo']
        );
        res.status(201).json({ message: 'Usuario creado exitosamente por el administrador.' });
    } catch (err) {
        console.error('Error al crear usuario:', err);
        res.status(500).json({ error: 'Error al crear el usuario.' });
    }
};

const actualizarUsuarioAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, apellido, email, rol, estado, password } = req.body;
        const normalizedEmail = String(email || '').trim().toLowerCase();
        const normalizedRole = String(rol || '').trim().toLowerCase();

        const userExist = await db.query('SELECT id_cliente FROM clientes WHERE id_cliente = ?', [id]);
        if (userExist.length === 0) return res.status(404).json({ error: 'Usuario no encontrado.' });
        if (!(await validateRole(normalizedRole))) return res.status(400).json({ error: 'El rol seleccionado no existe o está inactivo.' });

        const duplicate = await db.query('SELECT id_cliente FROM clientes WHERE LOWER(email) = ? AND id_cliente <> ?', [normalizedEmail, id]);
        if (duplicate.length) return res.status(409).json({ error: 'El correo ya pertenece a otro usuario.' });

        if (password && password.trim() !== '') {
            const passwordCheck = validatePassword(password);
            if (!passwordCheck.valid) return res.status(400).json({ error: 'La contraseña no cumple con los requisitos de seguridad.', details: passwordCheck.errors });
            const hashedPassword = await bcrypt.hash(password, 12);
            await db.query('UPDATE clientes SET nombre = ?, apellido = ?, email = ?, rol = ?, estado = ?, password_hash = ? WHERE id_cliente = ?', [nombre, apellido || '', normalizedEmail, normalizedRole, estado || 'activo', hashedPassword, id]);
        } else {
            await db.query('UPDATE clientes SET nombre = ?, apellido = ?, email = ?, rol = ?, estado = ? WHERE id_cliente = ?', [nombre, apellido || '', normalizedEmail, normalizedRole, estado || 'activo', id]);
        }

        res.json({ message: 'Usuario actualizado correctamente.' });
    } catch (err) {
        console.error('Error al actualizar usuario:', err);
        res.status(500).json({ error: 'Error al actualizar la información del usuario.' });
    }
};

const eliminarUsuarioAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        if (String(req.user.id) === String(id)) return res.status(403).json({ error: 'No puedes eliminar tu propio usuario.' });
        const result = await db.query('DELETE FROM clientes WHERE id_cliente = ?', [id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'El usuario a eliminar no existe.' });
        res.json({ message: 'Usuario eliminado del catálogo exitosamente.' });
    } catch (err) {
        console.error('Error al eliminar usuario:', err);
        res.status(500).json({ error: 'Error al eliminar el usuario. Verifique restricciones de clave foránea.' });
    }
};

module.exports = { obtenerUsuarios, obtenerUsuarioPorId, crearUsuarioAdmin, actualizarUsuarioAdmin, eliminarUsuarioAdmin };
