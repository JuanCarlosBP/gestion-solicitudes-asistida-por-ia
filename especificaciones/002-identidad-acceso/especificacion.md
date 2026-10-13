# 002 — Identidad y acceso

**Estado:** Aprobada por decisión humana AG-010.
**Origen:** orden humana de ejecución AG-010 recibida el 2026-10-13.
**Inicio registrado:** 2026-10-13 23:55:26 +02:00, Europe/Madrid.
**Límite:** 2026-10-14 09:55:26 +02:00; máximo diez horas.

## Propósito y autorización

Entregar una porción vertical de identidad y acceso sobre la base 001.
La orden humana aprueba expresamente estos requisitos, su plan y sus tareas,
y autoriza implementarlos sin una segunda aprobación documental.
La verificación local no equivale a aceptación, integración ni publicación.

Actores: SOLICITANTE, SUPERVISOR, AUDITOR y ADMINISTRADOR.
Se incorpora acceso a la cuenta propia; todavía no se asignan permisos de negocio.
La API decide identidad, roles y autorización. Angular orienta la navegación.

Quedan fuera proveedores, solicitudes, conceptos, importes, aprobaciones,
concurrencia funcional, historial de negocio, CRUD de usuarios, Redis y OAuth
Authorization Server completo. No se cambia de versión mayor ni se usan secretos
reales. No se ejecutará Git ni se integrará la PR de 001.
AG-003–AG-009, REV-001, ADR-0001/0002 y sus evidencias se conservan íntegros.

## Requisitos y criterios observables

### IA-01 — Usuarios y roles

Persistir usuarios UUID y los cuatro roles aprobados. Un usuario admite varios
roles. El correo se normaliza para comparación y es único. La normalización
elimina espacios exteriores y aplica minúsculas con Locale.ROOT; no modifica
contraseñas. No se expone administración de usuarios.
Pruebas: unicidad, persistencia, normalización y combinación de roles.

### IA-02 — Contraseñas

Guardar únicamente Argon2id, con al menos 19 MiB, 2 iteraciones, paralelismo 1 y
sal aleatoria de biblioteca. Longitud entre 15 y 128 caracteres, incluidos
espacios y Unicode; sin reglas arbitrarias de composición ni recortes.
Rechazar un conjunto local documentado de contraseñas demasiado comunes.
No usar SHA-256 para contraseñas. Medir y documentar el tiempo de hash.
Pruebas de límites, Unicode, espacios, lista común, sal y verificación.

### IA-03 — Aprovisionamiento local

Solo el perfil explícito `local` podrá crear usuarios de demostración.
Recibirá correo, nombre visible y contraseña mediante variables de entorno.
Los ejemplos serán ficticios para cada rol, la creación idempotente y las
contraseñas se validarán y convertirán inmediatamente a hash sin registrarlas.
El perfil normal no creará usuarios. Los futuros entornos públicos usarán otros
secretos. El perfil `test` permite claves efímeras, pero no aprovisiona cuentas.

### IA-04 — Inicio de sesión

`POST /api/autenticacion/iniciar-sesion` acepta correo y contraseña.
Éxito: JWT de acceso en el cuerpo, refresh solo en cookie, usuario público mínimo,
tipo Bearer y segundos hasta expiración. Fallo: 401, mismo mensaje, código y forma
para usuario inexistente, contraseña incorrecta, deshabilitado o bloqueado.
Verificar un hash ficticio cuando no exista la cuenta para reducir diferencias
evidentes de tiempo. Nunca se afirma equivalencia temporal perfecta.

### IA-05 — Límite de intentos

Cinco fallos dentro de quince minutos provocan bloqueo temporal de quince minutos.
Persistir el contador y sus fechas en PostgreSQL, con Clock inyectable.
Un éxito restablece el contador. No revelar el estado de bloqueo al cliente.
Registrar eventos técnicos sin contraseñas, tokens ni correos enviados por atacantes.
Probar umbral, ventana, caducidad, persistencia y restablecimiento.

