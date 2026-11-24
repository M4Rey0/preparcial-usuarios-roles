'use strict';

const { existsSync, mkdirSync, writeFileSync } = require('node:fs');
const { dirname, join, resolve } = require('node:path');

const projectDirectory = resolve(__dirname, '..');
const adminPath = join(projectDirectory, 'migrations', '002_crear_admin.sql');
const dataPath = join(
  projectDirectory,
  'scripts',
  'usuarios_roles_probados.sql',
);

// Los SQL acompañan la entrega. Este script solo crea los archivos que falten.
// No se conecta a PostgreSQL ni reemplaza usuarios o archivos existentes.
async function main() {
  const needsAdmin = !existsSync(adminPath);
  const needsData = !existsSync(dataPath);

  if (!needsAdmin) {
    console.log(
      'Ya existe migrations/002_crear_admin.sql. Se conserva sin cambios.',
    );
  }
  if (!needsData) {
    console.log(
      'Ya existe scripts/usuarios_roles_probados.sql. Se conserva sin cambios.',
    );
  }
  if (!needsAdmin && !needsData) {
    return;
  }

  const { PasswordHasher } = require('@nestjs/authentication');
  const hasher = new PasswordHasher();
  const files = [];

  async function verifiedHash(password) {
    const hash = await hasher.hash(password);
    if (!(await hasher.verify(password, hash))) {
      const error = new Error('No se pudo verificar el hash generado.');
      error.code = 'HASH_VERIFICATION_FAILED';
      throw error;
    }
    return hash.replaceAll("'", "''");
  }

  // Contraseñas públicas de demostración, exclusivas para la práctica local.
  if (needsAdmin) {
    const adminHash = await verifiedHash('Admin2026!ParaPrueba');
    files.push({
      path: adminPath,
      label: 'migrations/002_crear_admin.sql',
      sql: `-- Administrador de demostración. Aplicar después de 001_crear_tablas.sql.
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
    '${adminHash}',
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
`,
    });
  }

  if (needsData) {
    const studentHash = await verifiedHash('Estudio2026!Prueba');
    const inactiveHash = await verifiedHash('Inactivo2026!Prueba');
    files.push({
      path: dataPath,
      label: 'scripts/usuarios_roles_probados.sql',
      sql: `-- Datos adicionales de demostración para las pruebas de la API.
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
    '${studentHash}',
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
  '${inactiveHash}',
  'Usuario desactivado',
  FALSE
);

COMMIT;
`,
    });
  }

  for (const file of files) {
    mkdirSync(dirname(file.path), { recursive: true });
    writeFileSync(file.path, file.sql, { encoding: 'utf8', flag: 'wx' });
    console.log(`Creado: ${file.label}`);
  }
  console.log(
    'Hashes generados y verificados. Este script no ejecutó los SQL.',
  );
}

main().catch((error) => {
  console.error('No se pudieron completar los archivos SQL de demostración.');
  if (error && error.code === 'EEXIST') {
    console.error(
      'Un archivo apareció durante la generación. Se conservó; vuelve a ejecutar el script.',
    );
  } else if (error && error.code === 'MODULE_NOT_FOUND') {
    console.error(
      'Ejecuta npm install en el proyecto y comprueba @nestjs/authentication.',
    );
  } else if (error && error.code === 'HASH_VERIFICATION_FAILED') {
    console.error(
      'Falló la verificación de una contraseña. No se escribieron archivos.',
    );
  } else {
    console.error(
      'Comprueba las dependencias y los permisos de escritura del proyecto.',
    );
  }
  process.exitCode = 1;
});
