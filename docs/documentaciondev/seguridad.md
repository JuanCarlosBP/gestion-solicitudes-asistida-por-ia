# Seguridad técnica de identidad y proveedores

**Estado:** Controles de identidad AG-010 y catálogo AG-011, con resultados y límites explícitos en sus validaciones.
La [política](../seguridad.md) sigue vigente. Resultados y límites se registran
en [validación 002](../../especificaciones/002-identidad-acceso/validacion.md).

## Contraseñas e intentos

Argon2id mediante Spring Security y Bouncy Castle: 19456 KiB (19 MiB),
dos iteraciones, paralelismo uno, sal aleatoria de 16 bytes y salida de 32 bytes.
Se admiten de 15 a 128 puntos de código Unicode, incluidos espacios, sin recortar
ni exigir composiciones arbitrarias. No se usa SHA-256 para contraseñas.

La lista local explícita en `Contrasenas` rechaza exactamente:
`123456789012345`, `1234567890123456`, `passwordpassword`, `password123456789`,
`qwertyuiopasdfgh`, `contrasenacontrasena`, `contraseñacontraseña` y
`administrador123`. Son ejemplos públicos de contraseñas comunes, nunca cuentas
reales. Esta lista acotada no acredita comprobar todas las contraseñas filtradas.
Cinco muestras locales de Argon2 en AG-010 dieron 22, 22, 23, 23 y 22 ms por
hash; son observaciones del equipo de pruebas, no un benchmark ni una latencia universal.

Cinco fallos en quince minutos bloquean quince minutos, con contador/fechas
persistidos y Clock inyectable. Éxito restablece el contador. Una cuenta ausente
verifica un hash ficticio para reducir diferencias evidentes; no se promete
igualdad de tiempos frente a análisis estadístico. El 401 es genérico para
ausente, incorrecta, deshabilitada y bloqueada. El bloqueo puede ser usado para
causar indisponibilidad temporal a una cuenta conocida; no hay bloqueo permanente.

## JWT, claves y sesión

JWT de acceso RS256 de diez minutos por defecto. JwtEncoder firma y
JwtDecoder/Resource Server validan con pública; se fija RS256. Claims mínimos
iss/aud/sub/iat/nbf/exp/jti/sid/roles. Emisor `gestion-solicitudes`, audiencia
`gestion-solicitudes-api`. Se comprueban fechas y sesión activa en PostgreSQL.
Un JWT firmado no oculta sus claims. Backend determina roles; el cliente no los fija.

Local/test generan al iniciar RSA efímera de 2048 bits: los access tokens previos
dejan de validar tras un reinicio. Refresh conserva su sesión en PostgreSQL y
permite obtener un JWT nuevo. Fuera de esos perfiles son obligatorias claves
externas mediante `IDENTIDAD_CLAVE_PRIVADA_RUTA`/`IDENTIDAD_CLAVE_PUBLICA_RUTA`
o `IDENTIDAD_CLAVE_PRIVADA_PEM`/`IDENTIDAD_CLAVE_PUBLICA_PEM`, una fuente por clave,
PKCS8 privada y X509 pública. Claves ausentes/inválidas impiden el arranque.
No se imprimen contenidos de claves ni se guardan en código/imágenes.

Refresh: UUID público y secreto SecureRandom de 256 bits, opaco, con SHA-256 solo
del secreto en servidor y comparación constante. La familia vence a ocho horas;
rotar no la prolonga. Transacciones y bloqueo de sesión serializan refresh/cierre.
Reutilización revoca familia y sesión sin emitir credenciales. Logout invalida
JWT existentes por sid, además de borrar la cookie.

## Navegador y HTTP

| Credencial/control | Ubicación y atributos |
|---|---|
| Access token | Solo memoria Angular; Authorization Bearer a API del mismo origen. |
| REFRESH-TOKEN | Cookie HttpOnly, SameSite=Strict, Path=/api/autenticacion, Max-Age restante, sin Domain. |
| XSRF-TOKEN | Cookie accesible a Angular, Path=/, SameSite=Strict; cabecera X-XSRF-TOKEN. |

Secure=true fuera de local y siempre que la petición sea segura o su host no
sea loopback. Secure=false se limita a HTTP local de localhost/127.0.0.1/::1.
No se afirma HTTPS público. Nginx conserva Host y publica solo loopback.

CSRF permanece activo para login, refresh, logout y demás métodos mutables,
incluso cuando haya un Bearer. No se abre CORS. El inicializador Angular restaura
sesión y el interceptor comparte refresh entre 401 concurrentes, con un solo
reintento. Logout y el estado de sesión impiden restauraciones tardías.
Tokens ausentes de localStorage/sessionStorage, URL y registros.

Default deny: únicamente salud, autenticación y documentación local expresamente
permitidas; `/yo` y las rutas aprobadas de proveedores exigen Bearer. 401 distingue falta de autenticación de 403 por
permiso o CSRF. Method security se prueba sin añadir endpoints al producto.
Cache-Control: no-store, Pragma: no-cache y borrado explícito de refresh; logout
añade Clear-Site-Data limitado a caché. CSP y demás cabeceras de 001 se mantienen.

## Riesgos y evidencia

HttpOnly reduce extracción del refresh, pero XSS aún puede operar durante una
sesión; mantener CSP, codificación de Angular y dependencias es necesario.
Un token robado es una credencial hasta su caducidad/revocación. Validar sid
requiere PostgreSQL disponible; su fallo rechaza acceso. Dos pestañas pueden
provocar reutilización y cierre seguro; no hay coordinación global entre pestañas.
No se incorporan recuperación de cuentas, CRUD, MFA, claves públicas remotas,
rotación operativa, alertas centralizadas ni protección global de carga.

