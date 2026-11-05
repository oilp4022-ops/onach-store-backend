#!/usr/bin/env bash
# scripts/ci-local.sh - Ejecuta en local las mismas etapas del pipeline de GitHub Actions
# para verificar un cambio antes de subirlo (paso 4 del flujo de trabajo, sección 12.5).
set -e
etapa() { echo; echo "════ $1 ════"; }
inicio=$(date +%s)
etapa "1/3 Validaciones y análisis estático";  npm run --silent validar
etapa "2/3 Pruebas unitarias e integración (cobertura)"; mkdir -p coverage; npm run --silent test:coverage | grep -E "^ℹ (tests|pass|fail)|all files|✖"
etapa "3/3 Pruebas E2E del frontend";          npm run --silent test:e2e | grep -E "✔|✖|^ℹ (tests|pass|fail)"
echo; echo "Pipeline local terminado correctamente en $(( $(date +%s) - inicio )) s."
