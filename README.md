# Preparcial: usuarios y roles

API con NestJS, TypeORM y PostgreSQL. Permite registrar usuarios, iniciar y cerrar sesiones, renovar tokens y administrar roles. Usa `@nestjs/authentication` y `@nestjs/authorization`, sin Passport.

## 1. Arrancar el proyecto

Necesitas Node.js (en clase se está usando la versión 26), npm y Docker Desktop abierto. En VS Code abre la carpeta que contiene `package.json` y `compose.yaml`. **Todos los comandos de esta guía se ejecutan desde esa carpeta.**


```bash
cd ~/Desktop/preparcial-usuarios-roles
```

Ejecuta estos comandos uno por uno; continúa cuando el anterior termine correctamente:

```bash
npm ci
```

Instala las versiones guardadas en `package-lock.json`.

```bash
npm run preparar:env
```

Crea `.env` a partir de `.env.example` y genera una clave JWT aleatoria. Si ya tienes `.env`, conserva sus valores.

```bash
docker compose up -d --wait
```

Inicia PostgreSQL y espera a que esté listo.

```bash
npm run db:preparar
```

Aplica los SQL pendientes. Si ya están las tres tablas, conserva los usuarios que tengas. Añade el administrador y las cuentas de demostración cuando faltan. Si encuentra una cuenta de demostración existente con datos incompatibles, se detiene para que la revises; no la reemplaza.

```bash
npm run start:dev
```

Deja esta terminal abierta. En `http://localhost:3000/` aparece `Hello World!`. La API queda lista para recibir peticiones.

## 2. Probar todas las rutas

Con la API encendida, abre **otra terminal**, entra en la misma carpeta y ejecuta:

```bash
npm run probar:api
```

El resultado esperado es:

```text
Resultado: 33/33 comprobaciones aprobadas (43 solicitudes HTTP).
```

La prueba comprueba registro, login, perfil, roles, permisos, validaciones, renovación y cierre de sesión. Crea un usuario y un rol exclusivos de cada ejecución; el usuario termina sin roles. No muestra tokens ni hashes. Si falla, indica el paso y se detiene.

La prueba espera los permisos originales del preparcial: solamente `admin` administra usuarios y roles. Después de modificar permisos para un ejercicio, revisa también sus resultados esperados.

Si cambiaste el puerto de la API, puedes indicar la dirección:

```bash
API_URL=http://127.0.0.1:3001 npm run probar:api
```

## 3. Cuentas de demostración

Son cuentas públicas para esta práctica local.

| Email | Contraseña | Estado y rol |
|---|---|---|
| `admin@example.com` | `Admin2026!ParaPrueba` | Activo, `admin` |
| `estudiante.prueba@example.com` | `Estudio2026!Prueba` | Activo, `supervisor` |
| `desactivado@example.com` | `Inactivo2026!Prueba` | Desactivado, sin roles |

El supervisor puede consultar su propio perfil, pero todavía no administra usuarios ni roles.

## 4. Rutas obligatorias

| Método y ruta | Acceso | Resultado correcto |
|---|---|---|
| `POST /auth/register` | Público | `201`, mensaje y `userId` |
| `POST /auth/login` | Público | `200`, `accessToken`, `refreshToken`, `expiresIn` |
| `POST /auth/refresh` | Público, con refresh en el body | `200`, nuevo par de tokens |
| `POST /auth/logout` | Público, con refresh en el body | `204`, sin cuerpo |
| `POST /roles` | `admin` | `201`, mensaje y `roleId` |
| `GET /roles` | `admin` | `200`, lista de roles |
| `PATCH /users/:id/roles` | `admin` | `200`, `Roles asignados` |
| `GET /users/me` | Cualquier usuario autenticado | `200`, perfil propio |
| `GET /users` | `admin` | `200`, lista de usuarios |

Para las rutas protegidas envía la cabecera `Authorization: Bearer TU_ACCESS_TOKEN`.

Ejemplo de login, desde otra terminal:

```bash
curl -i -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"Admin2026!ParaPrueba"}'
```

Los access tokens duran 2 minutos. Para seguir enviando peticiones utiliza un token nuevo. Al renovar, el refresh anterior deja de servir: conserva el nuevo. Al reiniciar la API se pierden los refresh tokens en memoria y debes volver a iniciar sesión; los datos de PostgreSQL permanecen.

