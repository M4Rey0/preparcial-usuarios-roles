# Guía de examen — Usuarios, roles y permisos (NestJS)

Guía para el proyecto **`preparcial-usuarios-roles`**. Está basada en los archivos reales del proyecto: `migrations/001_crear_tablas.sql`, `migrations/002_crear_admin.sql`, `scripts/usuarios_roles_probados.sql`, `src/users/users.policy.ts`, `src/roles/roles.policy.ts`, los controladores y los DTO.

> **Regla de oro:** una **Entity** define una tabla; un **rol** es un registro dentro de `roles`; una **Policy** determina qué acciones autoriza ese rol. Crear un rol por sí solo **no crea permisos**.
>
> Todos los comandos siguientes, salvo que diga otra cosa, se ejecutan en una terminal ubicada en la carpeta del proyecto.

```bash
cd ~/Desktop/preparcial-usuarios-roles
```

## 1. Dejar la base completamente limpia: solo el rol y usuario admin

**ATENCIÓN: ESTO BORRA PARA SIEMPRE TODOS LOS DATOS DE LA BASE LOCAL DE ESTE PROYECTO** (usuarios creados, asignaciones, `auditor`, `supervisor`, etc.). **No lo uses si deseas conservar esos datos.** No modifica tus archivos de código ni el `.env`. Comprueba que estás en la carpeta correcta.

1. Detén NestJS con **Control + C** en la terminal donde corre `npm run start:dev`.
2. Con Docker Desktop abierto, ejecuta:

```bash
# En preparcial-usuarios-roles (donde está compose.yaml)
docker compose down -v
```

La opción **`-v` borra el volumen PostgreSQL** de este proyecto. NO uses `-v` para apagar una base que quieras conservar.

3. Arranca PostgreSQL vacío:

```bash
docker compose up -d --wait
```

4. Aplica **solo** estas dos migraciones, en este orden:

```bash
docker compose exec -T db psql -U estudiante -d usuarios_roles -v ON_ERROR_STOP=1 < migrations/001_crear_tablas.sql
```

```bash
docker compose exec -T db psql -U estudiante -d usuarios_roles -v ON_ERROR_STOP=1 < migrations/002_crear_admin.sql
```

5. Comprueba que hay **solo `admin` como rol**:

```bash
docker compose exec db psql -U estudiante -d usuarios_roles -c "SELECT id, role_name FROM roles ORDER BY role_name;"
```

6. Comprueba que hay **solo un usuario (admin)**:

```bash
docker compose exec db psql -U estudiante -d usuarios_roles -c "SELECT id, email, is_active FROM users ORDER BY email;"
```

7. Arranca NestJS:

```bash
npm run start:dev
```

> **IMPORTANTE:** Después de esta limpieza **NO ejecutes `npm run db:preparar` si quieres conservar únicamente `admin`**, porque ese script también carga `supervisor`, `estudiante.prueba@example.com` y `desactivado@example.com`. Tampoco ejecutes automáticamente `npm run probar:api` suponiendo la base con solo admin: sus pruebas fueron diseñadas para la preparación completa. Si quieres volver a tener las cuentas de demostración, sí puedes usar `npm run db:preparar`.

**Credencial conocida del admin después de esta limpieza:**

- Correo: `admin@example.com`
- Contraseña de demostración: `Admin2026!ParaPrueba`

Esta clave es **solo para pruebas locales**. No la utilices en una aplicación real o expuesta públicamente.

---

## 2. Arranque normal en los siguientes días (SIN borrar datos)

**Terminal A** (abre Docker Desktop antes):

```bash
cd ~/Desktop/preparcial-usuarios-roles
docker compose up -d --wait
npm run start:dev
```

**Terminal B** (para las llamadas HTTP):

```bash
cd ~/Desktop/preparcial-usuarios-roles
```

- NestJS: `http://localhost:3000/`
- **No necesitas abrir la carpeta `src` para ejecutar los comandos.**
- Para detener: Control + C para Nest y `docker compose stop` para PostgreSQL. `stop` conserva los datos.

---

## 3. Iniciar sesión como admin y guardar el token en la terminal

En **Terminal B**, copia el bloque completo:

```bash
ADMIN_TOKEN=$(curl -fsS -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"Admin2026!ParaPrueba"}' \
  | node -p "JSON.parse(require('fs').readFileSync(0, 'utf8')).accessToken")
```

Comprueba que se guardó (sin mostrar ni copiar el token completo):

```bash
test -n "$ADMIN_TOKEN" && echo 'Token admin guardado'
```

**Dura 2 minutos.** Si empiezas a obtener `401`, vuelve a ejecutar el bloque del login. Una variable guardada en Terminal B no aparece automáticamente en otra terminal.

Comprobar permiso de admin:

```bash
curl -i http://localhost:3000/roles -H "Authorization: Bearer $ADMIN_TOKEN"
```

