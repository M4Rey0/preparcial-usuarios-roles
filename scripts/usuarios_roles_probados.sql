-- Datos adicionales de demostración para las pruebas de la API.
-- Aplicar DESPUÉS de 001_crear_tablas.sql y 002_crear_admin.sql.
-- Ejecutar una sola vez con psql -v ON_ERROR_STOP=1.
-- Si alguno de estos correos ya existe, se revierte toda esta transacción.
-- supervisor no concede permisos administrativos en la aplicación actual.

BEGIN;

INSERT INTO roles (role_name, description)
VALUES ('supervisor', 'Rol de práctica sin permisos administrativos adicionales')
ON CONFLICT (role_name) DO NOTHING;

WITH nuevo_estudiante AS (
  INSERT INTO users (email, password, name, is_active)
  VALUES (
    'estudiante.prueba@example.com',
    '$scrypt$ln=17,r=8,p=1$8opQJD6/uzbmfYDq+xT6/g$swkarI4kLFdg1zkrLNhCGWXN05LAIQ1u7H5A5ahc2jQ',
    'Estudiante de prueba',
    TRUE
  )
  RETURNING id
)
INSERT INTO users_roles (user_id, role_id)
SELECT nuevo_estudiante.id, roles.id
FROM nuevo_estudiante
JOIN roles ON roles.role_name = 'supervisor';

-- La cuenta desactivada se crea sin roles.
INSERT INTO users (email, password, name, is_active)
VALUES (
  'desactivado@example.com',
  '$scrypt$ln=17,r=8,p=1$E65sVfLkAHUJOcVhQJ8LOA$UZCQ6y6reu2MOLI/SJB+4srb24L5pgijjeIMFvSiFBw',
  'Usuario desactivado',
  FALSE
);

COMMIT;
