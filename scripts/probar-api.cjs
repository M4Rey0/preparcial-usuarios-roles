'use strict';

const { randomUUID } = require('node:crypto');

const API_URL = (process.env.API_URL || 'http://127.0.0.1:3000').replace(
  /\/+$/,
  '',
);
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin2026!ParaPrueba';
const ejecucion = `${Date.now()}-${randomUUID().slice(0, 8)}`;
const datosUsuario = {
  email: `prueba.api.${ejecucion}@example.com`,
  password: 'PruebaAPI2026!Segura',
  name: 'Usuario de prueba automática',
  phone: '3000000000',
};
const nombreRol = `prueba_${ejecucion}`;

let aprobadas = 0;
let solicitudes = 0;
let pruebaActual = 'Preparación';

class FalloPrueba extends Error {}

function comprobar(condicion, mensaje) {
  if (!condicion) throw new FalloPrueba(mensaje);
}

function comprobarObjeto(valor, campos, contexto) {
  comprobar(
    valor !== null && typeof valor === 'object' && !Array.isArray(valor),
    `${contexto}: se esperaba un objeto JSON.`,
  );
  for (const campo of campos) {
    comprobar(
      Object.hasOwn(valor, campo),
      `${contexto}: falta el campo ${campo}.`,
    );
  }
}

function esUuid(valor) {
  return (
    typeof valor === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      valor,
    )
  );
}

// Revisa también los objetos y arreglos anidados, sin imprimir sus valores.
function comprobarSinPassword(valor) {
  if (!valor || typeof valor !== 'object') return;
  for (const [clave, contenido] of Object.entries(valor)) {
    comprobar(
      !/password|hash/i.test(clave),
      'La respuesta expuso un campo de contraseña o hash.',
    );
    comprobarSinPassword(contenido);
  }
}

function comprobarTokens(datos) {
  comprobarObjeto(
    datos,
    ['accessToken', 'refreshToken', 'expiresIn'],
    'Tokens',
  );
  comprobar(
    typeof datos.accessToken === 'string' &&
      datos.accessToken.split('.').length === 3,
    'accessToken debe tener el formato de un JWT.',
  );
  comprobar(
    typeof datos.refreshToken === 'string' && datos.refreshToken.length > 0,
    'refreshToken debe ser un texto no vacío.',
  );
  comprobar(
    datos.expiresIn === 120,
    'expiresIn debe ser 120: revisa JWT_EXPIRES_IN=2m.',
  );
}

function comprobarUsuario(usuario, conTelefono = false) {
  comprobarObjeto(usuario, ['id', 'email', 'name', 'roles'], 'Usuario');
  comprobar(esUuid(usuario.id), 'El usuario debe tener un id UUID.');
  comprobar(
    typeof usuario.email === 'string' && typeof usuario.name === 'string',
    'email y name deben ser textos.',
  );
  comprobar(
    Array.isArray(usuario.roles) &&
      usuario.roles.every((rol) => typeof rol === 'string'),
    'roles debe ser un arreglo de nombres.',
  );
  if (conTelefono) {
    comprobar(
      Object.hasOwn(usuario, 'phone') &&
        (usuario.phone === null || typeof usuario.phone === 'string'),
      'El perfil debe incluir phone como texto o null.',
    );
  }
}

function comprobarRoles(usuario, nombres) {
  comprobarUsuario(usuario, true);
  comprobar(
    usuario.roles.length === nombres.length &&
      nombres.every((nombre) => usuario.roles.includes(nombre)),
    'El perfil no refleja la lista de roles esperada.',
  );
}

// Cada petición comprueba el estado HTTP, el JSON y la ausencia de passwords.
// Ante un error se muestra el método y la ruta, nunca el cuerpo ni los tokens.
async function peticion(metodo, ruta, estadoEsperado, opciones = {}) {
  const headers = { Accept: 'application/json' };
  if (opciones.token) headers.Authorization = `Bearer ${opciones.token}`;
  if (opciones.body !== undefined) headers['Content-Type'] = 'application/json';

  let respuesta;
  let texto;
  try {
    solicitudes += 1;
    respuesta = await fetch(`${API_URL}${ruta}`, {
      method: metodo,
      headers,
      body:
        opciones.body === undefined ? undefined : JSON.stringify(opciones.body),
      signal: AbortSignal.timeout(15000),
    });
    texto = await respuesta.text();
  } catch {
    throw new FalloPrueba(
      `${metodo} ${ruta}: no se pudo completar la conexión. ` +
        'Comprueba que la API esté encendida y que API_URL sea correcto.',
    );
  }

  comprobar(
    respuesta.status === estadoEsperado,
    `${metodo} ${ruta}: se esperaba HTTP ${estadoEsperado}; se recibió HTTP ${respuesta.status}.`,
  );
  if (estadoEsperado === 204) {
    comprobar(
      texto.length === 0,
      `${metodo} ${ruta}: HTTP 204 debe tener el cuerpo vacío.`,
    );
    return null;
  }

  let datos;
  try {
    datos = JSON.parse(texto);
  } catch {
    throw new FalloPrueba(
      `${metodo} ${ruta}: la respuesta no contiene JSON válido.`,
    );
  }
  comprobarSinPassword(datos);
  if (opciones.mensaje) {
    const mensajes = Array.isArray(datos?.message)
      ? datos.message
      : [datos?.message];
    comprobar(
      mensajes.includes(opciones.mensaje),
      `${metodo} ${ruta}: no contiene el mensaje esperado: ${opciones.mensaje}.`,
    );
  }
  return datos;
}