Los eventos técnicos evitan contraseñas, hashes, tokens y datos suministrados por
un atacante. No son historial funcional. Playwright no guarda trazas de red que
contengan credenciales. Las evidencias de pruebas usan cuentas ficticias.
PostgreSQL usa `log_error_verbosity=terse`, sin sentencias ordinarias ni parámetros
de error, y conserva SQLSTATE en el prefijo. Esto evita detalles de filas con hash
en los fallos de restricciones comprobados. pgJDBC también omite detalle del
servidor en la conexión de aplicación. Se pierde contexto de diagnóstico;
no se presenta la configuración como sanitización universal de cualquier mensaje.
Auditorías de dependencias y búsquedas acotadas no garantizan ausencia de todo
defecto, vulnerabilidad desconocida o secreto. No se declara una categoría OWASP
completa cubierta por 002. Véanse [ADR-0003](../decisiones/ADR-0003-identidad-jwt-y-sesiones.md)
y [modelo de amenazas](../seguridad/modelo-de-amenazas.md).

## Controles acotados de proveedores — AG-011

PR-08 aplica autorización backend y unión explícita de roles. SOLICITANTE y
SUPERVISOR solo activos; AUDITOR añade inactivos; ADMINISTRADOR escribe. Recurso
no visible es 404; false/todos en listado requiere permiso. Las reglas HTTP de Spring Security y
servicio de aplicación comprueban acceso. CSRF sigue activo con Bearer.

PR-07/09 protegen integridad mediante UNIQUE de país/fiscal normalizado incluyendo
inactivos y UPDATE por id/version. No-op de estado se decide atómicamente con
versión vigente; obsoleta devuelve 409. Sin DELETE para aplicación. La normalización
Unicode no acredita validez jurídica ni checksum fiscal; no se eliminan signos.

PR-11: DTO cerrado, tipos y longitudes, ISO, sort cerrado, consultas parametrizadas
y comodines literales; sin mass assignment de id/activo/fechas. Angular interpola
texto de catálogo sin ejecutarlo. Errores solo códigos y respuestas privadas sin
caché compartida. Fiscal/contacto no aparecen en eventos ni cuerpos de errores.

Eventos de crear/modificar/desactivar/reactivar tras commit; duplicado/conflicto
con resultado controlado. Máximo acción/usuario/proveedor/resultado e id petición
si existe. No sustituyen historial 007. Contacto solo para gestión; retención y
eliminación jurídica definitiva pendientes. Consultas fiscales en query params
requieren no registrar URLs completas; Nginx mantiene access_log desactivado.

Pruebas y revisión independientes constan en validación 003. Persisten riesgos
XSS durante sesión, disponibilidad PostgreSQL, abuso global sin rate limit general,
protección HTTPS pública y retención operativa por definir. La paginación limitada
no es prueba de carga ni garantía contra agotamiento. Sin OWASP/ASVS completo.

## Controles acotados de solicitudes — AG-012

SCI-09/13 aplican permisos por acción, propietario y estado. Roles combinan
únicamente permisos explícitos; un administrador no escribe solicitudes ajenas.
Supervisor lee solo asignadas presentadas. SQL aplica visibilidad antes del conteo;
404 oculta recursos no visibles. Selector devuelve únicamente ID/nombre habilitado.
Bearer/CSRF/default deny/no-store continúan vigentes en todas las rutas nuevas.

SCI-04/05/08/10/11: DTO cerrado y validación de escala/precisión, BigDecimal y
límites antes de persistir; transacción de agregado, versión y estado en UPDATE,
snapshot de proveedor y validación de supervisor bajo bloqueo. Idempotencia
por usuario/clave con huella SHA256 y resultado mínimo original evita efectos
duplicados incluso tras reinicio. Expiración/purga no habilitadas en004.

Privilegios: función SECURITY DEFINER mínima con search_path fijo y PUBLIC sin
EXECUTE para bloquear rol supervisor sin permiso general de mutación. DELETE
solo en conceptos para reemplazar colección, nunca solicitudes/idempotencia.
Eventos de éxito tras commit, rechazados/duplicados con resultado controlado;
solo IDs/acción/resultado/petición y hash de clave. Sin cuerpo, conceptos,
fiscalidad completa, tokens ni claves reutilizables. Nginx no registra URLs.

La [validación004](../../especificaciones/004-solicitudes-conceptos-importes/validacion.md)
registra evidencia real y limitaciones. No sustituye retención legal007/008,
historial funcional007, controles transversales006 ni auditorías OWASP/WCAG completas.

## Concurrencia y recuperación006 — AG-013

D006 aplica permisos actuales desde PostgreSQL antes de replay/GET, además de
identidad/CSRF/visibilidad. Clave UUID no es credencial; respuesta mínima de consulta
sin fiscal/contactos/textos ni snapshot. Los errores no exponen SQL/stack/huellas.
Retirar rol impide replay aunque JWT anterior siga firmado; dependencia caída503.

SHA256 canónico identifica entrada normalizada, no sustituye autorización ni cifra
datos. Snapshot original conserva solo lo necesario para contrato público. Registro
inmutable de éxitos, sin errores cacheados ni purga. El mapa de progreso no guarda
cuerpos. Angular solo descriptor4campos; namespace opaco por cuenta no es control
servidor. Timeout/404/error conservan intento; Web Locks evita reclamaciones rivales.

La evidencia de CI01–10 en [validación006](../../especificaciones/006-concurrencia-idempotencia/validacion.md)
distingue ejecutado y pendiente; no acredita cobertura integral OWASP/ASVS/WCAG.
