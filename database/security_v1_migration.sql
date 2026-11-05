-- ONACH URBAN STORE - Seguridad V1
-- Ejecutar después de roles_migration.sql sobre la BD onachus.
-- Este script no borra datos existentes.

CREATE TABLE IF NOT EXISTS sessions (
    id_sesion INT AUTO_INCREMENT PRIMARY KEY,
    id_cliente INT NOT NULL,
    dispositivo VARCHAR(255) NOT NULL,
    direccion_ip VARCHAR(64) NOT NULL,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    INDEX idx_sessions_cliente_activa (id_cliente, activa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id_refresh INT AUTO_INCREMENT PRIMARY KEY,
    id_cliente INT NOT NULL,
    id_sesion INT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_expiracion DATETIME NOT NULL,
    revocado BOOLEAN NOT NULL DEFAULT FALSE,
    INDEX idx_refresh_cliente (id_cliente),
    INDEX idx_refresh_sesion (id_sesion),
    INDEX idx_refresh_vigencia (revocado, fecha_expiracion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Si refresh_tokens ya existía sin id_sesion, agrega la columna.
SET @has_id_sesion := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'refresh_tokens' AND COLUMN_NAME = 'id_sesion'
);
SET @sql := IF(@has_id_sesion = 0,
    'ALTER TABLE refresh_tokens ADD COLUMN id_sesion INT NULL AFTER id_cliente',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS consentimientos (
    id_consentimiento INT AUTO_INCREMENT PRIMARY KEY,
    id_cliente INT NOT NULL,
    tipo VARCHAR(80) NOT NULL,
    aceptado BOOLEAN NOT NULL DEFAULT FALSE,
    version VARCHAR(30) NOT NULL DEFAULT 'v1.0',
    fecha_aceptacion DATETIME NULL,
    origen VARCHAR(80) NULL,
    INDEX idx_consentimientos_cliente (id_cliente, tipo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Índices útiles para autenticación y recuperación.
SET @sql := IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clientes' AND INDEX_NAME = 'idx_clientes_email') = 0, 'CREATE INDEX idx_clientes_email ON clientes(email)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clientes' AND INDEX_NAME = 'idx_clientes_token_activacion') = 0, 'CREATE INDEX idx_clientes_token_activacion ON clientes(token_activacion)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mfa_codes' AND INDEX_NAME = 'idx_mfa_cliente_expiracion') = 0, 'CREATE INDEX idx_mfa_cliente_expiracion ON mfa_codes(id_cliente, fecha_expiracion, usado)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'password_resets' AND INDEX_NAME = 'idx_password_resets_cliente') = 0, 'CREATE INDEX idx_password_resets_cliente ON password_resets(id_cliente, usado, fecha_expiracion)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
