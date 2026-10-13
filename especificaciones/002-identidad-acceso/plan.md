# Plan — 002 Identidad y acceso

**Estado:** Aprobado por decisión humana AG-010.
**Referencia:** [especificación](especificacion.md), autorización integral de AG-010.

## Diseño y orden

1. Precondición rápida y huellas de fuentes/históricos, sin Git.
2. Especificación, este plan, tareas y ADR antes del código.
3. Backend: migración, dominio, repositorio JDBC, aplicación transaccional,
   claves/JWT, HTTP, Spring Security y pruebas.
4. Angular sobre el contrato siguiente: estado en memoria, XSRF, restauración,
   guard, interceptor con refresh compartido, pantallas y pruebas.
5. Integración Compose y E2E, regresión, auditorías, CI y documentación.
6. Revisión independiente de solo lectura, correcciones y comprobación final.

Monolito modular Java 21/Spring Boot 4 vigente. Paquete `identidad` separado en
`dominio`, `aplicacion`, `persistencia`, `http`, `configuracion`.
JdbcTemplate, PostgreSQL 17, Flyway y transacciones Spring. Angular 21 por función.
Se mantienen versiones mayores y herramientas existentes; dependencias directas
nuevas estables y fijadas por BOM o versión exacta, sometidas a auditoría.

Dependencias de identidad: `spring-boot-starter-security-oauth2-resource-server`
gestionado por Boot 4.0.8 y `bcprov-jdk18on` 1.86 para Argon2.
La selección inicial 1.83 produjo cinco avisos OSV en algoritmos y parsers no
utilizados por Argon2; se sustituye por 1.86 estable oficial, sin cambio mayor,
y se repiten auditoría y pruebas antes de entregar. Evidencias AG-010 conservan
el inventario inicial y los avisos; no se ocultan por falta de aplicabilidad.

## Contrato acordado para escritores

| Operación | Petición | Respuesta |
|---|---|---|
| GET `/api/autenticacion/csrf` | sin cuerpo | 204 y cookie XSRF-TOKEN |
| POST `/api/autenticacion/iniciar-sesion` | JSON `{correo, contrasena}` + XSRF | 200, respuesta de acceso y cookie REFRESH-TOKEN |
| POST `/api/autenticacion/renovar` | cookie REFRESH-TOKEN + XSRF; cuerpo vacío | 200, respuesta de acceso y cookie rotada |
| POST `/api/autenticacion/cerrar-sesion` | cookie REFRESH-TOKEN + XSRF; cuerpo vacío | 204, revocación y cookie borrada |
| GET `/api/identidad/yo` | Authorization: Bearer accessToken | 200, usuario público |

Respuesta de acceso: `{accessToken, tipoToken: "Bearer", expiraEn, usuario}`.
Usuario público: `{id, correo, nombreVisible, roles}`; roles son nombres aprobados.
Login inválido: 401 `{error: "CREDENCIALES_INVALIDAS"}` para los cuatro supuestos.
Refresh/Bearer inválido o ausente: 401 `{error: "NO_AUTENTICADO"}`.
CSRF o permisos inválidos: 403 `{error: "ACCESO_NO_PERMITIDO"}`.
El formulario muestra «No se ha podido iniciar sesión. Comprueba los datos e inténtalo de nuevo.»
Errores internos: `{error: "ERROR_INTERNO"}` sin información del fallo.
No enviar Bearer a endpoints de autenticación: un JWT caducado no debe impedir refresh.

## Datos y transacciones

V2 crea cinco tablas en esquema `gestion`; no altera V1 ni roles de infraestructura.
Correo normalizado único; usuarios_roles con clave compuesta; roles cerrados.
Usuarios guardan hash, habilitación, intentos/ventana/bloqueo, fechas y versión.
Sesión UUID y familia UUID, usuario FK, creación/expiración/revocación/motivo,
token actual. Refresh UUID público, sesión/familia, hash de secreto, estado,
creación/expiración/uso/reemplazo/revocación/motivo. Índices para consultas por
sesión y usuario, FK y restricciones evitan estados imposibles.

