const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const Database = require('../database');
const { validatePassword } = require('../utils/passwordPolicy');

const db = Database.getInstance();
const secretKey = process.env.JWT_SECRET;

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const unwrap = (results) => {
    if (!results) return [];
    if (Array.isArray(results) && results.length > 0 && Array.isArray(results[0])) return results[0];
    return Array.isArray(results) ? results : [];
};

const getClientIp = (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length) return forwarded.split(',')[0].trim();
    return req.ip || req.socket?.remoteAddress || 'desconocida';
};

const getDevice = (req) => {
    const ua = req.get('user-agent') || 'Dispositivo desconocido';
    return ua.length > 240 ? ua.slice(0, 240) : ua;
};

const createRefreshToken = async (idCliente, sessionId) => {
    const refreshToken = crypto.randomBytes(48).toString('hex');
    await db.query(
        'INSERT INTO refresh_tokens (id_cliente, id_sesion, token, fecha_expiracion, revocado) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY), FALSE)',
        [idCliente, sessionId, refreshToken]
    );
    return refreshToken;
};

const createSession = async (idCliente, req) => {
    const result = await db.query(
        'INSERT INTO sessions (id_cliente, dispositivo, direccion_ip, fecha_creacion, activa) VALUES (?, ?, ?, NOW(), TRUE)',
        [idCliente, getDevice(req), getClientIp(req)]
    );
    return result.insertId;
};

const validateCaptcha = async (captchaResponse) => {
    if (!captchaResponse || typeof captchaResponse !== 'string') {
        return { valid: false, error: 'Debes completar el CAPTCHA.' };
    }
    if (!process.env.RECAPTCHA_SECRET) {
        return { valid: false, error: 'RECAPTCHA_SECRET no está configurado en el servidor.' };
    }

    const verifyResponse = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            secret: process.env.RECAPTCHA_SECRET,
            response: captchaResponse
        })
    });

    const data = await verifyResponse.json();
    console.log('🔐 reCAPTCHA:', {
        success: data.success,
        hostname: data.hostname || null,
        errors: data['error-codes'] || []
    });

    if (!data.success) {
        return {
            valid: false,
            error: 'Fallo de verificación CAPTCHA por parte de Google.',
            details: data['error-codes'] || []
        };
    }

    return { valid: true, hostname: data.hostname || null };
};

// --- REGISTRO ---
const register = async (req, res) => {
    try {
        const { nombre, apellido, email, password, captchaResponse, privacyAccepted } = req.body;
        const normalizedEmail = String(email || '').trim().toLowerCase();

        if (!nombre || !normalizedEmail || !password) {
            return res.status(400).json({ error: 'Nombre, correo y contraseña son obligatorios.' });
        }

        if (privacyAccepted !== true) {
            return res.status(400).json({ error: 'Debes aceptar el Aviso de Privacidad para registrarte.' });
        }

        try {
            const captcha = await validateCaptcha(captchaResponse);
            if (!captcha.valid) return res.status(400).json({ error: captcha.error, details: captcha.details || [] });
        } catch (captchaError) {
            console.error('❌ Error al comunicarse con Google reCAPTCHA:', captchaError.message);
            return res.status(503).json({ error: 'No fue posible verificar el CAPTCHA con Google.' });
        }

        const passwordCheck = validatePassword(password);
        if (!passwordCheck.valid) {
            return res.status(400).json({ error: 'La contraseña no cumple con los requisitos de seguridad.', details: passwordCheck.errors });
        }

        const existingUser = unwrap(await db.query('SELECT id_cliente FROM clientes WHERE LOWER(email) = ?', [normalizedEmail]));
        if (existingUser.length > 0) return res.status(409).json({ error: 'Correo ya registrado.' });

        const hashedPassword = await bcrypt.hash(password, 12);
        const tokenActivacion = crypto.randomBytes(32).toString('hex');

        const result = await db.query(
            'INSERT INTO clientes (nombre, apellido, email, password_hash, rol, estado, token_activacion) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [nombre.trim(), String(apellido || '').trim(), normalizedEmail, hashedPassword, 'cliente', 'inactivo', tokenActivacion]
        );

        await db.query(
            'INSERT INTO consentimientos (id_cliente, tipo, aceptado, version, fecha_aceptacion, origen) VALUES (?, ?, TRUE, ?, NOW(), ?)',
            [result.insertId, 'aviso_privacidad', 'v1.0', 'registro_web']
        );

        const backendBaseUrl = process.env.BACKEND_PUBLIC_URL || `http://localhost:${process.env.PORT || 3006}`;
        const urlActivacion = `${backendBaseUrl.replace(/\/$/, '')}/api/activar/${tokenActivacion}`;

        try {
            await transporter.sendMail({
                from: `"Seguridad Onach" <${process.env.EMAIL_USER}>`,
                to: normalizedEmail,
                subject: 'Activa tu cuenta - Onach Urban Store',
                html: `
                    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px">
                        <h2 style="color:#eb5683">¡Bienvenido, ${String(nombre).replace(/[<>]/g, '')}!</h2>
                        <p>Tu registro se realizó correctamente, pero tu cuenta permanece inactiva hasta confirmar tu correo.</p>
                        <p>Haz clic en el siguiente botón para activar tu cuenta:</p>
                        <p><a href="${urlActivacion}" style="background:#eb5683;color:#fff;padding:12px 20px;text-decoration:none;border-radius:6px;display:inline-block">Activar cuenta</a></p>
                        <p style="font-size:12px;color:#666">Si no solicitaste esta cuenta, puedes ignorar este mensaje.</p>
                    </div>`
            });
        } catch (mailError) {
            console.error('❌ No fue posible enviar el correo de activación:', mailError.message);
            return res.status(503).json({ error: 'Usuario creado como inactivo, pero no fue posible enviar el correo de activación. Verifica EMAIL_USER y EMAIL_PASS.' });
        }

        return res.status(201).json({ message: 'Registro exitoso. Revisa tu correo y pulsa el enlace de activación.' });
    } catch (err) {
        console.error('Error Registro:', err);
        return res.status(500).json({ error: 'Error interno del servidor al registrar.' });
    }
};

