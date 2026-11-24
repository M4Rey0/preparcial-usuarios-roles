# Guía de consulta — Roles, usuarios y permisos (NestJS)

Esta guía corresponde a la **versión original del preparcial** que incluye únicamente `admin` como rol inicial. El proyecto usa `@nestjs/authentication` y `@nestjs/authorization`, **sin Passport**.

**Tres conceptos que no debes confundir:**

- **Entidad:** clase TypeORM que representa una tabla; por ejemplo, `User` y `Role`.
- **Rol:** fila de la tabla `roles` (por ejemplo `admin`, `estudiante`, `auditor`, `supervisor`). Crear el rol **NO crea una entidad nueva**.
- **Permiso:** regla escrita en una *Policy*. Crear o asignar un rol **no concede por sí solo acceso** a rutas restringidas.

## 1. Roles iniciales y matriz de permisos

Después de preparar una base vacía, **solo existen el rol `admin` y el usuario `admin@example.com`**. Los roles `estudiante`, `auditor` y `supervisor` NO se crean automáticamente: son ejemplos para que practiques.

| Ruta | Sin token | Usuario autenticado sin `admin` | `admin` |
|---|---|---|---|
| `POST /auth/register` | Sí | Sí | Sí |
| `POST /auth/login` | Sí | Sí | Sí |
| `POST /auth/refresh` | Con refreshToken válido | Con refreshToken válido | Con refreshToken válido |
| `POST /auth/logout` | Con refreshToken válido | Con refreshToken válido | Con refreshToken válido |
| `GET /users/me` | 401 | 200 | 200 |
| `GET /users` | 401 | 403 | 200 |
| `GET /roles` | 401 | 403 | 200 |
| `POST /roles` | 401 | 403 | 201 si el body es válido |
| `PATCH /users/:id/roles` | 401 | 403 | 200 si el body e ID son válidos |

- **401:** no hay un access token válido.
- **403:** sí hay usuario autenticado, pero su rol no le concede esa acción.
- **201:** se creó un recurso. **204:** logout sin contenido.

El administrador pasa las comprobaciones mediante el método `before()` en ambas Policies. Cualquier rol que crees después, **sin modificar las Policies**, solo podrá consultar su propio perfil.

## 2. ¿Cómo se inicia sesión como admin o como otro rol?

**No se inicia sesión en un rol. Se inicia sesión con la cuenta de un usuario y esa cuenta puede tener uno o varios roles.** Los roles se consultan en PostgreSQL cuando llega una petición protegida.

Con Docker Desktop abierto, y desde la carpeta que contiene `package.json`:

```bash
npm ci
npm run preparar:env
docker compose up -d --wait
npm run db:preparar
npm run start:dev
```

Abre **otra terminal** en esa misma carpeta para las peticiones `curl`.

Cuenta inicial de la **demostración local**:

| Usuario | Contraseña de práctica | Rol |
|---|---|---|
| `admin@example.com` | `Admin2026!ParaPrueba` | `admin` |

Para iniciar sesión como admin y guardar automáticamente el token en la terminal:

```bash
ADMIN_TOKEN=$(curl -fsS -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"Admin2026!ParaPrueba"}' \
  | node -p "JSON.parse(require('fs').readFileSync(0, 'utf8')).accessToken")
```

Comprueba el token sin imprimirlo:

```bash
test -n "$ADMIN_TOKEN" && echo 'Token del admin guardado'
```

**Dura dos minutos.** Si recibes 401 por caducidad, repite el login y guarda un token nuevo. El token se guarda únicamente en esa terminal.

Comprueba los permisos del admin:

```bash
curl -i http://localhost:3000/users -H "Authorization: Bearer $ADMIN_TOKEN"
```

El usuario del rol `auditor` (o cualquier otro rol) **debe registrarse y recibir el rol** antes de que pueda iniciar sesión con ese rol.

## 3. ¿Cómo se crea un usuario?

El registro es público y **no asigna roles**:

```bash
curl -i -X POST http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"alumno@example.com","password":"Alumno2026!","name":"Alumno de prueba"}'
```

Resultado esperado: `201` y `userId` (identificador UUID). Copia el ID real:

```bash
USER_ID='PEGA_AQUI_EL_UUID_DEVUELTO'
```

Comprueba que el usuario está activo e inicia sesión:

