# Changelog — Onach Urban Store

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y [SemVer](https://semver.org/lang/es/).

## [0.2.0] — 2026-11-04 · Unidad II (Sprint 2)

### Agregado
- Endpoint `GET /api/health` con estado de la API y de la base de datos (RF-16).
- CRUD de usuarios y roles con RBAC; maestro/detalle de variantes de producto.
- Registro con aviso de privacidad, reCAPTCHA, activación por correo, MFA, refresh tokens y recuperación de contraseña.
- Pruebas unitarias e integración (`node:test`, 46 pruebas) con cobertura mínima de 60 % de líneas.
- Pruebas E2E del frontend con Playwright (5 escenarios).
- Validaciones automáticas (`npm run validar`) y pipeline local (`npm run ci:local`).
- Pipeline de GitHub Actions: validaciones → pruebas API y E2E → build Docker y prueba de humo → notificación.
- `.env.example`, `Dockerfile`, `docker-compose.yml`, plantilla de Pull Request.

### Corregido
- Credenciales de correo escritas en el código → variables de entorno.
- Login revelaba si el correo existía (CP-04) → mensaje genérico.
- 14 recursos con 404 en servidores Linux (`Js/` → `js/`, `script.js` inexistente, ruta del logo).
- Desplazamiento horizontal en móviles de 375 px (index, login, catálogo).

### Eliminado
- `node_modules/` y `server/node_modules/` del control de versiones (1,919 archivos).
