# Onach Urban Store — Versión Final V1

## Objetivo
Esta versión consolida las correcciones de autenticación y seguridad sin reemplazar la estructura general del proyecto.

## Implementaciones V1

1. **Registro seguro**
   - reCAPTCHA v2 verificado en backend mediante `siteverify`.
   - Validación de las seis reglas de contraseña.
   - Aceptación obligatoria del Aviso de Privacidad.
   - Usuario creado como `inactivo` hasta confirmar correo.
   - Correo de activación mediante Nodemailer.

2. **Activación de cuenta**
   - Enlace `/api/activar/:token`.
   - Cuenta pasa a `activo`.
   - Token de activación se elimina después de usarlo.

3. **Login + MFA**
   - Contraseña con bcrypt.
   - Bloqueo temporal después de cinco intentos incorrectos.
   - MFA de seis dígitos con expiración de 10 minutos.
   - Si falla el correo MFA, el login no continúa y el código no se imprime en consola.

4. **Sesiones y refresh tokens**
   - Sesión creada después de MFA.
   - Access token JWT de 15 minutos.
   - Refresh token de 30 días.
   - Rotación de refresh token.
   - Logout revoca la sesión y sus refresh tokens.

5. **Recuperación de contraseña**
   - Código de recuperación por correo.
   - Expira en 15 minutos.
   - La nueva contraseña debe cumplir las mismas seis reglas.
   - Al restablecer contraseña se revocan sesiones y refresh tokens existentes.

6. **Protección de datos**
   - Consentimiento del Aviso de Privacidad registrado en `consentimientos` con versión y fecha.

7. **Usuarios y roles**
   - CRUD existente conservado.
   - Validación del rol contra el catálogo.
   - Misma política de contraseña en creación/edición administrativa.
   - Un administrador no puede eliminarse a sí mismo desde el CRUD de usuarios.

8. **Maestro/detalle**
   - `productos` como maestro.
   - `variantes_producto` como detalle.
   - Endpoints CRUD de variantes.

## Migración obligatoria

Ejecutar en `onachus`:

```sql
SOURCE database/roles_migration.sql;
SOURCE database/security_v1_migration.sql;
```

## Variables obligatorias

Copiar `.env.example` a `.env` y configurar:

- `JWT_SECRET`
- `RECAPTCHA_SECRET` de la misma clave reCAPTCHA usada en `login.html`
- `EMAIL_USER`
- `EMAIL_PASS`
- `DB_*`
- `BACKEND_PUBLIC_URL`
- `FRONTEND_PUBLIC_URL`

Nunca subir `.env` al repositorio.

## Prueba mínima V1

1. Registrar usuario.
2. Aceptar Aviso de Privacidad.
3. Completar reCAPTCHA.
4. Confirmar que el usuario queda `inactivo`.
5. Recibir correo y activar cuenta.
6. Iniciar sesión.
7. Recibir MFA y validarlo.
8. Confirmar JWT + refresh token.
9. Abrir `mi-cuenta.html` y comprobar sesión activa.
10. Cerrar sesión y comprobar que la sesión queda inactiva.
11. Probar recuperación de contraseña.
12. Probar CRUD de usuarios/roles.
13. Probar CRUD de variantes.
