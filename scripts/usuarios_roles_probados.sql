-- Script SQL de prueba de usuarios y roles.
-- No modifica permanentemente la base: ROLLBACK revierte todo al final.
-- Ejecutar DESPUÉS de las migraciones 001 y 002 (o npm run db:preparar).
-- No es necesario para iniciar la API.

BEGIN;

-- Rol de prueba temporal (no es un rol obligatorio del preparcial).
INSERT INTO roles (role_name, description)
VALUES ('supervisor_sql_prueba', 'Rol temporal para verificar la relación')
ON CONFLICT (role_name) DO NOTHING;

-- Usuario de prueba temporal; la contraseña ya está convertida a un hash scrypt.
INSERT INTO users (email, password, name, is_active)
VALUES (
  'sql.prueba@example.com',
  '$scrypt$ln=17,r=8,p=1$8opQJD6/uzbmfYDq+xT6/g$swkarI4kLFdg1zkrLNhCGWXN05LAIQ1u7H5A5ahc2jQ',
  'Persona para prueba SQL',
  TRUE
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO users_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u CROSS JOIN roles r
WHERE u.email = 'sql.prueba@example.com' AND r.role_name = 'supervisor_sql_prueba'
ON CONFLICT DO NOTHING;

-- Comprueba la relación entre usuarios y roles.
SELECT u.email, u.is_active, r.role_name
FROM users u
JOIN users_roles ur ON ur.user_id = u.id
JOIN roles r ON r.id = ur.role_id
WHERE u.email IN ('admin@example.com', 'sql.prueba@example.com')
ORDER BY u.email, r.role_name;

-- Conserva exactamente los datos que había antes del script.
ROLLBACK;
