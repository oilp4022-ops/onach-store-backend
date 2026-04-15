// middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');
const secretKey = process.env.JWT_SECRET;

// 1. Verificar si el usuario tiene sesión activa (Autenticación)
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });

    jwt.verify(token, secretKey, (err, user) => {
        if (err) return res.status(403).json({ error: 'Token inválido o expirado.' });
        req.user = user;
        next();
    });
}

// 2. Verificar si el usuario tiene el rol correcto (RBAC - Autorización)
function authorizeRoles(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ 
                error: `Acceso denegado. Requiere privilegios de: ${allowedRoles.join(' o ')}` 
            });
        }
        next();
    };
}

module.exports = { authenticateToken, authorizeRoles };