`logout` revoca los refresh tokens de esa sesión. El access token emitido puede seguir funcionando hasta su vencimiento.

`PATCH /users/:id/roles` recibe, por ejemplo, `{"roles":["supervisor"]}`. Reemplaza la lista completa; `{"roles":[]}` retira todas las asociaciones. Los nombres deben existir y coincidir exactamente.

## 5. PostgreSQL y archivos SQL

La conexión se toma de `.env`: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS` y `DB_NAME`. Con la configuración de ejemplo, PostgreSQL se publica en `127.0.0.1:5433`; la API usa el puerto `3000`.

| Archivo | Función |
|---|---|
| `migrations/001_crear_tablas.sql` | Crea `users`, `roles` y `users_roles`. |
| `migrations/002_crear_admin.sql` | Crea el rol y el usuario administrador, con contraseña hasheada. |
| `scripts/usuarios_roles_probados.sql` | Crea el supervisor y la cuenta desactivada utilizados en las pruebas. |

Los SQL ya vienen generados, con hashes scrypt reales. `npm run db:preparar` los ejecuta en ese orden cuando hacen falta. TypeORM tiene `synchronize: false`: la estructura se administra con SQL.

Si necesitas ejecutarlos manualmente **en una base vacía**, usa esta alternativa una sola vez, en orden:

```bash
docker compose exec -T db psql -U estudiante -d usuarios_roles -v ON_ERROR_STOP=1 < migrations/001_crear_tablas.sql
docker compose exec -T db psql -U estudiante -d usuarios_roles -v ON_ERROR_STOP=1 < migrations/002_crear_admin.sql
docker compose exec -T db psql -U estudiante -d usuarios_roles -v ON_ERROR_STOP=1 < scripts/usuarios_roles_probados.sql
```

Estas credenciales corresponden al `.env.example`. Si ya ejecutaste `npm run db:preparar`, los SQL ya están aplicados.

`scripts/crear-datos-demo.cjs` permite volver a generar los archivos SQL si faltan. No hace falta ejecutarlo para arrancar la entrega.

## 6. Revisar código y pruebas

```bash
npm run typecheck
npm run lint
npm run build
npm test -- --runInBand
npm run test:e2e -- --runInBand
```

Las pruebas unitarias (`npm test`) no necesitan PostgreSQL. La prueba de integración (`test:e2e`) utiliza la base configurada en `.env`, pero no necesita que `start:dev` esté abierto.

Si quieres arrancar el código compilado, ejecuta `npm run build` y después `npm run start:prod`.

Consulta [la explicación del código](docs/GUIA-CODIGO.md), [el registro de verificación](docs/VERIFICACION.md) y [el ejercicio de un nuevo rol](docs/EJERCICIO-ROL.md). Los comentarios de `src` explican las decisiones del programa; los scripts de preparación y pruebas ayudan a ejecutarlo.

## 7. Detener el proyecto

En la terminal que ejecuta Nest, presiona **Control + C**. Después, desde la carpeta del proyecto:

```bash
docker compose stop
```

Para volver a trabajar, ejecuta `docker compose up -d --wait` y `npm run start:dev`. No necesitas repetir las migraciones.

## 8. Entrega en GitHub

Sube el proyecto a un repositorio público, incluidos `src`, `migrations`, `scripts`, `docs`, `.env.example`, `compose.yaml`, los archivos de configuración y ambos archivos `package`. `.gitignore` excluye `.env`, `node_modules`, `dist` y los archivos temporales.

En VS Code, revisa los cambios, haz commit y publica/sincroniza el repositorio. En GitHub, crea un release con una etiqueta como `v1.0.0` y el título `Preparcial usuarios y roles`. El enlace que se entrega en BloqueNeón es el del repositorio público. El enunciado fija el release para el 24 de noviembre de 2026, antes de las 5:00 p. m., hora de Colombia.

El código y los SQL están incluidos en este proyecto. La publicación del repositorio, del release y del enlace en BloqueNeón se realiza desde tu cuenta.

## Referencias

- [Autenticación de NestJS](https://docs.nestjs.com/security/authentication)
- [Autorización de NestJS](https://docs.nestjs.com/security/authorization)
- [Integración de TypeORM en NestJS](https://docs.nestjs.com/data/typeorm)