### IA-06 — JWT de acceso

RS256 fijo, duración predeterminada diez minutos, firma con clave privada y
validación con pública. Issuer `gestion-solicitudes`, audience
`gestion-solicitudes-api`. Claims: iss, aud, sub UUID, iat, nbf, exp, jti,
sid UUID de sesión y roles. Sin contraseñas, hashes, refresh, dirección ni datos
innecesarios. Validar firma, algoritmo, issuer, audience, fechas y sesión activa.
Rechazar tokens alterados, caducados, con claims inválidos o de sesión revocada.

### IA-07 — Claves

En local/test generar al arrancar RSA efímero de 2048 bits. Un reinicio invalida
los access tokens anteriores; un refresh válido permite obtener uno nuevo.
Fuera de esos perfiles exigir claves externas mediante rutas o valores del
entorno; fallar claramente si faltan o son inválidas sin imprimirlas.
No incorporar claves reales al repositorio ni a imágenes.

### IA-08 — Sesiones y refresh

Refresh opaco, no JWT: identificador público UUID más secreto SecureRandom de al
menos 256 bits. El cliente solo lo conserva como cookie; el servidor guarda
únicamente SHA-256 del secreto aleatorio, comparado de forma constante.
Persistir sesión, usuario, familia, token actual, hash, creación, expiración,
uso, revocación, reemplazo y motivo. Expiración absoluta de la familia: ocho horas
por defecto, sin ampliarla al renovar. Rotación en cada uso.

Reutilizar un token ya usado revoca toda su familia y sesión, devuelve un fallo
genérico y registra un evento de seguridad, sin emitir otro token.
La revocación debe confirmarse aunque la respuesta sea un error de autenticación.
Dos renovaciones concurrentes del mismo token se serializan: como máximo una
rota; la reutilización posterior invalida también el resultado de la primera.
Esta decisión prioriza seguridad y exige exclusión mutua en Angular.

### IA-09 — Cookie refresh

HttpOnly, SameSite=Strict, Path=/api/autenticacion, sin Domain y Max-Age coherente
con el tiempo absoluto restante. Secure=true fuera de local.
Secure=false solo en HTTP de loopback local. Borrar explícitamente al cerrar
sesión o detectar reutilización. No enviar refresh en JSON, logs, URL ni cabecera
accesible a JavaScript; se transmite exclusivamente mediante Set-Cookie/Cookie.

### IA-10 — CSRF/XSRF

`GET /api/autenticacion/csrf` materializa cookie `XSRF-TOKEN` mediante
CookieCsrfTokenRepository. Angular enviará `X-XSRF-TOKEN`.
Exigir CSRF en login, refresh, logout y operaciones mutables futuras con cookie.
No desactivarlo globalmente, ni eximir las rutas de autenticación mediante
configuración automática del Resource Server. No abrir CORS; origen único Nginx.

### IA-11 — Renovación y cierre

`POST /api/autenticacion/renovar`: exige refresh y CSRF, rota y emite JWT nuevo
sin extender la expiración absoluta. `POST /api/autenticacion/cerrar-sesion`:
exige CSRF, revoca la sesión completa identificada por un refresh auténtico,
borra cookie y devuelve 204 con cabeceras de no caché. El cierre sin sesión es
idempotente. Los JWT de esa sesión dejan de servir por comprobación de sid.

### IA-12 — Identidad actual

`GET /api/identidad/yo` requiere Bearer válido. Devuelve solo UUID, correo,
nombre visible y roles. Sin hashes, contadores, claves ni datos de sesión.
El backend es autoridad de roles. Habilitar method security y probar controles
de roles sobre componentes de prueba, sin endpoints artificiales de producto.

### IA-13 — Angular

Ruta `/acceso`, ruta protegida `/mi-cuenta`, guard funcional, servicio de
autenticación, signals, interceptor funcional y cierre de sesión.
Restaurar al arrancar mediante refresh; ante 401 intentar una única renovación,
compartida entre peticiones concurrentes; el reintento no puede formar bucles.
El JWT permanece solo en memoria: nunca localStorage, sessionStorage ni logs.

