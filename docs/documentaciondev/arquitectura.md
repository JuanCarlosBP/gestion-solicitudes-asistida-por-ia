# Arquitectura: base técnica e identidad

**Estado:** Implementada; documentación pendiente de revisión humana.
**Fecha:** AG-010, 2026-10-14. Resultados de la base en
[validación 001](../../especificaciones/001-base-verificable/validacion.md) y cambios de identidad en
[validación 002](../../especificaciones/002-identidad-acceso/validacion.md).

El backend es un monolito modular Spring Boot 4.0.8 con Java 21.
001 aporta la comprobación técnica y 002 añade el módulo funcional `identidad`.
No hay CRUD de usuarios ni módulos de proveedores/solicitudes/importes/aprobaciones.

## Responsabilidades

| Ruta | Responsabilidad |
|---|---|
| `backend/src/main/java/es/gestionsolicitudes/salud/http` | Entrada GET y DTO público. |
| `salud/aplicacion` | Estado público y puerto de comprobación de la dependencia. |
| `salud/persistencia` | Consulta constante SELECT 1 mediante JDBC y cierre de recursos. |
| `configuracion` | Seguridad, contrato OpenAPI y errores controlados. |
| `identidad/http` | Login, refresh, logout, CSRF, identidad pública y cookies. |
| `identidad/aplicacion` | Contraseñas, JWT y casos transaccionales de sesión. |
| `identidad/dominio` | Correo, roles, intentos, usuarios, sesiones y tokens técnicos. |
| `identidad/persistencia` | Consultas parametrizadas JdbcTemplate, versiones y bloqueos de filas. |
| `identidad/configuracion` | Clock, duraciones, RSA, validación JWT y aprovisionamiento local. |
| `frontend/src/app/inicio` | Servicio HTTP y pantalla con carga, disponibilidad y error. |
| `frontend/src/app/identidad` | Store signals, servicio, guard, interceptor y pantallas de acceso/cuenta. |
| `frontend/src/app/navegacion` | Salida controlada para direcciones desconocidas. |
| `infraestructura` | Compose y preparación administrativa de PostgreSQL. |
| `qa` | Inventario de preliminares, auditoría offline, QA de Compose y evidencias. |

El controlador depende del servicio, que utiliza un puerto implementado por JDBC.
Los detalles SQL, conexiones y mensajes del driver no llegan al DTO HTTP.
Salud conserva su estructura mínima. Identidad incorpora dominio porque sí tiene
reglas de correo, contraseña, intentos, caducidad y estados de sesión.

## Contrato y límites

`GET /api/salud` devuelve exactamente `{"estado":"DISPONIBLE"}` con 200,
o `{"estado":"NO_DISPONIBLE"}` con 503 si PostgreSQL falla.
No recibe un cuerpo de entrada ni acredita funciones de negocio.
Un fallo inesperado se traduce a `{"error":"ERROR_INTERNO"}` con 500.
La falta de autenticación devuelve 401 y `{"error":"NO_AUTENTICADO"}`;
CSRF o permiso insuficiente devuelven 403 y `{"error":"ACCESO_NO_PERMITIDO"}`.
El contrato completo y las rutas están en [API y rutas](api-y-rutas.md).

Hikari limita espera de conexión a 2 s, validación a 1 s y pool a 5 conexiones.
JDBC limita conexión/socket a 3 s y consulta a 2 s. Son límites de operaciones
individuales, no una promesa de latencia máxima universal.
Angular cancela una consulta sin respuesta tras 6 s y muestra un error controlado.
La caída real medida en Compose devolvió 503 en 2016 ms; no es un benchmark.

OpenAPI 3.1 se sirve en `/v3/api-docs`; Swagger en `/swagger-ui/index.html`.
El contrato fija servidor relativo `/` para usar el mismo origen del navegador.
Swagger no carga Petstore ni un validador remoto.

## Seguridad local

