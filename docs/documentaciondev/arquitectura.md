# Arquitectura de la base 001

**Estado:** Implementada; documentación pendiente de revisión humana.
**Fecha:** 2026-10-13. Resultados y límites en la [validación](../../especificaciones/001-base-verificable/validacion.md).

El backend es un monolito modular Spring Boot 4.0.8 con Java 21.
001 contiene exclusivamente comprobación técnica; no hay entidades, CRUD,
usuarios, autenticación funcional ni módulos de negocio vacíos.

## Responsabilidades

| Ruta | Responsabilidad |
|---|---|
| `backend/src/main/java/es/gestionsolicitudes/salud/http` | Entrada GET y DTO público. |
| `salud/aplicacion` | Estado público y puerto de comprobación de la dependencia. |
| `salud/persistencia` | Consulta constante SELECT 1 mediante JDBC y cierre de recursos. |
| `configuracion` | Seguridad, contrato OpenAPI y errores controlados. |
| `frontend/src/app/inicio` | Servicio HTTP y pantalla con carga, disponibilidad y error. |
| `frontend/src/app/navegacion` | Salida controlada para direcciones desconocidas. |
| `infraestructura` | Compose y preparación administrativa de PostgreSQL. |
| `qa` | Inventario de preliminares, auditoría offline, QA de Compose y evidencias. |

El controlador depende del servicio, que utiliza un puerto implementado por JDBC.
Los detalles SQL, conexiones y mensajes del driver no llegan al DTO HTTP.
No se necesita una capa de dominio sin reglas en este incremento.

## Contrato y límites

`GET /api/salud` devuelve exactamente `{"estado":"DISPONIBLE"}` con 200,
o `{"estado":"NO_DISPONIBLE"}` con 503 si PostgreSQL falla.
No recibe un cuerpo de entrada ni acredita funciones de negocio.
Un fallo inesperado se traduce a `{"error":"ERROR_INTERNO"}` con 500.
La denegación técnica devuelve 403 y `{"error":"ACCESO_NO_PERMITIDO"}`.

Hikari limita espera de conexión a 2 s, validación a 1 s y pool a 5 conexiones.
JDBC limita conexión/socket a 3 s y consulta a 2 s. Son límites de operaciones
individuales, no una promesa de latencia máxima universal.
Angular cancela una consulta sin respuesta tras 6 s y muestra un error controlado.
La caída real medida en Compose devolvió 503 en 2016 ms; no es un benchmark.

OpenAPI 3.1 se sirve en `/v3/api-docs`; Swagger en `/swagger-ui/index.html`.
El contrato fija servidor relativo `/` para usar el mismo origen del navegador.
Swagger no carga Petstore ni un validador remoto.

## Seguridad local

Spring Security permite únicamente GET de salud y documentación técnica;
deniega las demás rutas y métodos. No hay cuentas, login, HTTP Basic ni sesiones.
CSRF sigue activo para métodos no seguros; no se abre CORS.
Los errores públicos no exponen excepciones, SQL, host o credenciales.

Nginx sirve Angular y dirige API/documentación al backend. CSP limita recursos
al propio origen; `style-src 'unsafe-inline'` permite estilos de Angular/Swagger.
No hay scripts externos ni interpolación de HTML no fiable. Se revisará CSP
al cambiar estas superficies. HSTS/HTTPS públicos no se acreditan en HTTP local.

Compose solo publica `127.0.0.1:18080`. PostgreSQL está en red interna sin puertos
publicados; backend tampoco tiene puerto en el host. Usuarios efectivos comprobados:
backend 10001, Nginx 101 y PostgreSQL 999. Se eliminan capacidades Linux y se
activa no-new-privileges; backend/frontend tienen raíz de solo lectura y tmpfs.

El socket Docker solo se necesita para Testcontainers durante QA, nunca en
contenedores de la aplicación. No se usan contenedores privilegiados.

## Datos y permisos

El inicializador administrativo crea roles separados y el esquema `gestion`.
Flyway usa `gestion_migracion`, propietario del esquema; la aplicación usa
`gestion_app` con CONNECT y USAGE, sin DDL, roles ni acceso al historial Flyway.
V1 configura permisos y comentario del esquema. La única tabla en `gestion`
es `flyway_schema_history`; no se incluyen tablas ni datos de negocio.

El proceso backend recibe ambas credenciales para ejecutar Flyway al arrancar.
La separación de roles no equivale a aislamiento entre procesos de migración
y aplicación. Un ejecutor separado puede evaluarse en el despliegue futuro.
El contenedor PostgreSQL conserva datos en `gestion-solicitudes-001_datos-postgres`.
Los ejemplos son ficticios; `.env` queda excluido del control de versiones.

## Reproducción y verificación

Las imágenes están fijadas por etiqueta exacta y digest. Maven Wrapper verifica
el ZIP mediante SHA-256; el constructor Linux incluye unzip fijado.
El backend Docker construye el artefacto con objetivos Maven de empaquetado;
las pruebas y controles se ejecutan fuera de ese build, en QA/CI.
Construir una imagen no sustituye `verify`, actualmente bloqueado por Spotless.

Se han ejecutado pruebas unitarias/HTTP, Testcontainers, Angular y navegador.
El workflow usa Actions por SHA, permisos contents:read y conserva informes.
La [política de transitivas](../decisiones/ADR-0002-politica-dependencias-transitivas.md)
permite preliminares controladas sin omitir instalación, auditoría ni QA.
La revisión final de AG-006 es de la misma sesión y no es independiente.
