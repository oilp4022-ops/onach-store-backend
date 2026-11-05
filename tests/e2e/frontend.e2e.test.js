// Pruebas E2E del frontend con Playwright (Chromium headless).
// La API se simula con page.route() para validar la interfaz de forma aislada del backend.
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { iniciarServidor } = require('./servidorEstatico');

const BASE = 'http://localhost:8080';
const CAPTURAS = path.resolve(__dirname, '..', '..', 'test-results', 'e2e');
const PRODUCTOS = [
    { id_producto: 2, nombre: 'Sudadera BoneFish Black', precio: 899, imagen_url: 'imagenes/BoneFishBlack.jpg', categoria: 'sudaderas' },
    { id_producto: 1, nombre: 'Playera Sullen Skull', precio: 449, imagen_url: 'imagenes/SullenSkull.jpg', categoria: 'playeras' }
];
const PAGINAS = ['index.html', 'catalogo.html', 'explorar.html', 'productos_nuevos.html', 'product.html?id=2', 'login.html',
    'recuperar.html', 'checkout.html', 'mi-cuenta.html', 'gestion.html', 'aviso-privacidad.html'];

async function simularApi(page) {
    // Recursos externos (CDN, reCAPTCHA) se bloquean para que la prueba no dependa de internet.
    await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
    await page.route('http://localhost:3006/api/**', async (route) => {
        const url = route.request().url();
        if (url.endsWith('/api/productos')) return route.fulfill({ json: PRODUCTOS });
        if (url.includes('/api/productos/2')) return route.fulfill({ json: { producto: { ...PRODUCTOS[0], descripcion: 'Sudadera oversize' }, variantes: [{ id_variante: 5, talla: 'M', stock: 4 }] } });
        if (url.endsWith('/api/login')) return route.fulfill({ json: { requireMFA: true, userId: 5 } });
        if (url.endsWith('/api/cart')) return route.fulfill({ status: 401, json: { error: 'Acceso denegado.' } });
        return route.fulfill({ json: [] });
    });
}

describe('Frontend Onach Urban Store (E2E)', () => {
    let server, browser;
    before(async () => {
        fs.mkdirSync(CAPTURAS, { recursive: true });
        server = await iniciarServidor(8080);
        browser = await chromium.launch();
    });
    after(async () => { await browser.close(); server.close(); });

    test('E2E-01 todas las páginas cargan sus recursos locales sin errores 404', async () => {
        const rotos = [];
        for (const pagina of PAGINAS) {
            const page = await browser.newPage();
            await simularApi(page);
            page.on('response', (r) => { if (r.url().startsWith(BASE) && r.status() >= 400) rotos.push(`${pagina} -> ${r.url().replace(BASE, '')} (${r.status()})`); });
            await page.goto(`${BASE}/${pagina}`, { waitUntil: 'load' });
            await page.close();
        }
        assert.deepEqual(rotos, [], 'Recursos no encontrados:\n' + rotos.join('\n'));
    });

    test('E2E-02 (CP-06) la página de inicio muestra los productos que entrega la API', async () => {
        const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
        await simularApi(page);
        await page.goto(`${BASE}/index.html`);
        const grid = page.locator('#main-product-grid');
        await grid.getByText('Sudadera BoneFish Black').waitFor({ timeout: 5000 });
        assert.ok(await grid.getByText('Playera Sullen Skull').isVisible());
        // Contrato API-frontend: las imágenes de las tarjetas deben cargarse a partir de imagen_url
        await page.waitForTimeout(500);
        const rotas = await grid.locator('img').evaluateAll((imgs) => imgs.filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.getAttribute('src')));
        assert.deepEqual(rotas, [], 'Imágenes rotas en las tarjetas: ' + rotas.join(', '));
        await grid.scrollIntoViewIfNeeded();
        await page.screenshot({ path: path.join(CAPTURAS, 'E2E-02-inicio-productos.png') });
        await page.close();
    });

    test('E2E-03 (CP-07) el detalle de producto muestra nombre, precio y tallas', async () => {
        const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
        await simularApi(page);
        await page.goto(`${BASE}/product.html?id=2`);
        const cont = page.locator('.product-detail-container');
        await cont.getByText('Sudadera BoneFish Black').first().waitFor({ timeout: 5000 });
        assert.match(await cont.innerText(), /899/);
        await page.screenshot({ path: path.join(CAPTURAS, 'E2E-03-detalle-producto.png') });
        await page.close();
    });

    test('E2E-04 (CP-03) el inicio de sesión con credenciales válidas solicita el código MFA', async () => {
        const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
        await simularApi(page);
        await page.goto(`${BASE}/login.html`);
        await page.fill('#login-email', 'ana.prueba@test.com');
        await page.fill('#login-password', 'Tienda#Ur8x');
        await page.click('#login-form button[type="submit"]');
        await page.locator('#mfa-wrapper').waitFor({ state: 'visible', timeout: 5000 });
        await page.screenshot({ path: path.join(CAPTURAS, 'E2E-04-login-mfa.png') });
        await page.close();
    });

    test('E2E-05 (RNF-08) diseño adaptable: sin desplazamiento horizontal a 375 px', async () => {
        const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
        await simularApi(page);
        const desbordes = [];
        for (const pagina of ['index.html', 'login.html', 'catalogo.html']) {
            await page.goto(`${BASE}/${pagina}`);
            const ancho = await page.evaluate(() => document.documentElement.scrollWidth);
            if (ancho > 375) desbordes.push(`${pagina}: ${ancho}px`);
        }
        await page.goto(`${BASE}/index.html`);
        await page.screenshot({ path: path.join(CAPTURAS, 'E2E-05-movil-375.png') });
        await page.close();
        assert.deepEqual(desbordes, []);
    });
});
