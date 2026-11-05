// Pruebas de integración - Seguridad de rutas, carrito y pedidos (RF-08, RF-09, RF-14) - CP-08, CP-09, CP-15
const t = require('../helpers/setup');
const { token } = require('../helpers/tokens');
const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

describe('Seguridad, carrito y pedidos', () => {
    let api;
    before(async () => { api = await t.iniciar(); });
    after(async () => { await api.cerrar(); });
    beforeEach(() => t.limpiar());

    test('CP-15 ruta de administración de usuarios sin token: 401', async () => {
        const r = await api.request('GET', '/api/usuarios');
        assert.equal(r.status, 401);
    });

    test('CP-15 ruta de administración con rol cliente: 403 y no consulta datos', async () => {
        const r = await api.request('GET', '/api/usuarios', { token: token('cliente') });
        assert.equal(r.status, 403);
        assert.equal(t.consultas.length, 0);
    });

    test('CP-15 ruta de administración con rol admin: 200', async () => {
        t.setDb(async () => [{ id_cliente: 1, nombre: 'Ana', rol: 'cliente' }]);
        const r = await api.request('GET', '/api/usuarios', { token: token('admin') });
        assert.equal(r.status, 200);
        assert.equal(r.body.length, 1);
    });

    test('CRUD de roles: no permite eliminar un rol asignado a usuarios (409)', async () => {
        t.setDb(async (sql) => (sql.startsWith('SELECT nombre FROM roles') ? [{ nombre: 'cliente' }] : [{ total: 3 }]));
        const r = await api.request('DELETE', '/api/roles/2', { token: token('admin') });
        assert.equal(r.status, 409);
    });

    test('CRUD de roles: crear rol duplicado responde 409', async () => {
        t.setDb(async () => [{ id_rol: 1 }]);
        const r = await api.request('POST', '/api/roles', { token: token('superadmin'), body: { nombre: 'Cliente' } });
        assert.equal(r.status, 409);
    });

    test('CP-08 agregar al carrito con sesión: 200 y consulta con id del usuario del token', async () => {
        t.setDb(async () => ({ affectedRows: 1 }));
        const r = await api.request('POST', '/api/cart', { token: token('cliente', 42), body: { variantId: 3, quantity: 2 } });
        assert.equal(r.status, 200);
        assert.deepEqual(t.consultas[0].params, [42, 3, 2, 2]);
    });

    test('CP-08 consultar y eliminar del carrito', async () => {
        t.setDb(async (sql) => (sql.startsWith('SELECT') ? [{ id: 3, nombre: 'Playera', cantidad: 2, talla: 'M' }] : { affectedRows: 1 }));
        const lista = await api.request('GET', '/api/cart', { token: token('cliente', 42) });
        assert.equal(lista.status, 200);
        assert.equal(lista.body[0].cantidad, 2);
        const del = await api.request('DELETE', '/api/cart/3', { token: token('cliente', 42) });
        assert.equal(del.status, 200);
    });

    test('CP-08 carrito sin sesión: 401', async () => {
        const r = await api.request('GET', '/api/cart');
        assert.equal(r.status, 401);
    });

    test('CP-09 checkout: genera el pedido y vacía el carrito del usuario', async () => {
        t.setDb(async () => ({ affectedRows: 2 }));
        const r = await api.request('POST', '/api/orders', { token: token('cliente', 42) });
        assert.equal(r.status, 200);
        assert.ok(t.consultas.some((q) => q.sql.startsWith('DELETE FROM carrito') && q.params[0] === 42));
    });

    test('CORS: el origen de producción (Netlify) está autorizado', async () => {
        const r = await api.request('OPTIONS', '/api/login', {
            headers: { Origin: 'https://onach-urban-store.netlify.app', 'Access-Control-Request-Method': 'POST' }
        });
        assert.equal(r.status, 204);
        assert.equal(r.headers.get('access-control-allow-origin'), 'https://onach-urban-store.netlify.app');
    });
});