// --- ACTIVACIÓN ---
const activarCuenta = async (req, res) => {
    try {
        const { token } = req.params;
        const results = unwrap(await db.query('SELECT id_cliente FROM clientes WHERE token_activacion = ?', [token]));
        if (results.length === 0) return res.status(400).send('<h1 style="color:red;text-align:center">Token inválido o ya utilizado.</h1>');

        await db.query('UPDATE clientes SET estado = "activo", token_activacion = NULL WHERE id_cliente = ?', [results[0].id_cliente]);
        const frontendBaseUrl = process.env.FRONTEND_PUBLIC_URL || 'http://localhost:8080';
        return res.redirect(`${frontendBaseUrl.replace(/\/$/, '')}/login.html?activado=true`);
    } catch (err) {
        console.error('Error Activación:', err);
        return res.status(500).send('Error interno al activar la cuenta.');
    }
};

// --- LOGIN: credenciales -> MFA ---
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const normalizedEmail = String(email || '').trim().toLowerCase();
        if (!normalizedEmail || !password) return res.status(400).json({ error: 'Email y contraseña son obligatorios.' });

        const results = unwrap(await db.query('SELECT * FROM clientes WHERE LOWER(email) = ?', [normalizedEmail]));
        // Mensaje genérico: no revelar si el correo existe (CP-04, enumeración de usuarios)
        if (results.length === 0) return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
        const user = results[0];

        if (user.estado === 'inactivo') return res.status(403).json({ error: 'Tu cuenta no está activa. Revisa tu correo electrónico.' });
        if (user.bloqueo_hasta && new Date(user.bloqueo_hasta) > new Date()) return res.status(403).json({ error: 'Cuenta bloqueada temporalmente por múltiples intentos.' });

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            const intentos = Number(user.intentos_fallidos || 0) + 1;
            if (intentos >= 5) {
                await db.query('UPDATE clientes SET intentos_fallidos = ?, bloqueo_hasta = DATE_ADD(NOW(), INTERVAL 15 MINUTE) WHERE id_cliente = ?', [intentos, user.id_cliente]);
            } else {
                await db.query('UPDATE clientes SET intentos_fallidos = ? WHERE id_cliente = ?', [intentos, user.id_cliente]);
            }
            return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
        }

        await db.query('UPDATE clientes SET intentos_fallidos = 0, bloqueo_hasta = NULL WHERE id_cliente = ?', [user.id_cliente]);
        await db.query('DELETE FROM mfa_codes WHERE id_cliente = ? AND (usado = TRUE OR fecha_expiracion <= NOW())', [user.id_cliente]);

        const mfaCode = crypto.randomInt(100000, 1000000).toString();
        await db.query('INSERT INTO mfa_codes (id_cliente, codigo_secreto, fecha_expiracion, usado) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE), FALSE)', [user.id_cliente, mfaCode]);

        try {
            await transporter.sendMail({
                from: `"Seguridad Onach" <${process.env.EMAIL_USER}>`,
                to: user.email,
                subject: 'Tu código de seguridad - Onach Urban Store',
                html: `<div style="font-family:Arial;text-align:center;padding:20px"><h2>Código de seguridad</h2><p>Tu código MFA es:</p><h1 style="letter-spacing:8px">${mfaCode}</h1><p>Expira en 10 minutos.</p></div>`
            });
        } catch (mailErr) {
            await db.query('UPDATE mfa_codes SET usado = TRUE WHERE id_cliente = ? AND codigo_secreto = ?', [user.id_cliente, mfaCode]);
            console.error('❌ No fue posible enviar el correo MFA:', mailErr.message);
            return res.status(503).json({ error: 'No fue posible enviar el código MFA. Verifica la configuración del correo.' });
        }

        return res.json({ requireMFA: true, userId: user.id_cliente });
    } catch (err) {
        console.error('Error en Login:', err);
        return res.status(500).json({ error: 'Error al procesar el inicio de sesión.' });
    }
};

