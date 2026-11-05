// Pruebas unitarias - middlewares/authMiddleware.js (RNF-02, RF-14)
process.env.JWT_SECRET = 'secreto-solo-para-pruebas';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { authenticateToken, authorizeRoles } = require('../../middlewares/authMiddleware');

const resFalso = () => {
    const res = { statusCode: 200, body: null };
    res.status = (c) => { res.statusCode = c; return res; };
    res.json = (b) => { res.body = b; return res; };
    return res;
};

describe('UT-02 Middleware de autenticación JWT', () => {
    test('sin encabezado Authorization responde 401', () => {
        const res = resFalso(); let siguio = false;
        authenticateToken({ headers: {} }, res, () => { siguio = true; });
        assert.equal(res.statusCode, 401); assert.equal(siguio, false);
    });
    test('token alterado o firmado con otra clave responde 403', () => {
        const malo = jwt.sign({ id: 1, role: 'admin' }, 'otra-clave');
        const res = resFalso(); let siguio = false;
        authenticateToken({ headers: { authorization: `Bearer ${malo}` } }, res, () => { siguio = true; });
        assert.equal(res.statusCode, 403); assert.equal(siguio, false);
    });
    test('token expirado responde 403', () => {
        const vencido = jwt.sign({ id: 1, role: 'cliente', exp: Math.floor(Date.now() / 1000) - 60 }, process.env.JWT_SECRET);
        const res = resFalso();
        authenticateToken({ headers: { authorization: `Bearer ${vencido}` } }, res, () => {});
        assert.equal(res.statusCode, 403);
    });
    test('token válido continúa y expone req.user', () => {
        const ok = jwt.sign({ id: 7, role: 'cliente' }, process.env.JWT_SECRET, { expiresIn: '15m' });
        const req = { headers: { authorization: `Bearer ${ok}` } }; let siguio = false;
        authenticateToken(req, resFalso(), () => { siguio = true; });
        assert.equal(siguio, true); assert.equal(req.user.id, 7);
    });
});

describe('UT-03 Autorización por rol (RBAC)', () => {
    test('rol permitido continúa', () => {
        let siguio = false;
        authorizeRoles('admin', 'superadmin')({ user: { role: 'admin' } }, resFalso(), () => { siguio = true; });
        assert.equal(siguio, true);
    });
    test('rol cliente en ruta de administración responde 403', () => {
        const res = resFalso();
        authorizeRoles('admin')({ user: { role: 'cliente' } }, res, () => {});
        assert.equal(res.statusCode, 403);
        assert.match(res.body.error, /Acceso denegado/);
    });
});
