#!/usr/bin/env node
// scripts/validar.js - Análisis estático y validaciones automáticas del repositorio.
// Se ejecuta en local (npm run validar) y en el pipeline de CI antes de las pruebas.
// Termina con código 1 si alguna validación falla, lo que detiene el pipeline.
const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const RAIZ = path.resolve(__dirname, '..');
const resultados = [];
const registrar = (nombre, errores, detalle = '') => resultados.push({ nombre, errores, detalle });

const archivosGit = execSync('git ls-files', { cwd: RAIZ, encoding: 'utf8' }).split('\n').filter(Boolean);
const js = archivosGit.filter((f) => f.endsWith('.js') && !f.startsWith('js/'));
const html = archivosGit.filter((f) => f.endsWith('.html'));

// V-01 Sintaxis de todos los archivos JavaScript del backend y pruebas (node --check)
const errSintaxis = [];
for (const f of js) {
    const r = spawnSync(process.execPath, ['--check', path.join(RAIZ, f)], { encoding: 'utf8' });
    if (r.status !== 0) errSintaxis.push(`${f}: ${r.stderr.split('\n').find((l) => l.includes('Error')) || 'error de sintaxis'}`);
}
registrar('V-01 Sintaxis JavaScript (node --check)', errSintaxis, `${js.length} archivos`);

// V-02 Secretos escritos en el código (contraseñas, claves) en lugar de variables de entorno
const patrones = [/pass\s*:\s*['"][^'"]{6,}['"]/i, /secret\s*[:=]\s*['"][^'"]{6,}['"]/i, /-----BEGIN [A-Z ]*PRIVATE KEY-----/, /AKIA[0-9A-Z]{16}/];
const errSecretos = [];
for (const f of archivosGit.filter((x) => /\.(js|json|html|yml|yaml)$/.test(x) && !x.startsWith('tests/') && x !== 'package-lock.json')) {
    const lineas = fs.readFileSync(path.join(RAIZ, f), 'utf8').split('\n');
    lineas.forEach((l, i) => { if (patrones.some((p) => p.test(l))) errSecretos.push(`${f}:${i + 1}`); });
}
registrar('V-02 Sin secretos en el código fuente', errSecretos);

// V-03 El archivo .env nunca debe estar versionado
registrar('V-03 .env fuera del repositorio', archivosGit.filter((f) => path.basename(f) === '.env'));

// V-04 .env.example documenta todas las variables de entorno usadas por el código
const ejemplo = fs.existsSync(path.join(RAIZ, '.env.example')) ? fs.readFileSync(path.join(RAIZ, '.env.example'), 'utf8') : '';
const usadas = new Set();
for (const f of js.filter((x) => !x.startsWith('tests/') && !x.startsWith('scripts/'))) {
    for (const m of fs.readFileSync(path.join(RAIZ, f), 'utf8').matchAll(/process\.env\.([A-Z_]+)/g)) usadas.add(m[1]);
}
const ignorar = new Set(['NODE_ENV', 'DB_PASS']);
registrar('V-04 .env.example completo', [...usadas].filter((v) => !ignorar.has(v) && !new RegExp(`^${v}=`, 'm').test(ejemplo)).map((v) => `falta ${v}`), `${usadas.size} variables`);

// V-05 Referencias locales en HTML (src/href) existen respetando mayúsculas y minúsculas
const existentes = new Set(archivosGit);
const errRefs = [];
for (const f of html) {
    const contenido = fs.readFileSync(path.join(RAIZ, f), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
    for (const m of contenido.matchAll(/(?:src|href)="([^"#?]+)/g)) {
        const ref = decodeURI(m[1]);
        if (/^(https?:|mailto:|tel:|\$\{|javascript:|data:)/.test(ref) || ref === '') continue;
        if (!existentes.has(path.posix.normalize(ref.replace(/^\.\//, '')))) errRefs.push(`${f} -> ${ref}`);
    }
}
registrar('V-05 Referencias HTML existentes (sensible a mayúsculas)', errRefs, `${html.length} páginas`);

// V-06 Dependencias no versionadas (node_modules fuera del repositorio)
registrar('V-06 node_modules fuera del repositorio', archivosGit.filter((f) => f.includes('node_modules/')).slice(0, 5));

let fallos = 0;
console.log('\nValidaciones automáticas - Onach Urban Store\n');
for (const r of resultados) {
    const ok = r.errores.length === 0;
    if (!ok) fallos++;
    console.log(`${ok ? '\x1b[32m✔' : '\x1b[31m✖'} ${r.nombre}\x1b[0m${r.detalle ? ` \x1b[2m(${r.detalle})\x1b[0m` : ''}`);
    r.errores.slice(0, 10).forEach((e) => console.log(`    \x1b[31m- ${e}\x1b[0m`));
}
console.log(`\n${resultados.length - fallos} de ${resultados.length} validaciones aprobadas.`);
process.exit(fallos ? 1 : 0);
