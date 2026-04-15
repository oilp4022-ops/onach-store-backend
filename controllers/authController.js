// controllers/authController.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer'); // <-- LIBRERÍA DE CORREOS
const Database = require('../database');
const db = Database.getInstance();
const secretKey = process.env.JWT_SECRET;

// CONFIGURACIÓN DE TU CORREO 
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'oilp.4022@gmail.com', 
        pass: 'irstfgyjcgmpuots' 
    }
});

const register = async (req, res) => {
    try {
        const { nombre, apellido, email, password } = req.body;
        if (!nombre || !apellido || !email || !password) return res.status(400).json({ error: 'Faltan campos.' });

        const existingUser = await db.query('SELECT id_cliente FROM clientes WHERE email = ?', [email]);
        if (existingUser.length > 0) return res.status(409).json({ error: 'Correo ya registrado.' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const sql = 'INSERT INTO clientes (nombre, apellido, email, password_hash, rol) VALUES (?, ?, ?, ?, ?)';
        await db.query(sql, [nombre, apellido, email, hashedPassword, 'cliente']);

        res.status(201).json({ message: 'Registrado exitosamente' });
    } catch (err) { res.status(500).json({ error: 'Error al registrar.' }); }
};

// PASO 1 DEL LOGIN: Verifica usuario y ENVÍA EL CORREO REAL
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const results = await db.query('SELECT * FROM clientes WHERE email = ?', [email]);

        if (results.length === 0) return res.status(401).json({ error: 'Usuario no encontrado' });
        const user = results[0];

        let isMatch = false;
        if (user.password_hash.startsWith('$2b$')) {
            isMatch = await bcrypt.compare(password, user.password_hash);
        } else {
            isMatch = (password === user.password_hash);
        }

        if (!isMatch) return res.status(401).json({ error: 'Contraseña incorrecta' });

        // Generar código de 6 dígitos
        const mfaCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expireDate = new Date();
        expireDate.setMinutes(expireDate.getMinutes() + 10); 

        // Guardar en Base de Datos
        await db.query('INSERT INTO mfa_codes (id_cliente, codigo_secreto, metodo_envio, fecha_expiracion) VALUES (?, ?, ?, ?)',
            [user.id_cliente, mfaCode, 'email', expireDate]);

        // ==========================================
        // MAGIA DE CORREO: Enviar email al usuario
        // ==========================================
        const mailOptions = {
            from: 'oilp.4022@gmail.com', // Debe ser el mismo de arriba
            to: user.email, // Se envía al correo que el usuario puso en el login
            subject: '🔐 Tu Código de Seguridad - Onach Store',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; text-align: center;">
                    <h2 style="color: #eb5683;">Onach Urban Store</h2>
                    <p style="font-size: 16px; color: #333;">Hola <b>${user.nombre}</b>,</p>
                    <p style="color: #555;">Tu código de seguridad para iniciar sesión es:</p>
                    <div style="background-color: #f4f4f4; padding: 15px; margin: 20px 0; border-radius: 8px;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #000;">${mfaCode}</span>
                    </div>
                    <p style="font-size: 12px; color: #999;">Este código expirará en 10 minutos. Si no intentaste iniciar sesión, ignora este mensaje.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Correo enviado exitosamente a: ${user.email}`);

        // Le decimos al FrontEnd que necesitamos el código
        res.json({ requireMFA: true, userId: user.id_cliente, message: 'Código MFA enviado a tu correo' });

    } catch (err) { 
        console.error("Error en login o enviando correo:", err);
        res.status(500).json({ error: 'Error en el servidor al enviar el correo.' }); 
    }
};

const verifyMFA = async (req, res) => {
    try {
        const { userId, mfaCode } = req.body;
        const results = await db.query(
            'SELECT * FROM mfa_codes WHERE id_cliente = ? AND codigo_secreto = ? AND usado = FALSE AND fecha_expiracion > NOW() ORDER BY id_mfa DESC LIMIT 1', 
            [userId, mfaCode]
        );

        if (results.length === 0) return res.status(401).json({ error: 'Código inválido o expirado' });

        await db.query('UPDATE mfa_codes SET usado = TRUE WHERE id_mfa = ?', [results[0].id_mfa]);

        const userResults = await db.query('SELECT * FROM clientes WHERE id_cliente = ?', [userId]);
        const user = userResults[0];

        const accessToken = jwt.sign({ id: user.id_cliente, role: user.rol }, secretKey, { expiresIn: '15m' });
        const refreshToken = crypto.randomBytes(40).toString('hex');
        const expireDate = new Date();
        expireDate.setDate(expireDate.getDate() + 7);
        await db.query('INSERT INTO refresh_tokens (id_cliente, token, fecha_expiracion) VALUES (?, ?, ?)',
            [user.id_cliente, refreshToken, expireDate]);

        const ip = req.ip || req.connection.remoteAddress;
        const device = req.headers['user-agent'] || 'Dispositivo Desconocido';
        await db.query('INSERT INTO sessions (id_cliente, dispositivo, direccion_ip) VALUES (?, ?, ?)',
            [user.id_cliente, device, ip]);

        res.json({ message: 'Login exitoso', token: accessToken, refreshToken: refreshToken, userName: user.nombre, role: user.rol });
    } catch (err) { res.status(500).json({ error: 'Error al verificar MFA' }); }
};

const refresh = async (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(401).json({ error: 'Refresh token requerido' });
    try {
        const results = await db.query('SELECT * FROM refresh_tokens WHERE token = ? AND revocado = FALSE AND fecha_expiracion > NOW()', [token]);
        if (results.length === 0) return res.status(403).json({ error: 'Refresh token inválido' });
        const id_cliente = results[0].id_cliente;
        const userResults = await db.query('SELECT rol FROM clientes WHERE id_cliente = ?', [id_cliente]);
        const newAccessToken = jwt.sign({ id: id_cliente, role: userResults[0].rol }, secretKey, { expiresIn: '15m' });
        res.json({ token: newAccessToken });
    } catch (err) { res.status(500).json({ error: 'Error al refrescar' }); }
};

const getActiveSessions = async (req, res) => {
    try {
        const sessions = await db.query('SELECT id_sesion, dispositivo, direccion_ip, fecha_creacion FROM sessions WHERE id_cliente = ? AND activa = TRUE', [req.user.id]);
        res.json(sessions);
    } catch(err) { res.status(500).json({error: 'Error obteniendo sesiones'}); }
};

// NUEVA FUNCIÓN: Enviar correo de recuperación
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const results = await db.query('SELECT id_cliente, nombre FROM clientes WHERE email = ?', [email]);
        
        if (results.length === 0) return res.status(404).json({ error: 'No hay ninguna cuenta registrada con ese correo.' });

        const user = results[0];
        const resetToken = Math.floor(100000 + Math.random() * 900000).toString(); // Código de 6 dígitos
        const expireDate = new Date();
        expireDate.setMinutes(expireDate.getMinutes() + 15); // Expira en 15 min

        await db.query('INSERT INTO password_resets (id_cliente, token_recuperacion, metodo, fecha_expiracion) VALUES (?, ?, ?, ?)',
            [user.id_cliente, resetToken, 'email', expireDate]);

        const mailOptions = {
            from: 'oilp.4022@hotmail.com', // Pon tu mismo correo cartero aquí
            to: email,
            subject: '🔄 Recuperación de Contraseña - Onach Store',
            html: `
                <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #eb5683;">Recuperación de Cuenta</h2>
                    <p>Hola <b>${user.nombre}</b>,</p>
                    <p>Hemos recibido una solicitud para restablecer tu contraseña. Usa este código:</p>
                    <div style="background-color: #f4f4f4; padding: 15px; margin: 20px 0; border-radius: 8px;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px;">${resetToken}</span>
                    </div>
                    <p style="font-size: 12px; color: #999;">Si no fuiste tú, ignora este correo.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        res.json({ message: 'Código de recuperación enviado a tu correo.' });
    } catch (err) { res.status(500).json({ error: 'Error al procesar la solicitud.' }); }
};

// NUEVA FUNCIÓN: Guardar la nueva contraseña
const resetPassword = async (req, res) => {
    try {
        const { email, token, newPassword } = req.body;
        
        const userResults = await db.query('SELECT id_cliente FROM clientes WHERE email = ?', [email]);
        if (userResults.length === 0) return res.status(404).json({ error: 'Usuario no encontrado.' });
        const userId = userResults[0].id_cliente;

        // Verificar que el código sea válido, no esté usado y no haya expirado
        const resetResults = await db.query(
            'SELECT id_reset FROM password_resets WHERE id_cliente = ? AND token_recuperacion = ? AND usado = FALSE AND fecha_expiracion > NOW() ORDER BY id_reset DESC LIMIT 1', 
            [userId, token]
        );

        if (resetResults.length === 0) return res.status(400).json({ error: 'Código inválido o expirado.' });

        // Encriptar la nueva contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Actualizar en la base de datos y marcar código como usado
        await db.query('UPDATE clientes SET password_hash = ? WHERE id_cliente = ?', [hashedPassword, userId]);
        await db.query('UPDATE password_resets SET usado = TRUE WHERE id_reset = ?', [resetResults[0].id_reset]);

        res.json({ message: 'Contraseña actualizada exitosamente.' });
    } catch (err) { res.status(500).json({ error: 'Error al cambiar la contraseña.' }); }
};

module.exports = { register, login, verifyMFA, refresh, getActiveSessions, forgotPassword, resetPassword };