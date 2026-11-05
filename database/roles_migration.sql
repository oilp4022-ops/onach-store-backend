-- Onach Urban Store - Catálogo de Roles
-- Ejecutar sobre la base de datos onachus.

CREATE TABLE IF NOT EXISTS roles (
    id_rol INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(255) NULL,
    estado ENUM('activo','inactivo') NOT NULL DEFAULT 'activo',
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO roles (nombre, descripcion, estado) VALUES
('cliente', 'Usuario final de la tienda', 'activo'),
('admin', 'Administrador de la aplicación', 'activo'),
('superadmin', 'Administrador con privilegios elevados', 'activo')
ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion), estado = VALUES(estado);