Esperado: **200** y lista de roles.

---

## 4. Crear un usuario normal: `POST /auth/register`

La ruta es pública: **no necesitas token**. Cambia correo y contraseña para nuevos ejemplos.

```bash
curl -i -X POST http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"alumno@example.com","password":"Alumno2026!","name":"Alumno de prueba"}'
```

Esperado: **201** con `userId`. **Guarda el UUID** que devuelve.

Para guardar su ID en una variable (reemplaza el texto por el UUID verdadero):

```bash
USER_ID='PEGA_AQUI_EL_USER_ID'
```

**Nota:** registrar una persona NO le asigna roles. El usuario recién registrado puede usar `GET /users/me`, pero no administrar usuarios ni roles.

---

## 5. Crear roles: `POST /roles`

**Requiere el token del admin.** Cada ejemplo se ejecuta una sola vez; si repites el mismo nombre responderá **409** (rol duplicado).

### Crear `estudiante`

```bash
curl -i -X POST http://localhost:3000/roles \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"role_name":"estudiante","description":"Usuario estudiante"}'
```

### Crear `auditor`

```bash
curl -i -X POST http://localhost:3000/roles \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"role_name":"auditor","description":"Puede consultar datos autorizados"}'
```

### Crear `supervisor`

```bash
curl -i -X POST http://localhost:3000/roles \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"role_name":"supervisor","description":"Rol para pruebas"}'
```

Esperado para cada nuevo rol: **201**. Las letras de los nombres importan: usamos `auditor` en minúsculas en todo el ejercicio; `Auditor` sería un nombre diferente.

### Consultar roles: `GET /roles`

```bash
curl -i http://localhost:3000/roles -H "Authorization: Bearer $ADMIN_TOKEN"
```

Esperado **200** con `admin`, `estudiante`, `auditor` y `supervisor` (si los creaste).

---

## 6. Asignar rol a un usuario: `PATCH /users/:id/roles`

Usa **el `USER_ID` verdadero** del registro. La asignación requiere `admin`.

### Asignar un rol

```bash
curl -i -X PATCH "http://localhost:3000/users/$USER_ID/roles" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"roles":["estudiante"]}'
```

Esperado: **200** con `{"message":"Roles asignados"}`.

### Reemplazar por auditor

```bash
curl -i -X PATCH "http://localhost:3000/users/$USER_ID/roles" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"roles":["auditor"]}'
```

### Asignar dos roles a la misma persona

```bash
curl -i -X PATCH "http://localhost:3000/users/$USER_ID/roles" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"roles":["estudiante","auditor"]}'
```

### Quitar todos los roles

```bash
curl -i -X PATCH "http://localhost:3000/users/$USER_ID/roles" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"roles":[]}'
```

> **MUY IMPORTANTE:** `PATCH /users/:id/roles` **REEMPLAZA toda la lista de roles**, no agrega automáticamente los nuevos a los anteriores. Si el usuario tenía `estudiante` y envías `{"roles":["auditor"]}`, ya no tendrá `estudiante`.

---

## 7. Ver los usuarios, sus roles y sus claves (lo que SÍ y NO puedes ver)

### Desde la API (admin)

```bash
curl -i http://localhost:3000/users -H "Authorization: Bearer $ADMIN_TOKEN"
```

Devuelve UUID, correo, nombre y roles. **No incluye el campo `password` por seguridad**.

### Desde PostgreSQL: listado completo de usuarios con roles

```bash
docker compose exec db psql -U estudiante -d usuarios_roles -c "SELECT u.id, u.email, u.name, u.is_active, COALESCE(string_agg(r.role_name, ', ' ORDER BY r.role_name), '(sin rol)') AS roles FROM users u LEFT JOIN users_roles ur ON ur.user_id=u.id LEFT JOIN roles r ON r.id=ur.role_id GROUP BY u.id, u.email, u.name, u.is_active ORDER BY u.email;"
```

### Desde PostgreSQL: listar nombres de roles

```bash
docker compose exec db psql -U estudiante -d usuarios_roles -c "SELECT role_name, description FROM roles ORDER BY role_name;"
```

### Desde PostgreSQL: ver el *hash* almacenado, NO la contraseña original

```bash
docker compose exec db psql -U estudiante -d usuarios_roles -c "SELECT email, LEFT(password, 30) || '...' AS hash_parcial FROM users ORDER BY email;"
```

**No existe un comando para recuperar una contraseña en texto plano a partir del hash**. El sistema la guarda así deliberadamente. Si no recuerdas una contraseña de un usuario de prueba, puedes crear otro usuario o implementar una recuperación/cambio de contraseña.

**Contraseñas documentadas de las cuentas de demostración (solo si fueron creadas):**

