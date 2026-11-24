// Aplica los SQL que faltan sin borrar las tablas ni los usuarios existentes.
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { Client } = require('pg');
const { PasswordHasher } = require('@nestjs/authentication');

const carpetaProyecto = join(__dirname, '..');

async function preparar() {
  process.loadEnvFile(join(carpetaProyecto, '.env'));
  const cliente = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    connectionTimeoutMillis: 5000,
  });
  const hasher = new PasswordHasher();

  // Los archivos SQL contienen BEGIN y COMMIT: cada uno se aplica completo.
  async function aplicar(archivo) {
    await cliente.query(readFileSync(join(carpetaProyecto, archivo), 'utf8'));
    console.log(`Aplicado: ${archivo}`);
  }

  try {
    await cliente.connect();
    const { rows: tablas } = await cliente.query(`
      SELECT to_regclass('public.users') AS users,
             to_regclass('public.roles') AS roles,
             to_regclass('public.users_roles') AS users_roles
    `);
    const cantidad = Object.values(tablas[0]).filter(Boolean).length;

    if (cantidad === 0) {
      await aplicar('migrations/001_crear_tablas.sql');
    } else if (cantidad === 3) {
      console.log('Las tres tablas ya existen. Se conservan.');
    } else {
      throw new Error(
        'Faltan algunas tablas. Revisa 001_crear_tablas.sql antes de continuar.',
      );
    }

    // Una cuenta existente nunca se convierte en administrador automáticamente.
    const { rows: administradores } = await cliente.query(
      `
      SELECT u.password, u.is_active,
             EXISTS (
               SELECT 1 FROM users_roles ur
               JOIN roles r ON r.id = ur.role_id
               WHERE ur.user_id = u.id AND r.role_name = 'admin'
             ) AS es_admin
      FROM users u WHERE u.email = $1
    `,
      ['admin@example.com'],
    );

    if (administradores.length === 0) {
      await aplicar('migrations/002_crear_admin.sql');
    } else {
      const admin = administradores[0];
      const claveCorrecta = await hasher.verify(
        'Admin2026!ParaPrueba',
        admin.password,
      );
      if (!admin.es_admin || !admin.is_active || !claveCorrecta) {
        throw new Error(
          'admin@example.com ya existe con otra configuración. Se conservó esa cuenta; revisa sus datos antes de cargar la demostración.',
        );
      }
      console.log('El administrador de demostración ya está preparado.');
    }

    const { rows: cuentas } = await cliente.query(
      'SELECT email, password, is_active FROM users WHERE email = ANY($1::text[])',
      [['estudiante.prueba@example.com', 'desactivado@example.com']],
    );

    if (cuentas.length === 0) {
      await aplicar('scripts/usuarios_roles_probados.sql');
    } else if (cuentas.length === 2) {
      // Repetir la preparación conserva los roles que se cambien en la práctica.
      for (const cuenta of cuentas) {
        const esEstudiante = cuenta.email === 'estudiante.prueba@example.com';
        const clave = esEstudiante
          ? 'Estudio2026!Prueba'
          : 'Inactivo2026!Prueba';
        if (
          !(await hasher.verify(clave, cuenta.password)) ||
          cuenta.is_active !== esEstudiante
        ) {
          throw new Error(
            'Una cuenta de demostración ya existe con otros datos. Se conservó; revisa su configuración.',
          );
        }
      }
      console.log(
        'Las cuentas de demostración ya existen. Se conservan sus roles.',
      );
    } else {
      throw new Error(
        'Solo existe una de las dos cuentas de demostración. Revisa scripts/usuarios_roles_probados.sql antes de continuar.',
      );
    }

    console.log('Base de datos preparada. Puedes ejecutar npm run start:dev.');
  } finally {
    await cliente.end();
  }
}

preparar().catch((error) => {
  console.error('No se pudo preparar la base de datos:', error.message);
  console.error(
    'Comprueba .env y que docker compose up -d --wait haya terminado.',
  );
  process.exitCode = 1;
});
