# Ejercicio: un auditor con permisos de consulta

## Objetivo

Añade un rol llamado `auditor` que pueda consultar todos los usuarios y el catálogo de roles, pero no crear roles ni asignarlos. `admin` debe conservar sus permisos actuales. La versión entregada todavía no implementa este ejercicio.

## Parte 1. Crear el rol

Usa una sesión de administrador y la ruta `POST /roles` para crear `auditor`. Confirma que aparece en el catálogo. Explica por qué crear este registro todavía no concede acceso a las consultas protegidas.

## Parte 2. Asignarlo

Registra otra cuenta con un correo de demostración. Utiliza el administrador y `PATCH /users/:id/roles` para dejarla únicamente con el rol `auditor`; conserva intacta la cuenta administradora. Comprueba el perfil de la nueva cuenta con su propio token.

Recuerda que la asignación reemplaza todos los roles anteriores. No concedas `admin` al auditor para superar las pruebas.

## Parte 3. Definir sus permisos

Revisa `src/users/users.policy.ts` y `src/roles/roles.policy.ts`. Modifica las reglas necesarias para cumplir la matriz, manteniendo la autenticación y la comprobación de permisos de las rutas. Conserva el comportamiento de `admin`, de `supervisor` y de los usuarios sin rol. No abras las consultas al público.

El ejercicio requiere que distingas tres tareas: crear el nombre del rol, asociarlo a una persona y definir las acciones que permite. No se incluye el código de la solución.

## Resultados esperados después del cambio

| Solicitud | Sin token | Sin roles | `supervisor` | `auditor` | `admin` |
|---|---:|---:|---:|---:|---:|
| `GET /users/me` | 401 | 200 | 200 | 200 | 200 |
| `GET /users` | 401 | 403 | 403 | 200 | 200 |
| `GET /roles` | 401 | 403 | 403 | 200 | 200 |
| `POST /roles` | 401 | 403 | 403 | 403 | 201 |
| `PATCH /users/:id/roles` | 401 | 403 | 403 | 403 | 200 |

La matriz supone cuentas activas, tokens vigentes, datos válidos y un usuario de destino existente. En la prueba de creación usa un nombre de rol nuevo para evitar un conflicto `409`.

## Qué debes demostrar

Entrega tus cambios en las policies y resultados de las cinco rutas usando el token del auditor. Comprueba también que el administrador conserva acceso, que una cuenta sin permisos recibe `403` y que una solicitud sin token recibe `401`. Explica por qué modificar solamente las tablas no resolvía el ejercicio.
