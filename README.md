# Onach Urban Store

![CI](https://github.com/oilp4022-ops/onach-store-backend/actions/workflows/ci.yml/badge.svg?branch=develop)

Plataforma de comercio electrónico de ropa urbana: frontend estático (HTML, CSS, JavaScript) y API REST (Node.js + Express + MySQL), gestionada con un enfoque DevOps.

Proyecto integrador de la asignatura **Gestión del Proceso de Desarrollo de Software** — UTA, IDGS 10-B, Equipo 4.

## Requisitos
- Node.js 22 (CI) / 20 o superior
- MySQL 8 con la base de datos `onachus`
- (Opcional) Docker y Docker Compose

## Puesta en marcha
```bash
cp .env.example .env        # completar credenciales
npm ci
mysql -u root onachus < database/roles_migration.sql
mysql -u root onachus < database/security_v1_migration.sql
npm start                   # API en http://localhost:3006
```
El frontend se abre con Live Server en `http://localhost:8080`.

Con Docker: `docker compose up --build`.

## Scripts
| Comando | Qué hace |
|---|---|
| `npm start` | Levanta la API |
| `npm run validar` | Sintaxis, secretos, `.env`, referencias HTML y node_modules |
| `npm test` | Pruebas unitarias e integración |
| `npm run test:coverage` | Igual que `npm test` con cobertura (mínimo 60 % de líneas) |
| `npm run test:e2e` | Pruebas E2E del frontend con Playwright |
| `npm run ci:local` | Ejecuta en local las etapas del pipeline |

## Flujo de trabajo
Git Flow simplificado (`main`, `develop`, `feature/*`, `fix/*`, `test/*`, `ci/*`, `release/*`, `hotfix/*`), Conventional Commits y Pull Request con al menos una aprobación y CI en verde. Ver `CHANGELOG.md`.

## Equipo
Alejandro Castañeda Barba · Emiliano Gómez Vázquez · Hugo Rodríguez Ascencio · Jesús Torres Castañeda · Oscar Iván López Peña
