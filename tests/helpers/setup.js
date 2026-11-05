// tests/helpers/setup.js
// Prepara el entorno de pruebas ANTES de cargar la aplicación:
//  - variables de entorno de prueba (nunca credenciales reales)
//  - doble de la base de datos (Database.prototype.query) controlable por cada prueba
//  - doble de nodemailer para no enviar correos reales
//  - doble de fetch para la verificación de Google reCAPTCHA
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto-solo-para-pruebas';
process.env.RECAPTCHA_SECRET = 'recaptcha-de-prueba';
process.env.EMAIL_USER = 'pruebas@onach.test';
process.env.DOTENV_CONFIG_QUIET = 'true';

const nodemailer = require('nodemailer');
const correosEnviados = [];
nodemailer.createTransport = () => ({
    sendMail: async (mail) => { correosEnviados.push(mail); return { messageId: 'test' }; }
});

const Database = require('../../database');
let manejador = async () => [];
const consultas = [];
Database.prototype.query = async function (sql, params = []) {
    consultas.push({ sql, params });
    return manejador(sql, params);
};

const fetchOriginal = global.fetch;
let captchaValido = true;
global.fetch = async (url, opts) => {
    if (String(url).includes('google.com/recaptcha')) {
        return { json: async () => (captchaValido ? { success: true, hostname: 'localhost' } : { success: false, 'error-codes': ['invalid-input-response'] }) };
    }
    return fetchOriginal(url, opts);
};

const app = require('../../app');

/** Levanta la app en un puerto libre y devuelve un cliente HTTP mínimo (equivalente a Supertest). */
async function iniciar() {
    const server = await new Promise((resolve) => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
    const base = `http://127.0.0.1:${server.address().port}`;
    let ip = 10;
    const request = async (method, ruta, { body, token, headers = {} } = {}) => {
        // Cada petición simula un cliente con IP distinta para no compartir el contador del rate limiter,
        // salvo que la prueba fije X-Forwarded-For explícitamente.
        const h = { 'Content-Type': 'application/json', 'X-Forwarded-For': `10.0.0.${ip++ % 250}`, ...headers };
        if (token) h.Authorization = `Bearer ${token}`;
        const res = await fetchOriginal(base + ruta, { method, headers: h, body: body ? JSON.stringify(body) : undefined, redirect: 'manual' });
        const text = await res.text();
        let json = null; try { json = JSON.parse(text); } catch { /* respuesta no JSON */ }
        return { status: res.status, body: json, text, headers: res.headers };
    };
    return { server, base, request, cerrar: () => new Promise((r) => server.close(r)) };
}

module.exports = {
    iniciar,
    app,
    consultas,
    correosEnviados,
    setDb: (fn) => { manejador = fn; },
    setCaptcha: (v) => { captchaValido = v; },
    limpiar: () => { consultas.length = 0; correosEnviados.length = 0; manejador = async () => []; captchaValido = true; }
};