// --- VERIFICAR MFA -> JWT + refresh token + sesión ---
const verifyMFA = async (req, res) => {
    try {
        const { userId, mfaCode } = req.body;
        const results = unwrap(await db.query(
            'SELECT id_mfa FROM mfa_codes WHERE id_cliente = ? AND codigo_secreto = ? AND usado = FALSE AND fecha_expiracion > NOW() ORDER BY id_mfa DESC LIMIT 1',
            [userId, mfaCode]
        ));
        if (results.length === 0) return res.status(401).json({ error: 'Código inválido o expirado.' });

        await db.query('UPDATE mfa_codes SET usado = TRUE WHERE id_mfa = ?', [results[0].id_mfa]);
        const userResults = unwrap(await db.query('SELECT nombre, rol FROM clientes WHERE id_cliente = ? AND estado = "activo"', [userId]));
        if (!userResults.length) return res.status(403).json({ error: 'La cuenta no está disponible.' });

        const sessionId = await createSession(userId, req);
        const token = jwt.sign({ id: userId, role: userResults[0].rol, sessionId }, secretKey, { expiresIn: '15m' });
        const refreshToken = await createRefreshToken(userId, sessionId);

        return res.json({ token, refreshToken, userName: userResults[0].nombre, role: userResults[0].rol });
    } catch (err) {
        console.error('Error verificando MFA:', err);
        return res.status(500).json({ error: 'Error verificando MFA.' });
    }
};

// --- REFRESH TOKEN: rotación ---
const refresh = async (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(401).json({ error: 'Refresh token requerido.' });
    try {
        const results = unwrap(await db.query(
            'SELECT id_refresh, id_cliente, id_sesion FROM refresh_tokens WHERE token = ? AND revocado = FALSE AND fecha_expiracion > NOW() LIMIT 1',
            [token]
        ));
        if (!results.length) return res.status(403).json({ error: 'Refresh token inválido o expirado.' });

        const refreshRow = results[0];
        const userResults = unwrap(await db.query('SELECT nombre, rol FROM clientes WHERE id_cliente = ? AND estado = "activo"', [refreshRow.id_cliente]));
        if (!userResults.length) return res.status(403).json({ error: 'Cuenta no disponible.' });

        await db.query('UPDATE refresh_tokens SET revocado = TRUE WHERE id_refresh = ?', [refreshRow.id_refresh]);
        const newRefreshToken = await createRefreshToken(refreshRow.id_cliente, refreshRow.id_sesion);
        const newAccessToken = jwt.sign({ id: refreshRow.id_cliente, role: userResults[0].rol, sessionId: refreshRow.id_sesion }, secretKey, { expiresIn: '15m' });

        return res.json({ token: newAccessToken, refreshToken: newRefreshToken, userName: userResults[0].nombre, role: userResults[0].rol });
    } catch (err) {
        console.error('Error al refrescar:', err);
        return res.status(500).json({ error: 'Error al refrescar la sesión.' });
    }
};

// --- LOGOUT ---
const logout = async (req, res) => {
    try {
        if (req.user?.sessionId) {
            await db.query('UPDATE sessions SET activa = FALSE WHERE id_sesion = ? AND id_cliente = ?', [req.user.sessionId, req.user.id]);
            await db.query('UPDATE refresh_tokens SET revocado = TRUE WHERE id_sesion = ? AND id_cliente = ?', [req.user.sessionId, req.user.id]);
        } else {
            await db.query('UPDATE sessions SET activa = FALSE WHERE id_cliente = ?', [req.user.id]);
            await db.query('UPDATE refresh_tokens SET revocado = TRUE WHERE id_cliente = ?', [req.user.id]);
        }
        return res.json({ message: 'Sesión cerrada correctamente.' });
    } catch (err) {
        console.error('Error al cerrar sesión:', err);
        return res.status(500).json({ error: 'No fue posible cerrar la sesión.' });
    }
};