| Correo | Contraseña conocida de demostración |
|---|---|
| `admin@example.com` | `Admin2026!ParaPrueba` |
| `estudiante.prueba@example.com` | `Estudio2026!Prueba` |
| `desactivado@example.com` | `Inactivo2026!Prueba` |
| `alumno@example.com` (creado siguiendo esta guía) | `Alumno2026!` |

**Después de la limpieza de la sección 1, de estas cuentas solo existe el administrador.** Las otras existen únicamente si las registras o ejecutas el cargador de datos de demostración.

---

## 8. Iniciar sesión como usuario normal y comprobar su perfil

Para el usuario del ejemplo:

```bash
USER_TOKEN=$(curl -fsS -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"alumno@example.com","password":"Alumno2026!"}' \
  | node -p "JSON.parse(require('fs').readFileSync(0, 'utf8')).accessToken")
```

```bash
curl -i http://localhost:3000/users/me -H "Authorization: Bearer $USER_TOKEN"
```

Esperado: **200** con su `id`, `email`, `name`, `phone` y los roles actuales.

Intentar listar usuarios si el usuario **no tiene el permiso**:

```bash
curl -i http://localhost:3000/users -H "Authorization: Bearer $USER_TOKEN"
```

Esperado: **403**, siempre que las Policies no lo autoricen.

---

## 9. Dar permisos a `auditor` (CAMBIO EN EL CÓDIGO)

**Crear el rol en la tabla NO concede permisos por sí solo.** La autorización está definida en dos archivos del proyecto:

- `src/users/users.policy.ts`
- `src/roles/roles.policy.ts`

Los controladores llaman a las Policies con `@Can(UsersPolicy, 'list')`, `@Can(UsersPolicy, 'assignRoles')`, `@Can(RolesPolicy, 'list')` o `@Can(RolesPolicy, 'create')`.

### Ejercicio: `auditor` puede VER usuarios y roles, pero NO crear ni asignar

En **`src/users/users.policy.ts`**, modifica solamente `list()` para que quede:

```ts
list(user: User | null): boolean {
  return user?.roles?.some((role) => role.role_name === 'auditor') ?? false;
}
```

No cambies `assignRoles()`: debe seguir devolviendo `false` para los no administradores.

En **`src/roles/roles.policy.ts`**, modifica solamente `list()`:

```ts
list(user: User | null): boolean {
  return user?.roles?.some((role) => role.role_name === 'auditor') ?? false;
}
```

No cambies `create()`: debe continuar devolviendo `false` para usuarios sin `admin`.

**Conserva el método `before()` original en ambas Policies.** Ese método permite todos los permisos a quien tiene `admin`.

Luego inicia sesión de nuevo como `alumno@example.com` para renovar el token y prueba:

| Operación usando token del auditor | Código esperado |
|---|---|
| `GET /users/me` | 200 |
| `GET /users` | 200 |
| `GET /roles` | 200 |
| `POST /roles` | 403 |
| `PATCH /users/:id/roles` | 403 |

Si el servidor está en modo `start:dev`, recarga los cambios automáticamente. **Recuerda que el token vence a los dos minutos**: ante un `401` genera otro token antes de sospechar de la Policy.

Para dar esos mismos permisos también al rol `supervisor`, cambia la condición por:

```ts
return user?.roles?.some((role) =>
  ['auditor', 'supervisor'].includes(role.role_name)
) ?? false;
```

**Recomendación para el examen:** mira las rutas del enunciado, encuentra el `@Can(...)` en el controller y cambia solo el método correspondiente de la Policy. No modifiques entidades ni migraciones para agregar un permiso a un rol existente.

---

## 10. Errores y respuestas HTTP que conviene recordar

| Respuesta | Significado |
|---|---|
| `200` | Consulta, asignación o inicio de sesión exitoso |
| `201` | Usuario o rol creado |
| `204` | Logout exitoso, sin contenido |
| `400` | Datos inválidos o roles no existentes |
| `401` | Token faltante, vencido o inválido / credenciales incorrectas en login |
| `403` | Token válido, pero la Policy no permite esa acción |
| `409` | Correo o nombre de rol repetido |
| `423` | Usuario desactivado al iniciar sesión |

## 11. Guardar o retirar el ejercicio

- Para conservar el ejercicio en el código, haz commit de los cambios en las Policies.
- Para volver **solo a los permisos originales**, restaura los métodos `list()` de ambas Policies a `return false;` (manteniendo `before()` como está).
- Para dejar **también la base totalmente limpia de práctica**, repite la sección 1. Esto borra los roles y usuarios creados, pero **no modifica automáticamente los archivos `.ts` de las Policies**.
- **No vuelvas a ejecutar `npm run db:preparar` si el objetivo es quedarse solo con `admin`**, porque cargará nuevamente supervisor y cuentas de prueba.

La base de datos se consulta en tu propio computador; no es un sitio web externo. No compartas `.env`, access tokens, refresh tokens ni hashes completos. En un sistema real cambiarías las credenciales de demostración antes de publicarlo.
