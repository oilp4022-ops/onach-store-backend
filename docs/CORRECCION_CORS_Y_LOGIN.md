# Corrección CORS y Login - Onach Urban Store

## Causa encontrada

El frontend se ejecuta en `http://localhost:8080` y el backend en `http://localhost:3006`.

Había dos problemas simultáneos:

1. `server.js` no permitía `http://localhost:8080` en la lista de orígenes CORS.
2. El frontend llamaba a `/api/auth/login`, pero el backend monta `authRoutes` con `app.use('/api', authRoutes)`, por lo que el endpoint real es `/api/login`.

## Cambios aplicados

- Se agregó `http://localhost:8080` y `http://127.0.0.1:8080` a CORS.
- Se habilitaron métodos y encabezados para preflight `OPTIONS`.
- Se eliminó la duplicación de `express.json()`.
- Se corrigieron Login, MFA y Registro para utilizar `/api/login`, `/api/verify-mfa` y `/api/register`.
- Se corrigió la URL de activación de cuenta para usar el backend en el puerto 3006.
- Se corrigió la redirección posterior a activación para volver al frontend en el puerto 8080.
- Se unificaron varias llamadas locales que todavía apuntaban al puerto 3000.

## Prueba realizada

El preflight responde ahora con:

```text
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: http://localhost:8080
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS
Access-Control-Allow-Headers: Content-Type,Authorization
```

Además, `POST /api/login` llega correctamente al controlador y devuelve `400` cuando no se proporcionan credenciales, en lugar de fallar por CORS.

## Ejecución local

### Backend

```bash
npm install
node server.js
```

Debe aparecer:

```text
Servidor ... corriendo en http://localhost:3006
```

### Frontend

Abrir el proyecto con Live Server o un servidor HTTP en:

```text
http://localhost:8080
```

No se recomienda abrir los HTML directamente con `file://`.