Formulario con etiquetas visibles, autocomplete adecuado, error genérico en
región accesible, estado de carga, teclado y foco correctos. Navegación accesible
y redirecciones internas coherentes. La pérdida de sesión lleva a `/acceso`.
Probar servicio, store, guard, interceptor, formulario, restauración, concurrencia,
error de refresh, logout, rutas, accesibilidad y ausencia de tokens persistidos.

### IA-14 — Documentación, seguridad y evidencia

OpenAPI con Bearer y Swagger para probar access token. Actualizar arquitectura,
entorno, seguridad técnica, API, datos, README, índices, MEMORY, CI y validación.
Actualizar solo apartados afectados de amenazas/OWASP sin declarar categorías
completas verificadas. Crear ADR-0003, informe AG-010 y evidencias propias.
CI remota pendiente de push humano, sin Git para provocarla.

## Persistencia, HTTP y defensa por defecto

Migraciones Flyway posteriores a V1 para `usuarios`, `roles`, `usuarios_roles`,
`sesiones_acceso`, `tokens_refresco`. UUID, unicidad, FKs, timestamptz, estados
explícitos, índices y auditoría técnica mínima. Versionado donde aporte valor.
Respetar roles PostgreSQL de aplicación y migración, sin secretos en texto claro.
Probar base nueva, segundo arranque, migración inválida y PostgreSQL real aislado.

Públicos: recursos Angular, GET salud, OpenAPI/Swagger solo en entorno local/test,
GET csrf y POST login/renovar/cerrar-sesion. Toda otra API se deniega por defecto.
401 para falta de autenticación o token inválido; 403 para falta de permiso o
CSRF inválido. Errores controlados, sin stack traces ni detalles internos.
Autenticación e identidad envían Cache-Control: no-store y Pragma: no-cache;
logout usa Clear-Site-Data limitado a caché y borrado explícito de refresh.
Conservar cabeceras de seguridad aprobadas. No afirmar HTTPS público.

## Validación obligatoria

Backend: unitarias de normalización, contraseñas/Argon2, JWT/claims/fechas,
audience/issuer, intentos, rotación, reutilización, revocación y Clock.
HTTP real o MockMvc: CSRF, login correcto/genérico, ausencias, Bearer alterado o
caducado, yo, refresh, reuse, logout y acceso posterior. PostgreSQL/Testcontainers:
migraciones, restricciones, usuarios/roles/sesiones, rotación transaccional,
dos renovaciones concurrentes, reutilización, segundo arranque y aislamiento.
Seguridad: no enumeración evidente, no secretos en respuestas/almacenamiento,
CSRF, denegación por defecto y conversión de roles del JWT.

E2E Compose con cuentas ficticias: abrir acceso, CSRF, login, mi-cuenta, recargar,
identidad/roles, logout, guard, error genérico y tokens ausentes de URL/almacenamiento.
Regresión 001: verify, tipos, lint, formato, pruebas/build frontend, Docker limpio,
Compose, salud 200/503/recuperación, Swagger, E2E 001/002, auditorías, actionlint,
comprobación documental y búsqueda acotada de secretos. Sin base en memoria.

## Ejecución y cierre

Precondición limitada a veinte minutos; no repetir AG-009 completo antes de empezar.
Aplicar ADR-0002 a transitivas sin repetir la investigación Angular de 001.
Máximo dos correcciones por problema; bloquear solo criterio afectado y continuar
trabajo independiente salvo riesgo global de autenticación, datos, build o entrega.
Reservar cierre seguro y comprobar estado a las ocho horas como máximo.
Si 002 queda completamente verificada localmente y restan al menos sesenta minutos,
solo podrá prepararse especificación borrador de 003, sin plan, tareas ni código.

Resultados, archivos, riesgos y pendientes se conservan en [validación](validacion.md)
y en el informe AG-010. La persona responsable conserva aceptación y operaciones Git.