// --- SESIONES ACTIVAS ---
const getActiveSessions = async (req, res) => {
    try {
        const sessions = unwrap(await db.query(
            'SELECT id_sesion, dispositivo, direccion_ip, fecha_creacion FROM sessions WHERE id_cliente = ? AND activa = TRUE ORDER BY fecha_creacion DESC',
            [req.user.id]
        ));
        res.json(sessions);
    } catch (err) {
        console.error('Error obteniendo sesiones:', err);
        res.status(500).json({ error: 'Error obteniendo sesiones.' });
    }
};

// --- RECUPERACIÓN ---
const forgotPassword = async (req, res) => {
    try {
        const normalizedEmail = String(req.body.email || '').trim().toLowerCase();
        if (!normalizedEmail) return res.status(400).json({ error: 'El correo es obligatorio.' });

        const results = unwrap(await db.query('SELECT id_cliente, nombre, email FROM clientes WHERE LOWER(email) = ?', [normalizedEmail]));
        if (!results.length) return res.status(404).json({ error: 'No hay ninguna cuenta registrada con ese correo.' });
        const user = results[0];

        await db.query('UPDATE password_resets SET usado = TRUE WHERE id_cliente = ? AND usado = FALSE', [user.id_cliente]);
        const resetToken = crypto.randomInt(100000, 1000000).toString();
        await db.query(
            'INSERT INTO password_resets (id_cliente, token_recuperacion, metodo, fecha_expiracion, usado) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE), FALSE)',
            [user.id_cliente, resetToken, 'email']
        );

        try {
            await transporter.sendMail({
                from: `"Seguridad Onach" <${process.env.EMAIL_USER}>`,
                to: user.email,
                subject: 'Código para recuperar tu contraseña - Onach Urban Store',
                html: `<div style="font-family:Arial;text-align:center;padding:20px"><h2>Recuperación de contraseña</h2><p>Hola ${String(user.nombre).replace(/[<>]/g, '')}, tu código es:</p><h1 style="letter-spacing:8px">${resetToken}</h1><p>El código expira en 15 minutos.</p></div>`
            });
        } catch (mailErr) {
            await db.query('UPDATE password_resets SET usado = TRUE WHERE id_cliente = ? AND token_recuperacion = ?', [user.id_cliente, resetToken]);
            console.error('❌ No fue posible enviar el correo de recuperación:', mailErr.message);
            return res.status(503).json({ error: 'No fue posible enviar el correo de recuperación.' });
        }

        return res.json({ message: 'Código de recuperación enviado. Revisa tu correo.' });
    } catch (err) {
        console.error('Error recuperación:', err);
        res.status(500).json({ error: 'Error al procesar la solicitud.' });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { email, token, newPassword } = req.body;
        const normalizedEmail = String(email || '').trim().toLowerCase();
        const userResults = unwrap(await db.query('SELECT id_cliente FROM clientes WHERE LOWER(email) = ?', [normalizedEmail]));
        if (!userResults.length) return res.status(404).json({ error: 'Usuario no encontrado.' });

        const userId = userResults[0].id_cliente;
        const resetResults = unwrap(await db.query(
            'SELECT id_reset FROM password_resets WHERE id_cliente = ? AND token_recuperacion = ? AND usado = FALSE AND fecha_expiracion > NOW() ORDER BY id_reset DESC LIMIT 1',
            [userId, token]
        ));
        if (!resetResults.length) return res.status(400).json({ error: 'Código inválido o expirado.' });

        const passwordCheck = validatePassword(newPassword);
        if (!passwordCheck.valid) return res.status(400).json({ error: 'La contraseña no cumple con los requisitos de seguridad.', details: passwordCheck.errors });

        const hashedPassword = await bcrypt.hash(newPassword, 12);
        await db.query('UPDATE clientes SET password_hash = ? WHERE id_cliente = ?', [hashedPassword, userId]);
        await db.query('UPDATE password_resets SET usado = TRUE WHERE id_reset = ?', [resetResults[0].id_reset]);
        await db.query('UPDATE refresh_tokens SET revocado = TRUE WHERE id_cliente = ?', [userId]);
        await db.query('UPDATE sessions SET activa = FALSE WHERE id_cliente = ?', [userId]);

        return res.json({ message: 'Contraseña actualizada exitosamente. Inicia sesión nuevamente.' });
    } catch (err) {
        console.error('Error al cambiar la contraseña:', err);
        res.status(500).json({ error: 'Error al cambiar la contraseña.' });
    }
};

module.exports = { register, login, verifyMFA, activarCuenta, refresh, logout, getActiveSessions, forgotPassword, resetPassword };
