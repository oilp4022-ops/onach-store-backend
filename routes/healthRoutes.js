// routes/healthRoutes.js - RF-16 Estado del servicio
// GET /api/health -> 200 si la API y la base de datos responden, 503 si la BD no responde.
const express = require('express');
const Database = require('../database');
const pkg = require('../package.json');

const router = express.Router();

router.get('/health', async (req, res) => {
    const inicio = Date.now();
    let database = 'up';
    try {
        await Database.getInstance().query('SELECT 1');
    } catch (err) {
        database = 'down';
    }
    const ok = database === 'up';
    res.status(ok ? 200 : 503).json({
        status: ok ? 'ok' : 'degraded',
        version: pkg.version,
        uptime: Math.round(process.uptime()),
        database,
        responseTimeMs: Date.now() - inicio,
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
