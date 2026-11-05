# Auditoría preliminar de la rúbrica - Onach Urban Store

Basada en el proyecto entregado y en el documento de evaluación de Desarrollo Web Integral.

| Requisito | Situación encontrada | Acción |
|---|---|---|
| Aplicación WEB publicada | Existe frontend y configuración para Netlify en código | Verificar URL pública y evidencia |
| Login | Implementado con JWT + MFA | Corregido CORS/ruta |
| Registro de usuarios | Implementado | Verificar correo de activación |
| Validaciones de password | Implementadas en registro | Mantener evidencia de las 6 reglas |
| Confirmación por correo | Implementada | Verificar credenciales SMTP y URL pública |
| Recuperación de contraseña | Backend implementado | Se agregó envío del código por correo |
| Repositorio | Existe `.git` y estructura de proyecto | Verificar enlace público/entrega |
| SSL | Hay referencia a Netlify/Render | Verificar HTTPS funcionando en producción |
| Web Service de terceros | API de tipo de cambio + Google reCAPTCHA | Preparar evidencia |
| Web Service propio | API REST Express para productos/auth/etc. | Preparar Postman y evidencia |
| CRUD Usuarios | Backend y panel administrativo | Corregido endpoint, edición y autorización |
| CRUD Roles | No existía catálogo independiente | Se agregó migración, API y panel de roles |
| Asignación de Roles | Campo `rol` en usuarios | Integrado con catálogo `roles` |
| Catálogo propio | Productos | CRUD existente |
| Maestro/Detalle | `productos` + `variantes_producto` | Existe relación, verificar CRUD/evidencia de variantes |
| Contenedor | No se encontró Dockerfile en el proyecto revisado | Pendiente |
| Servidor BD | MySQL/XAMPP configurado | Documentar instalación/BD |
| Dominio | Referencias a Netlify/Render | Verificar dominio final |
| Certificados | Depende del despliegue | Verificar HTTPS final |
| Pruebas | Hay Postman y lógica de seguridad | Preparar matriz de pruebas y capturas |
| Video en inglés | No está dentro del código | Pendiente de grabar |

## Cambios adicionales de esta revisión

- CORS para Live Server en puerto 8080.
- Corrección de endpoints de autenticación.
- Corrección de URLs locales que todavía usaban puerto 3000.
- Protección del catálogo de usuarios con JWT + RBAC.
- CRUD completo de usuarios desde el panel.
- Catálogo independiente de roles.
- Asignación de roles validada contra el catálogo.
- Corrección del consumo de productos: el backend devuelve directamente un arreglo JSON, por lo que el frontend ya no intenta leer `resultado.data`.

## Pendientes críticos antes de entregar

1. Ejecutar `database/roles_migration.sql` en `onachus`.
2. Crear `.env` a partir de `.env.example`.
3. Comprobar MySQL/XAMPP.
4. Probar registro, activación, login, MFA y recuperación.
5. Probar CRUD de usuarios y roles con una cuenta administrativa.
6. Preparar Dockerfile/compose si se requiere la evidencia de contenedor.
7. Desplegar backend y frontend por HTTPS.
8. Grabar el video de funcionamiento en inglés.
