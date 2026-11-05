// Pruebas de integración - Catálogo y productos (RF-05, RF-06, RF-07, RF-11) - CP-06, CP-07, CP-12
const t = require('../helpers/setup');
const { token } = require('../helpers/tokens');
const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const PRODUCTOS = [
    { id_producto: 2, nombre: 'Sudadera BoneFish Black', precio: 899, categoria: 'sudaderas' },
    { id_producto: 1, nombre: 'Playera Sullen Skull', precio: 449, categoria: 'playeras' }
];

describe('Catálogo y administración de productos', () => {
    let api;
    before(async () => { api = await t.iniciar(); });
    after(async () => { await api.cerrar(); });
    beforeEach(() => t.limpiar());

    test('CP-06 catálogo sin filtros: 200 con la lista de productos', async () => {
        t.setDb(async () => PRODUCTOS);
        const r = await api.request('GET', '/api/productos');
        assert.equal(r.status, 200);
        assert.equal(r.body.length, 2);
    });

    test('CP-06 filtros por categoría, talla y rango de precio generan una consulta parametrizada', async () => {
        t.setDb(async () => [PRODUCTOS[0]]);
        const r = await api.request('GET', '/api/productos?category=sudaderas&talla=M&minPrice=500&maxPrice=1000');
        assert.equal(r.status, 200);
        const q = t.consultas[0];
        assert.match(q.sql, /JOIN variantes_producto/);
        assert.match(q.sql, /v\.stock > 0/);
        assert.deepEqual(q.params, ['M', 'sudaderas', '500', '1000']);
    });

    test('búsqueda con intento de inyección SQL se envía como parámetro, no se concatena', async () => {
        t.setDb(async () => []);
        await api.request('GET', `/api/productos?search=${encodeURIComponent("' OR 1=1 --")}`);
        const q = t.consultas[0];
        assert.ok(!q.sql.includes('OR 1=1'));
        assert.ok(q.params.includes("%' OR 1=1 --%"));
    });

    test('CP-07 detalle de producto existente: 200 con producto y variantes (maestro/detalle)', async () => {
        t.setDb(async (sql) => (sql.includes('FROM productos') ? [PRODUCTOS[0]] : [{ id_variante: 1, talla: 'M', stock: 4 }]));
        const r = await api.request('GET', '/api/productos/2');
        assert.equal(r.status, 200);
        assert.equal(r.body.producto.nombre, 'Sudadera BoneFish Black');
        assert.equal(r.body.variantes[0].talla, 'M');
    });

    test('CP-07 detalle de producto inexistente: 404', async () => {
        t.setDb(async () => []);
        const r = await api.request('GET', '/api/productos/999');
        assert.equal(r.status, 404);
    });

    test('CP-12 alta de producto por administrador: 201 y crea variantes CH, M, G, XG', async () => {
        t.setDb(async (sql) => (sql.startsWith('INSERT INTO productos') ? { insertId: 30 } : { affectedRows: 1 }));
        const r = await api.request('POST', '/api/products', {
            token: token('admin'),
            body: { nombre: 'Gorra Sullen Yellow', precio: 399, categoria: 'gorras' }
        });
        assert.equal(r.status, 201, r.text);
        const tallas = t.consultas.filter((q) => q.sql.startsWith('INSERT INTO variantes_producto')).map((q) => q.params[1]);
        assert.deepEqual(tallas, ['CH', 'M', 'G', 'XG']);
    });

    test('CP-12 alta de producto con datos incompletos: 400', async () => {
        const r = await api.request('POST', '/api/products', { token: token('admin'), body: { nombre: 'Sin precio' } });
        assert.equal(r.status, 400);
    });

    test('CP-12 un cliente no puede dar de alta productos: 403', async () => {
        const r = await api.request('POST', '/api/products', { token: token('cliente'), body: { nombre: 'X', precio: 1, categoria: 'y' } });
        assert.equal(r.status, 403);
        assert.equal(t.consultas.length, 0);
    });

    test('alta de producto sin token: 401', async () => {
        const r = await api.request('POST', '/api/products', { body: { nombre: 'X', precio: 1, categoria: 'y' } });
        assert.equal(r.status, 401);
    });
});
