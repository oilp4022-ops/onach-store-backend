# Activación de cuenta por correo

## Flujo local
1. Backend: `node server.js` en `http://localhost:3006`.
2. Frontend: Live Server en `http://localhost:8080`.
3. Registrar un usuario con un correo real al que tengas acceso.
4. La cuenta se guarda con `estado = inactivo`.
5. Nodemailer envía un enlace a `http://localhost:3006/api/activar/<token>`.
6. Al abrirlo, el backend cambia el estado a `activo` y redirige a `http://localhost:8080/login.html?activado=true`.
7. El Login muestra el mensaje de cuenta activada.

## Gmail
Usa una contraseña de aplicación de Gmail en `EMAIL_PASS`; no uses la contraseña normal de la cuenta.

## Verificación en MySQL
Antes de activar: `SELECT id_cliente,email,estado,token_activacion FROM clientes WHERE email='correo_de_prueba';`
Después de activar: `SELECT id_cliente,email,estado,token_activacion FROM clientes WHERE email='correo_de_prueba';`
Debe quedar `estado = activo` y `token_activacion = NULL`.
