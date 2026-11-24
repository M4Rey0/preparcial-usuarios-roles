# Verificación de la entrega

Verificación ejecutada el 24 de noviembre de 2026 sobre el código de este ZIP.

## Entorno utilizado

- Node.js 24.22.3 y npm 11.19.1.
- NestJS y dependencias instaladas desde los archivos `package` del proyecto.
- PostgreSQL 16.16, ejecutado localmente para las pruebas.
- API en un puerto de prueba y configuración temporal; el ZIP conserva `3000` para la API y `5433` para PostgreSQL en `.env.example`.

Docker Desktop no está disponible en el entorno de verificación. Las pruebas se realizaron contra PostgreSQL real; `compose.yaml` mantiene la configuración del proyecto recibido para ejecutarlo en el Mac. La ejecución específica con Node 26 y Docker Desktop debe comprobarse en ese equipo con las instrucciones del README.

## Resultados

| Comprobación | Resultado |
|---|---|
| Instalación de dependencias y de `@nestjs/authorization` | Correcta |
| `npm run typecheck` | Sin errores de TypeScript |
| `npm run lint` | Sin errores |
| `npm run build` | Compilación correcta |
| `npm test -- --runInBand` | 3 suites, 7 pruebas aprobadas |
| `npm run test:e2e -- --runInBand` | 1 suite, 1 prueba aprobada |
| Preparación de una base vacía | Los tres archivos SQL se aplicaron correctamente |
| Segunda preparación de la misma base | Conservó las tablas y las cuentas de demostración |
| `npm run probar:api` | 33/33 comprobaciones aprobadas; 43 solicitudes HTTP |
| Contraseñas de los SQL | Los tres hashes se generaron y verificaron con `PasswordHasher` |

## Qué cubrió la prueba HTTP

- Registro correcto, correo duplicado, correo inválido y rechazo de un intento de autorregistro con rol `admin`.
- Login correcto, contraseña incorrecta y cuenta desactivada; `expiresIn` igual a 120.
- Perfil protegido y perfil propio con los datos esperados.
- Acceso administrativo a los listados; rechazo `403` en las cuatro rutas administrativas tanto para un usuario sin roles como para el supervisor.
- Creación de rol, nombre duplicado y nombre faltante.
- Asignación de dos roles, lectura de los roles nuevos con el mismo JWT y rechazo de un rol inexistente sin guardar cambios parciales.
- Rechazo de roles repetidos, usuario inexistente y UUID mal formado.
- Eliminación de asociaciones mediante `roles: []`.
- Renovación de tokens, uso del nuevo access token y rechazo del refresh anterior.
- Rechazo de refresh ausente o inválido, logout `204` y rechazo del refresh revocado.
- Ausencia de campos de contraseña o hash en las respuestas JSON inspeccionadas.

Al terminar quedaron 4 usuarios, 3 roles y 2 asociaciones en la base de prueba. La prueba automática había añadido un usuario y un rol propios; las tres cuentas de demostración conservaron sus datos.

## Alcance

Es una verificación funcional del preparcial, no una prueba de carga. No se esperaron dos minutos para medir el vencimiento ni siete días para agotar un refresh: se comprobó la configuración y el `expiresIn` de la respuesta. Tampoco se simularon averías de PostgreSQL para provocar los errores `500` de los listados.

Los avisos de dependencias de desarrollo no se corrigieron mediante actualizaciones forzadas. La entrega conserva las herramientas del proyecto recibido y agrega el paquete de autorización necesario.
