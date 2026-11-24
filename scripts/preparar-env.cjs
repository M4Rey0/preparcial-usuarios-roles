// Crea la configuración local la primera vez. Conserva el .env que ya exista.
const { randomBytes } = require('node:crypto');
const { existsSync, readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

const carpetaProyecto = join(__dirname, '..');
const rutaEnv = join(carpetaProyecto, '.env');

if (existsSync(rutaEnv)) {
  console.log('Ya existe .env. Se conserva tu configuración actual.');
} else {
  const plantilla = readFileSync(join(carpetaProyecto, '.env.example'), 'utf8');
  const clave = randomBytes(32).toString('hex');
  const configuracion = plantilla.replace(
    'JWT_SECRET=GENERAR_CON_EL_SCRIPT',
    `JWT_SECRET=${clave}`,
  );
  writeFileSync(rutaEnv, configuracion, { flag: 'wx', mode: 0o600 });
  console.log('.env creado con una clave JWT aleatoria. No lo subas a GitHub.');
}
