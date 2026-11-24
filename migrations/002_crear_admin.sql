-- Administrador de demostración. Aplicar después de 001_crear_tablas.sql.
-- Ejecutar una sola vez con psql -v ON_ERROR_STOP=1.
-- Si admin@example.com ya existe, la transacción falla sin modificar esa cuenta.

BEGIN;

INSERT INTO roles (role_name, description)
VALUES ('admin', 'Administrador del sistema')
ON CONFLICT (role_name) DO NOTHING;

WITH nuevo_admin AS (
  INSERT INTO users (email, password, name, is_active)
  VALUES (
    'admin@example.com',
    '$scrypt$ln=17,r=8,p=1$GT/a9nNu38h/XbqZ4VlhAg$+rSncVe17iGQH8QryveNloiZvKCGJ40W0vjgzaMDOiU',
    'Administrador de prueba',
    TRUE
  )
  RETURNING id
)
INSERT INTO users_roles (user_id, role_id)
SELECT nuevo_admin.id, roles.id
FROM nuevo_admin
JOIN roles ON roles.role_name = 'admin';

COMMIT;