async function prueba(nombre, ejecutar) {
  pruebaActual = nombre;
  await ejecutar();
  aprobadas += 1;
  console.log(`[${String(aprobadas).padStart(2, '0')}] OK - ${nombre}`);
}

async function iniciarSesion(email, password) {
  const tokens = await peticion('POST', '/auth/login', 200, {
    body: { email, password },
  });
  comprobarTokens(tokens);
  return tokens;
}

// Solo se intenta modificar al usuario y el rol creados por esta ejecución.
async function comprobarRutasAdminDenegadas(token, usuarioId) {
  await peticion('GET', '/roles', 403, { token });
  await peticion('POST', '/roles', 403, {
    token,
    body: { role_name: nombreRol },
  });
  await peticion('GET', '/users', 403, { token });
  await peticion('PATCH', `/users/${usuarioId}/roles`, 403, {
    token,
    body: { roles: [] },
  });
}

async function main() {
  console.log('Pruebas de las nueve rutas de usuarios y roles.');
  console.log(
    'La API y PostgreSQL deben estar encendidos y los SQL de demostración aplicados.',
  );
  console.log('Se creará un usuario y un rol exclusivos de esta ejecución.\n');

  let usuarioId;
  let sesionUsuario;
  let sesionAdmin;
  let sesionSupervisor;
  let sesionLogout;

  await prueba('Registro: crea el usuario (201)', async () => {
    const datos = await peticion('POST', '/auth/register', 201, {
      body: datosUsuario,
    });
    comprobarObjeto(datos, ['message', 'userId'], 'Registro');
    comprobar(
      datos.message === 'Usuario registrado con éxito' && esUuid(datos.userId),
      'La respuesta del registro no coincide con el contrato.',
    );
    usuarioId = datos.userId;
  });
  await prueba('Registro: rechaza un email repetido (409)', () =>
    peticion('POST', '/auth/register', 409, {
      body: datosUsuario,
      mensaje: 'Email ya registrado',
    }),
  );
  await prueba('Registro: rechaza un email inválido (400)', () =>
    peticion('POST', '/auth/register', 400, {
      body: { ...datosUsuario, email: 'correo-invalido' },
      mensaje: 'Email inválido',
    }),
  );
  await prueba('Registro: impide asignarse roles desde el body (400)', () =>
    peticion('POST', '/auth/register', 400, {
      body: { ...datosUsuario, roles: ['admin'] },
    }),
  );
  await prueba('Login: entrega tokens con expiresIn=120 (200)', async () => {
    sesionUsuario = await iniciarSesion(
      datosUsuario.email,
      datosUsuario.password,
    );
  });
  await prueba('Login: rechaza una contraseña incorrecta (401)', () =>
    peticion('POST', '/auth/login', 401, {
      body: { email: datosUsuario.email, password: 'Incorrecta2026!' },
      mensaje: 'Credenciales incorrectas',
    }),
  );
  await prueba(
    'Login: rechaza la cuenta desactivada de demostración (423)',
    () =>
      peticion('POST', '/auth/login', 423, {
        body: {
          email: 'desactivado@example.com',
          password: 'Inactivo2026!Prueba',
        },
        mensaje: 'Usuario desactivado',
      }),
  );
  await prueba('Perfil: exige un token (401)', () =>
    peticion('GET', '/users/me', 401),
  );
  await prueba(
    'Perfil: el usuario registrado empieza sin roles (200)',
    async () => {
      const usuario = await peticion('GET', '/users/me', 200, {
        token: sesionUsuario.accessToken,
      });
      comprobarRoles(usuario, []);
      comprobar(
        usuario.id === usuarioId &&
          usuario.email === datosUsuario.email &&
          usuario.name === datosUsuario.name &&
          usuario.phone === datosUsuario.phone,
        'El perfil no coincide con el usuario registrado.',
      );
    },
  );
  await prueba('Login del administrador de demostración (200)', async () => {
    sesionAdmin = await iniciarSesion(ADMIN_EMAIL, ADMIN_PASSWORD);
  });
  await prueba(
    'Admin: lista los roles con su estructura correcta (200)',
    async () => {
      const roles = await peticion('GET', '/roles', 200, {
        token: sesionAdmin.accessToken,
      });
      comprobar(Array.isArray(roles), 'GET /roles debe devolver un arreglo.');
      for (const rol of roles) {
        comprobarObjeto(rol, ['id', 'role_name', 'description'], 'Rol');
        comprobar(
          esUuid(rol.id) &&
            typeof rol.role_name === 'string' &&
            (rol.description === null || typeof rol.description === 'string'),
          'Un rol tiene un formato incorrecto.',
        );
      }
      comprobar(
        roles.some((rol) => rol.role_name === 'admin') &&
          roles.some((rol) => rol.role_name === 'supervisor'),
        'Faltan los roles de demostración: aplica los SQL indicados en el README.',
      );
    },
  );
  await prueba('Admin: lista usuarios sin exponer password (200)', async () => {
    const usuarios = await peticion('GET', '/users', 200, {
      token: sesionAdmin.accessToken,
    });
    comprobar(Array.isArray(usuarios), 'GET /users debe devolver un arreglo.');
    usuarios.forEach((usuario) => comprobarUsuario(usuario));
    comprobar(
      usuarios.some((usuario) => usuario.id === usuarioId),
      'El listado no contiene al usuario recién registrado.',
    );
  });
  await prueba(
    'Usuario sin roles: las cuatro rutas de admin responden 403',
    () => comprobarRutasAdminDenegadas(sesionUsuario.accessToken, usuarioId),
  );
  await prueba(
    'Login del supervisor de demostración y comprobación de su rol (200)',
    async () => {
      sesionSupervisor = await iniciarSesion(
        'estudiante.prueba@example.com',
        'Estudio2026!Prueba',
      );
      const usuario = await peticion('GET', '/users/me', 200, {
        token: sesionSupervisor.accessToken,
      });
      comprobarRoles(usuario, ['supervisor']);
    },
  );
  await prueba(
    'Supervisor: las cuatro rutas de admin también responden 403',
    () => comprobarRutasAdminDenegadas(sesionSupervisor.accessToken, usuarioId),
  );
  await prueba('Admin: crea el rol de esta ejecución (201)', async () => {
    const datos = await peticion('POST', '/roles', 201, {
      token: sesionAdmin.accessToken,
      body: {
        role_name: nombreRol,
        description: 'Rol exclusivo de las pruebas automáticas',
      },
    });
    comprobarObjeto(datos, ['message', 'roleId'], 'Crear rol');
    comprobar(
      datos.message === 'Rol creado con éxito' && esUuid(datos.roleId),
      'La respuesta al crear el rol no coincide con el contrato.',
    );
  });
  await prueba('Crear rol: rechaza nombres repetidos (409)', () =>
    peticion('POST', '/roles', 409, {
      token: sesionAdmin.accessToken,
      body: { role_name: nombreRol },
      mensaje: 'role_name ya existe',
    }),
  );
  await prueba('Crear rol: exige role_name (400)', () =>
    peticion('POST', '/roles', 400, {
      token: sesionAdmin.accessToken,
      body: {},
      mensaje: 'role_name es requerido',
    }),
  );
  await prueba(
    'Admin: asigna dos roles al usuario de prueba (200)',
    async () => {
      const datos = await peticion('PATCH', `/users/${usuarioId}/roles`, 200, {
        token: sesionAdmin.accessToken,
        body: { roles: ['supervisor', nombreRol] },
      });
      comprobar(
        datos.message === 'Roles asignados',
        'Falta el mensaje Roles asignados.',
      );
    },
  );
  await prueba(
    'Perfil: ve los roles nuevos con el MISMO access token (200)',
    async () => {
      const usuario = await peticion('GET', '/users/me', 200, {
        token: sesionUsuario.accessToken,
      });
      comprobarRoles(usuario, ['supervisor', nombreRol]);
    },
  );
  await prueba(
    'Asignar roles: rechaza uno inexistente sin cambiar los anteriores (400)',
    async () => {
      await peticion('PATCH', `/users/${usuarioId}/roles`, 400, {
        token: sesionAdmin.accessToken,
        body: { roles: [nombreRol, `inexistente_${ejecucion}`] },
        mensaje: 'roles inválidos',
      });
      const usuario = await peticion('GET', '/users/me', 200, {
        token: sesionUsuario.accessToken,
      });
      comprobarRoles(usuario, ['supervisor', nombreRol]);
    },
  );
  await prueba('Asignar roles: rechaza nombres repetidos (400)', () =>
    peticion('PATCH', `/users/${usuarioId}/roles`, 400, {
      token: sesionAdmin.accessToken,
      body: { roles: [nombreRol, nombreRol] },
      mensaje: 'roles inválidos',
    }),
  );
  await prueba('Asignar roles: detecta un usuario inexistente (404)', () =>
    peticion('PATCH', `/users/${randomUUID()}/roles`, 404, {
      token: sesionAdmin.accessToken,
      body: { roles: [nombreRol] },
      mensaje: 'Usuario no encontrado',
    }),
  );
  await prueba('Asignar roles: rechaza un UUID mal formado (400)', () =>
    peticion('PATCH', '/users/no-es-un-uuid/roles', 400, {
      token: sesionAdmin.accessToken,
      body: { roles: [nombreRol] },
    }),
  );
  await prueba(
    'Asignar roles: [] retira todos los roles y el perfil lo refleja (200)',
    async () => {
      await peticion('PATCH', `/users/${usuarioId}/roles`, 200, {
        token: sesionAdmin.accessToken,
        body: { roles: [] },
      });
      const usuario = await peticion('GET', '/users/me', 200, {
        token: sesionUsuario.accessToken,
      });
      comprobarRoles(usuario, []);
    },
  );
  await prueba(
    'Refresh: rota el token y entrega un access token utilizable (200)',
    async () => {
      const nuevosTokens = await peticion('POST', '/auth/refresh', 200, {
        body: { refreshToken: sesionUsuario.refreshToken },
      });
      comprobarTokens(nuevosTokens);
      comprobar(
        nuevosTokens.refreshToken !== sesionUsuario.refreshToken,
        'La renovación debe cambiar el refresh token.',
      );
      const usuario = await peticion('GET', '/users/me', 200, {
        token: nuevosTokens.accessToken,
      });
      comprobar(
        usuario.id === usuarioId,
        'El token renovado corresponde a otro usuario.',
      );
    },
  );
  // Reutilizar el token viejo revoca su familia: después usamos un login nuevo.
  await prueba('Refresh: rechaza el token anterior ya consumido (401)', () =>
    peticion('POST', '/auth/refresh', 401, {
      body: { refreshToken: sesionUsuario.refreshToken },
    }),
  );
  await prueba('Refresh: exige refreshToken (400)', () =>
    peticion('POST', '/auth/refresh', 400, {
      body: {},
      mensaje: 'refreshToken es requerido',
    }),
  );
  await prueba('Refresh: rechaza un token inválido (401)', () =>
    peticion('POST', '/auth/refresh', 401, {
      body: { refreshToken: 'token-invalido-de-prueba' },
    }),
  );
  await prueba(
    'Login: abre una sesión nueva para probar logout (200)',
    async () => {
      sesionLogout = await iniciarSesion(
        datosUsuario.email,
        datosUsuario.password,
      );
    },
  );
  await prueba('Logout: revoca esa sesión y no devuelve contenido (204)', () =>
    peticion('POST', '/auth/logout', 204, {
      body: { refreshToken: sesionLogout.refreshToken },
    }),
  );
  await prueba('Refresh: rechaza el token revocado por logout (401)', () =>
    peticion('POST', '/auth/refresh', 401, {
      body: { refreshToken: sesionLogout.refreshToken },
    }),
  );
  await prueba('Logout: exige refreshToken (400)', () =>
    peticion('POST', '/auth/logout', 400, {
      body: {},
      mensaje: 'refreshToken es requerido',
    }),
  );

  console.log(
    `\nResultado: ${aprobadas}/33 comprobaciones aprobadas (${solicitudes} solicitudes HTTP).`,
  );
  console.log(`Usuario creado, ahora sin roles: ${datosUsuario.email}`);
  console.log(`Rol creado: ${nombreRol}`);
}

main().catch((error) => {
  console.error(`\nFALLO en la comprobación ${aprobadas + 1}: ${pruebaActual}`);
  console.error(
    error instanceof FalloPrueba
      ? error.message
      : 'Error inesperado al ejecutar las pruebas.',
  );
  console.error(
    `${aprobadas} comprobaciones aprobadas antes del fallo. Se detuvo la ejecución.`,
  );
  console.error('Revisa la consola de la API y las instrucciones del README.');
  process.exitCode = 1;
});
