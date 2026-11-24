# Cómo entender este proyecto

Esta API gestiona usuarios y roles en PostgreSQL y responde en JSON. Una ruta es una dirección, como `/users`; el método indica la operación: `GET` consulta, `POST` crea o inicia una acción y `PATCH` modifica.

**Autenticación** significa comprobar quién eres. Aquí se hace con una contraseña al iniciar sesión y con un token en las consultas posteriores. **Autorización** significa decidir qué puedes hacer. Tener una sesión válida permite consultar tu perfil, pero no convierte tu cuenta en administradora.

## Mapa de archivos y conceptos

Los archivos se ubican desde la carpeta principal.

| Archivo o carpeta | Para qué sirve |
|---|---|
| `src/main.ts` | Arranca el servidor y activa la validación de los datos recibidos. |
| `src/app.module.ts` | El **module** reúne las piezas: conexión a PostgreSQL, configuración, controladores y servicios. |
| `src/auth/auth.controller.ts` | Un **controller** conecta una ruta con una operación. Este recibe registro, login, renovación y logout. |
| `src/auth/auth.service.ts` | Un **service** realiza el trabajo: guardar usuarios, comprobar contraseñas y pedir tokens. |
| `src/auth/dto/` | Un **DTO** describe los campos aceptados y sus reglas, como email válido y longitud de contraseña. |
| `src/auth/jwt-auth.provider.ts` | Identifica al usuario del token y carga sus roles actuales desde PostgreSQL. |
| `src/users/user.entity.ts`, `src/roles/role.entity.ts` | Una **entity** representa una tabla y describe sus columnas y relaciones. |
| `src/users/`, `src/roles/` | Sus controladores reciben solicitudes; sus servicios consultan o modifican usuarios y roles. |
| `src/users/users.policy.ts`, `src/roles/roles.policy.ts` | Una **policy** contiene las reglas que permiten o rechazan una acción. |
| `migrations/` | Los SQL crean las tablas y el administrador inicial. |
| `scripts/usuarios_roles_probados.sql` | Añade las cuentas de estudiante y desactivado, y el rol `supervisor`. |
| `src/**/*.spec.ts`, `test/app.e2e-spec.ts` | Contienen comprobaciones automáticas de reglas y respuestas de la API. |

**TypeORM** permite consultar tablas mediante objetos de TypeScript. Sus repositorios permiten buscar y guardar. Las tablas se crean mediante SQL: `synchronize: false` impide que TypeORM cambie automáticamente su estructura.

## Qué pasa al registrarse e iniciar sesión

En `POST /auth/register`, el DTO comprueba los campos antes de ejecutar el controlador. El servicio normaliza el email, genera el hash de la contraseña y guarda una cuenta activa sin roles. Los campos adicionales, como intentar enviar `roles`, se rechazan.

**Scrypt** transforma la contraseña en un hash: un resultado que permite comprobarla después sin guardar el texto original. `PasswordHasher` lo genera y verifica. El registro devuelve el identificador del usuario.

En `POST /auth/login`, el servicio busca el email y comprueba la contraseña. Si son correctos y la cuenta está activa, entrega dos credenciales: `accessToken` y `refreshToken`.

El **JWT** usado como access token es un texto firmado que contiene información como el identificador del usuario y la fecha de vencimiento. La firma permite detectar cambios; no cifra su contenido. En la configuración entregada dura **2 minutos** desde su emisión.

## Cómo funciona una ruta protegida

Envía el access token en la cabecera `Authorization: Bearer TU_ACCESS_TOKEN`. Para una consulta como `GET /users`, sucede lo siguiente:

1. El paquete de autenticación verifica firma y vencimiento del JWT.
2. `JwtAuthProvider` busca al usuario activo y sus roles actuales en PostgreSQL.
3. La autorización consulta la policy indicada por `@Can`.
4. Si se permite la acción, se validan sus parámetros y datos, cuando los tiene; después trabajan el controlador y el servicio.
5. La API devuelve los campos públicos, sin el hash de contraseña.

`GET /users/me` permite consultar el perfil propio a cualquier usuario autenticado. Su `@Can.Anyone()` permite esa acción, pero sigue siendo necesario un token válido.

## Roles y permisos

Guardar un rol en `roles` solo crea su nombre. Asociarlo a un usuario en `users_roles` tampoco define por sí mismo qué acciones permite. **Las policies establecen los permisos.** Actualmente `admin` puede listar usuarios, crear y listar roles y asignarlos. `supervisor` todavía no tiene esos permisos especiales.

`PATCH /users/:id/roles` **reemplaza la lista completa**. Enviar `{"roles":["supervisor"]}` deja únicamente ese rol; `{"roles":[]}` los elimina todos. Los nombres deben existir y coincidir exactamente. Las siguientes solicitudes leen los roles actualizados, aunque uses el mismo JWT vigente.

## Renovación y cierre de sesión

El **refresh token** permite solicitar otro par de tokens mediante `POST /auth/refresh`. Se consume el anterior: conserva el nuevo. Su registro está en la memoria de la API y se pierde al reiniciarla; entonces debes iniciar sesión otra vez. Los usuarios de PostgreSQL permanecen.

`POST /auth/logout` revoca los refresh tokens de esa sesión y responde `204`, sin cuerpo. **No anula inmediatamente un access token emitido**: puede seguir funcionando hasta su vencimiento, como máximo los 2 minutos configurados desde su emisión.

## Cómo interpretar los errores

| Código | Significado en esta API |
|---|---|
| `400` | Datos inválidos: campos incorrectos, UUID mal formado o nombres de roles inexistentes. |
| `401` | No se pudo autenticar: credenciales incorrectas, token ausente, inválido o vencido, o refresh rechazado. |
| `403` | Usuario autenticado sin permiso para esa acción. |
| `404` | El usuario al que intentas asignar roles no existe. |
| `409` | El email o el nombre del rol ya está registrado. |
| `423` | Contraseña correcta al iniciar sesión, pero cuenta desactivada. |

Las credenciales de demostración son públicas y sirven para la práctica local. La preparación y las cuentas están explicadas en el README principal.

Documentación oficial: [autenticación](https://docs.nestjs.com/security/authentication), [autorización](https://docs.nestjs.com/security/authorization), [hash de contraseñas](https://docs.nestjs.com/security/encryption-and-hashing) y [TypeORM](https://docs.nestjs.com/data/typeorm).
