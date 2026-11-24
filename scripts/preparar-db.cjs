'use strict';

// Prepara el pre-parcial ORIGINAL: tablas + rol/usuario admin. No carga usuarios extra.
// Se puede repetir sin borrar usuarios, roles o cambios hechos en ejercicios.
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { Client } = require('pg');
const { PasswordHasher } = require('@nestjs/authentication');

const proyecto = join(__dirname, '..');

async function main() {
  process.loadEnvFile(join(proyecto, '.env'));
  const db = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    connectionTimeoutMillis: 5000,
  });

  async function ejecutarSQL(ruta) {
    await db.query(readFileSync(join(proyecto, ruta), 'utf8'));
    console.log(`Aplicado: ${ruta}`);
  }

  try {
    await db.connect();
    const { rows } = await db.query(`
      SELECT to_regclass('public.users') AS users,
             to_regclass('public.roles') AS roles,
             to_regclass('public.users_roles') AS users_roles
    `);
    const existentes = Object.values(rows[0]).filter(Boolean).length;
    if (existentes === 0) {
      await ejecutarSQL('migrations/001_crear_tablas.sql');
    } else if (existentes === 3) {
      console.log('Las tres tablas ya existen: no se reemplazan.');
    } else {
      throw new Error('Solo existen algunas tablas. Revisa las migraciones SQL.');
    }

    // Si el admin ya existe, nunca se modifica su contraseña ni se le dan roles a ciegas.
    const { rows: usuarios } = await db.query(`
      SELECT u.password, u.is_active,
        EXISTS (
          SELECT 1 FROM users_roles ur JOIN roles r ON r.id = ur.role_id
          WHERE ur.user_id = u.id AND r.role_name = 'admin'
        ) AS es_admin
      FROM users u WHERE email = $1
    `, ['admin@example.com']);

    if (usuarios.length === 0) {
      await ejecutarSQL('migrations/002_crear_admin.sql');
    } else {
      const admin = usuarios[0];
      const hasher = new PasswordHasher();
      const claveValida = await hasher.verify('Admin2026!ParaPrueba', admin.password);
      if (!admin.es_admin || !admin.is_active || !claveValida) {
        throw new Error('admin@example.com ya existe con otros datos; se conservó sin cambios.');
      }
      console.log('Admin inicial existente: se conserva.');
    }

    console.log('Base preparada. No se crearon supervisor, auditor ni estudiantes.');
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error('No se pudo preparar la base:', error.message);
  console.error('Revisa Docker Desktop, .env y la existencia de las tablas.');
  process.exitCode = 1;
});
