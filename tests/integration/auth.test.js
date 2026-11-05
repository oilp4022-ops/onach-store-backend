// Pruebas de integración - Autenticación (RF-01, RF-02, RF-15) - CP-01, CP-02, CP-03, CP-04, CP-16
const t = require('../helpers/setup');
const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const PASSWORD_VALIDA = 'Tienda#Ur8x';
const registro = (extra = {}) => ({
    nombre: 'Ana', apellido: 'Prueba', email: 'ana.prueba@test.com', password: PASSWORD_VALIDA,
    captchaResponse: 'token-captcha', privacyAccepted: true, ...extra
});

describe('Autenticación y cuentas', () => {
    let api;
    let hash;
    before(async () => { api = await t.iniciar(); hash = await bcrypt.hash(PASSWORD_VALIDA, 4); });
    after(async () => { await api.cerrar(); });
    beforeEach(() => t.limpiar());

    test('CP-01 registro exitoso: 201, rol cliente, contraseña cifrada con bcrypt y consentimiento guardado', async () => {
        t.setDb(async (sql) => {
            if (sql.startsWith('SELECT id_cliente FROM clientes')) return [];
            if (sql.startsWith('INSERT INTO clientes')) return { insertId: 10 };
            return { affectedRows: 1 };
        });
        const r = await api.request('POST', '/api/register', { body: registro() });
        assert.equal(r.status, 201, r.text);
        const insert = t.consultas.find((q) => q.sql.startsWith('INSERT INTO clientes'));
        assert.equal(insert.params[4], 'cliente');
        assert.equal(insert.params[5], 'inactivo');
        assert.ok(insert.params[3].startsWith('$2'), 'la contraseña debe guardarse como hash bcrypt');
        assert.notEqual(insert.params[3], PASSWORD_VALIDA);
        assert.ok(t.consultas.some((q) => q.sql.startsWith('INSERT INTO consentimientos')));
        assert.equal(t.correosEnviados.length, 1, 'se envía el correo de activación');
    });

    test('CP-02 registro con correo duplicado: 409 y no se inserta usuario', async () => {
        t.setDb(async (sql) => (sql.startsWith('SELECT id_cliente FROM clientes') ? [{ id_cliente: 10 }] : []));
        const r = await api.request('POST', '/api/register', { body: registro() });
        assert.equal(r.status, 409);
        assert.ok(!t.consultas.some((q) => q.sql.startsWith('INSERT INTO clientes')));
    });

    test('CP-16 registro sin aceptar el aviso de privacidad: 400', async () => {
        const r = await api.request('POST', '/api/register', { body: registro({ privacyAccepted: false }) });
        assert.equal(r.status, 400);
        assert.match(r.body.error, /Aviso de Privacidad/);
        assert.equal(t.consultas.length, 0, 'no debe tocar la base de datos');
    });

    test('registro con contraseña débil: 400 con el detalle de reglas incumplidas', async () => {
        const r = await api.request('POST', '/api/register', { body: registro({ password: 'abc' }) });
        assert.equal(r.status, 400);
        assert.ok(Array.isArray(r.body.details) && r.body.details.length > 0);
    });

    test('registro con CAPTCHA inválido: 400', async () => {
        t.setCaptcha(false);
        const r = await api.request('POST', '/api/register', { body: registro() });
        assert.equal(r.status, 400);
    });

    test('CP-03 inicio de sesión exitoso: MFA y emisión de JWT con expiración ≤ 2 h', async () => {
        const usuario = { id_cliente: 5, email: 'ana.prueba@test.com', password_hash: hash, estado: 'activo', intentos_fallidos: 0, nombre: 'Ana', rol: 'cliente' };
        t.setDb(async (sql) => {
            if (sql.startsWith('SELECT * FROM clientes')) return [usuario];
            if (sql.startsWith('SELECT id_mfa')) return [{ id_mfa: 1 }];
            if (sql.startsWith('SELECT nombre, rol')) return [{ nombre: 'Ana', rol: 'cliente' }];
            if (sql.startsWith('INSERT INTO sessions')) return { insertId: 77 };
            return { affectedRows: 1 };
        });
        const login = await api.request('POST', '/api/login', { body: { email: 'ana.prueba@test.com', password: PASSWORD_VALIDA } });
        assert.equal(login.status, 200, login.text);
        assert.equal(login.body.requireMFA, true);
        const codigo = t.consultas.find((q) => q.sql.startsWith('INSERT INTO mfa_codes')).params[1];
        assert.match(codigo, /^\d{6}$/);

        const mfa = await api.request('POST', '/api/verify-mfa', { body: { userId: 5, mfaCode: codigo } });
        assert.equal(mfa.status, 200, mfa.text);
        const datos = jwt.verify(mfa.body.token, process.env.JWT_SECRET);
        assert.equal(datos.role, 'cliente');
        assert.ok(datos.exp - datos.iat <= 2 * 60 * 60, 'el JWT debe expirar en 2 h o menos');
        assert.ok(mfa.body.refreshToken.length >= 64);
    });

    test('CP-04 contraseña incorrecta: 401, sin token y con mensaje genérico', async () => {
        const usuario = { id_cliente: 5, email: 'ana.prueba@test.com', password_hash: hash, estado: 'activo', intentos_fallidos: 0 };
        t.setDb(async (sql) => (sql.startsWith('SELECT * FROM clientes') ? [usuario] : { affectedRows: 1 }));
        const r = await api.request('POST', '/api/login', { body: { email: 'ana.prueba@test.com', password: 'Incorrecta1' } });
        assert.equal(r.status, 401);
        assert.equal(r.body.token, undefined);
        assert.equal(r.body.error, 'Correo o contraseña incorrectos.');
    });

    test('CP-04b correo inexistente: mismo mensaje genérico (no revela qué dato falló)', async () => {
        t.setDb(async () => []);
        const r = await api.request('POST', '/api/login', { body: { email: 'nadie@test.com', password: 'Incorrecta1' } });
        assert.equal(r.status, 401);
        assert.equal(r.body.error, 'Correo o contraseña incorrectos.');
    });

    test('bloqueo temporal al quinto intento fallido', async () => {
        const usuario = { id_cliente: 5, email: 'ana.prueba@test.com', password_hash: hash, estado: 'activo', intentos_fallidos: 4 };
        t.setDb(async (sql) => (sql.startsWith('SELECT * FROM clientes') ? [usuario] : { affectedRows: 1 }));
        await api.request('POST', '/api/login', { body: { email: 'ana.prueba@test.com', password: 'Incorrecta1' } });
        assert.ok(t.consultas.some((q) => q.sql.includes('bloqueo_hasta = DATE_ADD')));
    });

    test('cuenta inactiva no puede iniciar sesión: 403', async () => {
        t.setDb(async () => [{ id_cliente: 5, estado: 'inactivo', password_hash: hash }]);
        const r = await api.request('POST', '/api/login', { body: { email: 'ana.prueba@test.com', password: PASSWORD_VALIDA } });
        assert.equal(r.status, 403);
    });

    test('rate limiting: el sexto intento de login desde la misma IP en 15 min responde 429', async () => {
        t.setDb(async () => []);
        const ipFija = { 'X-Forwarded-For': '203.0.113.7' };
        const estados = [];
        for (let i = 0; i < 6; i++) {
            const r = await api.request('POST', '/api/login', { body: { email: 'x@test.com', password: 'Mala#1x' }, headers: ipFija });
            estados.push(r.status);
        }
        assert.deepEqual(estados.slice(0, 5), [401, 401, 401, 401, 401]);
        assert.equal(estados[5], 429);
    });

    test('código MFA inválido o expirado: 401', async () => {
        t.setDb(async () => []);
        const r = await api.request('POST', '/api/verify-mfa', { body: { userId: 5, mfaCode: '000000' } });
        assert.equal(r.status, 401);
    });
});