```bash
ALUMNO_TOKEN=$(curl -fsS -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"alumno@example.com","password":"Alumno2026!"}' \
  | node -p "JSON.parse(require('fs').readFileSync(0, 'utf8')).accessToken")

curl -i http://localhost:3000/users/me -H "Authorization: Bearer $ALUMNO_TOKEN"
```

El campo `roles` debe ser un arreglo vacío (`[]`) antes de asignarle roles.

## 4. ¿Cómo se crea un rol nuevo?

**La operación requiere iniciar sesión como admin.** Si el token expiró, repite el comando del apartado 2.

Ejemplo para crear el rol `estudiante`:

```bash
curl -i -X POST http://localhost:3000/roles \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"role_name":"estudiante","description":"Rol para estudiantes"}'
```

También puedes crear `auditor`:

```bash
curl -i -X POST http://localhost:3000/roles \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"role_name":"auditor","description":"Consulta datos autorizados"}'
```

Y `supervisor`:

```bash
curl -i -X POST http://localhost:3000/roles \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"role_name":"supervisor","description":"Supervisa acciones autorizadas"}'
```

**201:** rol nuevo creado. **409:** ya había un rol con ese nombre. **400:** cuerpo inválido. Los nombres son sensibles a mayúsculas: `Auditor` y `auditor` se consideran distintos.

Listar roles:

```bash
curl -i http://localhost:3000/roles -H "Authorization: Bearer $ADMIN_TOKEN"
```

## 5. ¿Cómo se asigna un rol a un usuario?

**Solo `admin` puede asignar roles** en la versión original.

Copia el UUID devuelto por el registro:

```bash
USER_ID='PEGA_AQUI_EL_UUID_DEVUELTO'
```

Asignar el rol `estudiante`:

```bash
curl -i -X PATCH "http://localhost:3000/users/$USER_ID/roles" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"roles":["estudiante"]}'
```

Cambiarlo por `auditor`:

```bash
curl -i -X PATCH "http://localhost:3000/users/$USER_ID/roles" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"roles":["auditor"]}'
```

Asignar **dos** roles:

```bash
curl -i -X PATCH "http://localhost:3000/users/$USER_ID/roles" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"roles":["estudiante","auditor"]}'
```

Quitar todos los roles:

```bash
curl -i -X PATCH "http://localhost:3000/users/$USER_ID/roles" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"roles":[]}'
```

**IMPORTANTE:** `PATCH /users/:id/roles` **reemplaza toda la lista de roles**. No añade a la lista anterior de forma automática. Si se envía `['auditor']`, se retira cualquier rol que antes tuviera y no figure en la nueva lista.

Para ver que realmente tiene el rol, **inicia sesión con el correo y contraseña de ese usuario** (no con los del admin), o consulta su perfil con el token de antes:

```bash
curl -i http://localhost:3000/users/me -H "Authorization: Bearer $ALUMNO_TOKEN"
```

Los roles asignados se consultan en la base de datos, por lo que el perfil debería reflejar cambios incluso con un token anterior que aún esté vigente.

## 6. ¿Cómo se le dan permisos al rol? (Policies)

**No existe una tabla de permisos en este preparcial.** Los roles se guardan en PostgreSQL, pero **sus capacidades se programan** en las Policies:

- `src/users/users.policy.ts` — protege `GET /users` y `PATCH /users/:id/roles`.
- `src/roles/roles.policy.ts` — protege `GET /roles` y `POST /roles`.

Los controladores usan `@Can(UsersPolicy, 'list')`, `@Can(UsersPolicy, 'assignRoles')`, `@Can(RolesPolicy, 'list')` y `@Can(RolesPolicy, 'create')`. Esos nombres deben coincidir con los métodos de cada Policy.

En la versión original, ambos `before()` contienen la condición:

```typescript
if (user?.roles?.some((role) => role.role_name === 'admin')) {
  return true;
}
return undefined;
```

Eso concede todos los permisos de las Policies al admin, aunque los demás métodos retornen `false`.

**Ejercicio: permitir que `auditor` solo consulte usuarios y roles**, sin crear ni asignar:

En `src/users/users.policy.ts`, cambia **únicamente** el método `list`:

```typescript
list(user: User | null): boolean {
  return user?.roles?.some((rol) => rol.role_name === 'auditor') ?? false;
}
```

Deja intacto `assignRoles()`:

```typescript
assignRoles(_user: User | null): boolean {
  return false;
}
```

En `src/roles/roles.policy.ts`, cambia **únicamente** el método `list`:

