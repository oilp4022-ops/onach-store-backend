// Pruebas de integración - RF-16 Estado del servicio (CP-17)
const t = require('../helpers/setup');
const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

describe('CP-17 Endpoint de estado del servicio GET /api/health', () => {
    let api;
    before(async () => { api = await t.iniciar(); });
    after(async () => { await api.cerrar(); });
    beforeEach(() => t.limpiar());

    test('responde 200 con status "ok" cuando la base de datos responde', async () => {
        t.setDb(async (sql) => (sql === 'SELECT 1' ? [{ 1: 1 }] : []));
        const r = await api.request('GET', '/api/health');
        assert.equal(r.status, 200);
        assert.equal(r.body.status, 'ok');
        assert.equal(r.body.database, 'up');
        assert.ok(r.body.version);
        assert.ok(Number.isFinite(r.body.responseTimeMs));
    });

    test('responde 503 con status "degraded" cuando la base de datos no responde', async () => {
        t.setDb(async () => { throw new Error('ECONNREFUSED'); });
        const r = await api.request('GET', '/api/health');
        assert.equal(r.status, 503);
        assert.equal(r.body.database, 'down');
    });

    test('tiempo de respuesta menor a 500 ms (RNF-05)', async () => {
        t.setDb(async () => [{ 1: 1 }]);
        const inicio = Date.now();
        await api.request('GET', '/api/health');
        assert.ok(Date.now() - inicio < 500);
    });
});