Login bloquea fila de usuario al modificar intentos y crear sesión.
Rotación y cierre bloquean sesión en orden estable; verifican hash en tiempo
constante y estado dentro de la transacción. Reutilización revoca familia
y confirma transacción antes de responder 401: no lanzar excepción que deshaga
esa revocación. Pruebas concurrentes usan dos conexiones reales y Clock controlado.

## Criptografía, HTTP y frontend

Argon2PasswordEncoder Argon2id con memoria 19456 KiB, 2 iteraciones y paralelismo 1.
SecureRandom genera secretos refresh; SHA-256 solo se aplica a esos secretos
aleatorios. RS256 mediante JwtEncoder/JwtDecoder y Resource Server, con algoritmo
fijo, validadores de claims y sesión activa. Clock injectable.
No se construye un Authorization Server. [ADR-0003](../../docs/decisiones/ADR-0003-identidad-jwt-y-sesiones.md).

Local/test: RSA efímero. Normal: PEM externo PKCS8/X509 por ruta o variable,
validado sin revelar contenido. Solo perfil local aprovisiona cuentas desde
DEMO_SOLICITANTE_*, DEMO_SUPERVISOR_*, DEMO_AUDITOR_* y DEMO_ADMINISTRADOR_*:
sufijos CORREO, NOMBRE, CLAVE. Sin variables no se crean cuentas; grupo parcial falla.
Compose declara explícitamente perfil local y usa loopback como entrada publicada.

CookieCsrfTokenRepository con cookie legible por Angular, Path=/, SameSite=Strict,
Secure según entorno; refresh HttpOnly, Path=/api/autenticacion, sin Domain.
CSRF exigido incluso si se envía Bearer. Mantener CORS cerrado y cabeceras existentes.
NoStore y borrado explícito; Clear-Site-Data: "cache" al salir, sin borrar recursos
ni todo el almacenamiento del origen. OpenAPI/Swagger públicos solo local/test.

Signals contienen usuario/accessToken solo en memoria. Inicializador comparte
restauración csrf→refresh antes del guard. Interceptor funcional solo añade
Bearer a la API del mismo origen fuera de autenticación. Un refresh compartido
atiende los 401 concurrentes; cada petición se reintenta una vez; logout limpia
estado y navegación, y los resultados tardíos no resucitan la sesión.

## Verificación y riesgos

Pruebas unitarias, HTTP y PostgreSQL por requisito; no eliminar regresión 001:
actualizar sus expectativas incompatibles (cantidad de rutas/tablas/migraciones,
perfil local y 401 para anónimos). Conservar íntegramente sus evidencias antiguas.
Pruebas de frontend y E2E con trazas desactivadas para evitar capturar credenciales.
No escribir JWT ni refresh en evidencias; registrar solo resultados y atributos.

Una prueba de restricción durante AG-010 reveló que PostgreSQL puede incluir
el hash en DETAIL de la fila. El cliente JDBC desactiva `logServerErrorDetail`;
Compose y Testcontainers utilizan errores `terse`, sin sentencias ni parámetros
de error, conservando SQLSTATE en el prefijo del log. Las pruebas comprueban
el fallo esperado y ausencia de hash/DETAIL en memoria, sin volcar esos registros.
Este ajuste de logging técnico reduce contexto de diagnóstico, no los controles
de integridad ni los eventos de seguridad de aplicación.

Riesgos restantes: XSS puede actuar durante una sesión; HttpOnly no elimina XSS;
JWT firmado no oculta claims; un refresh robado sigue siendo credencial hasta
caducidad/revocación; comprobación sid introduce dependencia de PostgreSQL.
Dos pestañas no coordinadas pueden provocar revocación segura por reutilización;
la exclusión mutua requerida cubre peticiones concurrentes de una instancia Angular.
Protección antiabuso global, HTTPS público, rotación operativa de claves y gestión
de usuarios quedan para autorización futura, sin afirmar controles no existentes.

Documentación/CI se actualizan con resultados reales. Evidencia nueva en
`qa/evidencias/ag010/` o temporales ignorados; salidas CI aisladas por job.
La revisión no acepta ni integra por la persona responsable.