```typescript
list(user: User | null): boolean {
  return user?.roles?.some((rol) => rol.role_name === 'auditor') ?? false;
}
```

Deja `create()` así:

```typescript
create(_user: User | null): boolean {
  return false;
}
```

**No cambies `before()`.** El admin debe mantener sus permisos.

La matriz resultante para `auditor` sería:

| Ruta | `auditor` después de modificar las dos Policies |
|---|---|
| `GET /users/me` | 200 |
| `GET /users` | 200 |
| `GET /roles` | 200 |
| `POST /roles` | 403 |
| `PATCH /users/:id/roles` | 403 |

Luego guarda y deja que `npm run start:dev` recargue. Inicia sesión como el usuario auditor y prueba esas cinco peticiones con **su token**, no con el del admin.

**Para otros ejercicios:** cambia `role_name === 'auditor'` por el rol y método solicitados. Si quieres permitir `auditor` *y* `supervisor`, compara ambos nombres, por ejemplo `['auditor', 'supervisor'].includes(rol.role_name)`.

## 7. ¿Cómo consultar los usuarios, roles y contraseñas?

**Desde la API (admin):**

```bash
curl -i http://localhost:3000/users -H "Authorization: Bearer $ADMIN_TOKEN"
curl -i http://localhost:3000/roles -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Desde PostgreSQL:** estos comandos se ejecutan en la carpeta donde está `compose.yaml`.

```bash
docker compose exec db psql -U estudiante -d usuarios_roles -c \
"SELECT u.id,u.email,u.is_active,COALESCE(string_agg(r.role_name, ', ' ORDER BY r.role_name),'Sin roles') AS roles FROM users u LEFT JOIN users_roles ur ON ur.user_id=u.id LEFT JOIN roles r ON r.id=ur.role_id GROUP BY u.id,u.email,u.is_active ORDER BY u.email;"
```

```bash
docker compose exec db psql -U estudiante -d usuarios_roles -c \
"SELECT role_name, description FROM roles ORDER BY role_name;"
```

**Las contraseñas originales NO se pueden consultar**: la tabla `users.password` guarda hashes scrypt, no contraseñas en texto. El admin inicial usa la clave de demostración documentada arriba. Los demás usuarios usan las claves que estableciste al registrarlos. **Nunca devuelvas el campo `password` desde `/users` ni `/users/me`.**

## 8. Pruebas para distinguir autenticación y permisos

| Situación | Código esperado |
|---|---|
| Sin token al consultar `GET /users` | 401 |
| Usuario normal con token válido al consultar `GET /users` | 403 |
| Admin con token válido al consultar `GET /users` | 200 |
| Crear un rol nuevo como admin | 201 |
| Repetir el nombre del rol | 409 |
| UUID de usuario inexistente en asignación | 404 |
| Registrar email inválido | 400 |
| Cerrar sesión con refresh válido | 204 |

Si recibes 401 inesperadamente, recuerda que el `accessToken` dura **2 minutos** y debes volver a iniciar sesión. Los refresh tokens duran 7 días, pero se guardan en memoria y desaparecen al reiniciar NestJS.

## 9. Volver al estado inicial: solo admin

**Advertencia: el siguiente procedimiento BORRA todos los usuarios, roles y asignaciones que hayas creado en esa base local. No lo hagas si quieres conservar los datos de práctica.**

Detén NestJS con **Control + C**. Después, en la raíz del proyecto:

```bash
docker compose down -v
docker compose up -d --wait
npm run db:preparar
```

**En esta versión final, `db:preparar` crea solamente el rol y usuario admin.** No añade cuentas de demostración extra.

La base se reinicia, **pero el código de las Policies NO se restaura automáticamente**. Si habías modificado permisos en el ejercicio, revierte únicamente esos archivos a la versión original o vuelve a descargar la versión inicial.

El script de prueba `scripts/usuarios_roles_probados.sql` usa una transacción con `ROLLBACK`: permite verificar usuarios y roles en SQL **sin conservar** el usuario de prueba. En cambio `npm run probar:api` crea un usuario y un rol de prueba que permanecen en la base; úsalo solo cuando quieras hacer esa verificación y no necesites tener inmediatamente solo el admin.

## 10. Nota para entrega

Los archivos `.env` y las claves JWT **no se publican**. El repositorio debe contener `.env.example`, las migraciones SQL y `scripts/usuarios_roles_probados.sql`. Esta guía es de apoyo para estudiar, no añade rutas ni requisitos al preparcial.