Spring Security permite las operaciones públicas de salud y autenticación;
documentación solo en local/test. `/api/identidad/yo` exige Bearer válido y toda
otra API se deniega. HTTP Basic y formulario automático de Spring están deshabilitados.
No se usa sesión HTTP/JSESSIONID: la sesión técnica reside en PostgreSQL.
CSRF sigue activo para métodos no seguros, incluso con Bearer; no se abre CORS.
Los errores públicos no exponen excepciones, SQL, host o credenciales.

El acceso JWT RS256 se conserva en memoria Angular. Un refresh opaco en cookie
HttpOnly permite restaurar y renovar; solo su hash de secreto se almacena.
Rotación y revocación bloquean sesión dentro de una transacción; el `sid` se
consulta por petición protegida para invalidar JWT tras el cierre o reutilización.
La familia tiene duración absoluta de ocho horas. La decisión y riesgos están en
[ADR-0003](../decisiones/ADR-0003-identidad-jwt-y-sesiones.md) y
[seguridad técnica](seguridad.md). No hay servidor OAuth completo ni Redis.

Nginx sirve Angular y dirige API/documentación al backend. CSP limita recursos
al propio origen; `style-src 'unsafe-inline'` permite estilos de Angular/Swagger.
No hay scripts externos ni interpolación de HTML no fiable. Se revisará CSP
al cambiar estas superficies. HSTS/HTTPS públicos no se acreditan en HTTP local.

Compose solo publica loopback, con 18080 por defecto y `FRONTEND_PUERTO` configurable.
AG-009 comprobó también 18081. PostgreSQL está en red interna sin puertos
publicados; backend tampoco tiene puerto en el host. Usuarios efectivos comprobados:
backend 10001, Nginx 101 y PostgreSQL 999. Se eliminan capacidades Linux y se
activa no-new-privileges; backend/frontend tienen raíz de solo lectura y tmpfs.

El socket Docker solo se necesita para Testcontainers durante QA, nunca en
contenedores de la aplicación. No se usan contenedores privilegiados.

## Datos y permisos

El inicializador administrativo crea roles separados y el esquema `gestion`.
Flyway usa `gestion_migracion`, propietario del esquema; la aplicación usa
`gestion_app` con CONNECT y USAGE, sin DDL, roles ni acceso al historial Flyway.
V1 conserva permisos iniciales. V2 añade usuarios, roles, usuarios_roles,
sesiones_acceso y tokens_refresco con privilegios mínimos explícitos;
[modelo de datos](modelo-de-datos.md) explica claves, restricciones y transacciones.
No se incluyen tablas de los dominios funcionales excluidos de AG-010.

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
Construir una imagen no sustituye `verify`: AG-008 completó Spotless y verify,
y AG-009 repitió la verificación local íntegra con éxito.

Se han ejecutado pruebas unitarias/HTTP, Testcontainers, Angular y navegador.
El workflow usa Actions por SHA, permisos contents:read y conserva informes.
La [política de transitivas](../decisiones/ADR-0002-politica-dependencias-transitivas.md)
permite preliminares controladas sin omitir instalación, auditoría ni QA.
La revisión final de AG-006 es de la misma sesión y no es independiente.
La primera revisión independiente [REV-001](../trazabilidad/REV-001-revision-independiente-01.md)
registró R-01 a R-04; [AG-009](../trazabilidad/AG-009-informe.md) documenta su respuesta.
La rama y PR #1 se publicaron por intervención humana. La primera CI pasó frontend
y falló por setup-java y la copia de public; AG-009 corrige ambas sin cambiar arquitectura.
La segunda CI espera el siguiente push humano. 001 no está aceptada ni integrada.

AG-010 añade pruebas de identidad, concurrencia refresh, Angular y recorrido
E2E de login/restauración/cierre. La CI fija además Docker 29.1.3 y Compose 2.40.3,
conserva salidas por job y ejecuta QA de sesiones sobre Compose. Sus resultados
locales se registran en validación 002; no se presentan como una CI remota ejecutada.
