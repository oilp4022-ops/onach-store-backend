# Guía rápida de ejecución para la entrega

## 1. Base de datos

Usar MySQL/XAMPP y la base de datos `onachus`.

Ejecutar en este orden:

```sql
SOURCE database/roles_migration.sql;
SOURCE database/security_v1_migration.sql;
```

## 2. Variables de entorno

Copiar:

```text
.env.example -> .env
```

Completar credenciales de MySQL, JWT, reCAPTCHA y Gmail.

**Nunca subir `.env` al repositorio.**

## 3. Backend

```bash
npm install
node server.js
```

Backend:

```text
http://localhost:3006
```

## 4. Frontend

Abrir la carpeta con VS Code + Live Server.

Frontend:

```text
http://localhost:8080
```

## 5. Prueba rápida de CORS

```bash
curl -i -X OPTIONS http://localhost:3006/api/login ^
  -H "Origin: http://localhost:8080" ^
  -H "Access-Control-Request-Method: POST" ^
  -H "Access-Control-Request-Headers: content-type"
```

Debe aparecer `Access-Control-Allow-Origin: http://localhost:8080`.

## 6. Flujo de demostración

1. Home.
2. Registro.
3. Aceptación del aviso de privacidad.
4. Validación de password.
5. Correo de activación.
6. Login.
7. Código MFA.
8. Acceso al sistema.
9. Catálogo.
10. Carrito.
11. Panel administrativo.
12. CRUD de productos.
13. CRUD de usuarios.
14. CRUD de roles.
15. Asignación de rol.
16. API externa de tipo de cambio.
17. Evidencia HTTPS en producción.


## Versión V1

Consultar `docs/VERSION_V1.md` para las implementaciones de seguridad, sesiones, recuperación, consentimiento y maestro/detalle.
