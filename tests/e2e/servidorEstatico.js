// Servidor estático mínimo para las pruebas E2E. Sirve el frontend desde la raíz del repositorio
// distinguiendo mayúsculas/minúsculas, igual que Netlify (Linux).
const http = require('http');
const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..', '..');
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json' };

function iniciarServidor(puerto = 8080) {
    const server = http.createServer((req, res) => {
        const ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname);
        const archivo = path.join(RAIZ, ruta === '/' ? 'index.html' : ruta);
        if (!archivo.startsWith(RAIZ) || !fs.existsSync(archivo) || fs.statSync(archivo).isDirectory()) {
            res.writeHead(404); return res.end('404');
        }
        res.writeHead(200, { 'Content-Type': TIPOS[path.extname(archivo)] || 'application/octet-stream' });
        fs.createReadStream(archivo).pipe(res);
    });
    return new Promise((resolve) => server.listen(puerto, '127.0.0.1', () => resolve(server)));
}

module.exports = { iniciarServidor };
