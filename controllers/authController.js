const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer'); 
const Database = require('../database');
const db = Database.getInstance();
const secretKey = process.env.JWT_SECRET;

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'oilp.4022@gmail.com', 
        pass: 'pslwydmrfdtgtrbc' 
    }
});

// Función de apoyo para validar letras/números consecutivos
const tieneConsecutivos = (str) => {
    for (let i = 0; i < str.length - 2; i++) {
        let c1 = str.charCodeAt(i), c2 = str.charCodeAt(i+1), c3 = str.charCodeAt(i+2);
        // Verifica secuencias ascendentes (abc, 123) o descendentes (cba, 321)
        if ((c2 === c1 + 1 && c3 === c1 + 2) || (c2 === c1 - 1 && c3 === c1 - 2)) return true;
    }
    return false;
};

const register = async (req, res) => {
    try {
        const { nombre, apellido, email, password } = req.body;
        if (!nombre || !apellido || !email || !password) return res.status(400).json({ error: 'Faltan campos.' });

        // Validaciones estrictas de contraseña
        if (password.length < 8) return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
        if (!/[A-Z]/.test(password)) return res.status(400).json({ error: 'Debe incluir al menos una mayúscula.' });
        if (!/[a-z]/.test(password)) return res.status(400).json({ error: 'Debe incluir al menos una minúscula.' });
        if (!/[^A-Za-z0-9]/.test(password)) return res.status(400).json({ error: 'Debe incluir al menos un carácter especial.' });
        if (tieneConsecutivos(password)) return res.status(400).json({ error: 'No se permiten letras o números consecutivos (ej. 123, abc).' });

        const existingUser = await db.query('SELECT id_cliente FROM clientes WHERE email = ?', [email]);
        if (existingUser.length > 0) return res.status(409).json({ error: 'Correo ya registrado.' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const sql = 'INSERT INTO clientes (nombre, apellido, email, password_hash, rol) VALUES (?, ?, ?, ?, ?)';
        await db.query(sql, [nombre, apellido, email, hashedPassword, 'cliente']);

        res.status(201).json({ message: 'Registrado exitosamente' });
    } catch (err) { res.status(500).json({ error: 'Error al registrar.' }); }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const results = await db.query('SELECT * FROM clientes WHERE email = ?', [email]);

        if (results.length === 0) return res.status(401).json({ error: 'Usuario no encontrado' });
        const user = results[0];

        // Verificar si la cuenta está bloqueada temporalmente
        if (user.bloqueo_hasta && new Date(user.bloqueo_hasta) > new Date()) {
            return res.status(403).json({ error: 'Cuenta bloqueada por múltiples intentos. Intenta más tarde.' });
        }

        let isMatch = false;
        if (user.password_hash.startsWith('$2b$')) {
            isMatch = await bcrypt.compare(password, user.password_hash);
        } else {
            isMatch = (password === user.password_hash);
        }

        // Lógica de 3 intentos fallidos
        if (!isMatch) {
            let intentos = (user.intentos_fallidos || 0) + 1;
            if (intentos >= 3) {
                let bloqueo = new Date();
                bloqueo.setMinutes(bloqueo.getMinutes() + 15); // Bloqueo por 15 minutos
                await db.query('UPDATE clientes SET intentos_fallidos = ?, bloqueo_hasta = ? WHERE id_cliente = ?', [intentos, bloqueo, user.id_cliente]);
                return res.status(403).json({ error: 'Cuenta bloqueada temporalmente por 15 minutos por seguridad.' });
            } else {
                await db.query('UPDATE clientes SET intentos_fallidos = ? WHERE id_cliente = ?', [intentos, user.id_cliente]);
                return res.status(401).json({ error: `Contraseña incorrecta. Intento ${intentos} de 3.` });
            }
        }

        // Si el login es exitoso, reiniciar contadores
        await db.query('UPDATE clientes SET intentos_fallidos = 0, bloqueo_hasta = NULL WHERE id_cliente = ?', [user.id_cliente]);

        // Generar código de 6 dígitos
        const mfaCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expireDate = new Date();
        expireDate.setMinutes(expireDate.getMinutes() + 10); 

        await db.query('INSERT INTO mfa_codes (id_cliente, codigo_secreto, metodo_envio, fecha_expiracion) VALUES (?, ?, ?, ?)',
            [user.id_cliente, mfaCode, 'email', expireDate]);

        const mailOptions = {
            from: 'oilp.4022@gmail.com', 
            to: user.email, 
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

        res.json({ requireMFA: true, userId: user.id_cliente, message: 'Código MFA enviado a tu correo' });

    } catch (err) { 
        console.error("Error en login o enviando correo:", err);
        res.status(500).json({ error: 'Error en el servidor al enviar el correo.' }); 
    }
};

// ... (Las demás funciones verifyMFA, refresh, getActiveSessions, forgotPassword y resetPassword se mantienen exactamente igual)