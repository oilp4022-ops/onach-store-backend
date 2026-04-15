// middlewares/auditMiddleware.js
const Database = require('../database');
const db = Database.getInstance();

async function auditLogger(req, res, next) {
    // Interceptamos la respuesta original para saber el "Resultado" cuando termine
    const originalSend = res.send;
    
    res.send = async function (data) {
        res.send = originalSend; // Restaurar la función
        
        const ip = req.ip || req.connection.remoteAddress;
        const usuario = req.user ? req.user.id : 'Anónimo'; // Si no está logueado, es anónimo
        const ruta = req.originalUrl;
        const resultado = res.statusCode >= 400 ? 'Fallido' : 'Exitoso';
        
        
        try {
            // Guardamos el log en la BD (Asegúrate de crear la tabla audit_logs después)
            await db.query(
                'INSERT INTO audit_logs (usuario, ip, ruta, resultado) VALUES (?, ?, ?, ?)',
                [usuario.toString(), ip, ruta, resultado]
            );
        } catch (error) {
            console.error("Error guardando el log de auditoría:", error);
        }

        return res.send(data);
    };
    
    next();
}

module.exports = auditLogger;