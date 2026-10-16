# Validación — 002 Identidad y acceso

**Estado:** Verificada localmente en AG-010; aceptación e integración pendientes.
**Autorización:** AG-010. No supone aceptación ni integración.

## Entorno y alcance de las evidencias

Inicio registrado 2026-10-13 23:55:26 +02:00; límite 2026-10-14 09:55:26 +02:00,
Europe/Madrid. Windows/PowerShell, Java 21.0.12.1, Node 24.13.0, npm 11.6.2,
Docker Engine 29.1.3, Compose 2.40.3-desktop.1 y PostgreSQL 17.11 real.
Las pruebas de integración usan Testcontainers aislados y Compose conserva el
volumen de entrada. No se usa una base en memoria.

Evidencia nueva exclusivamente en `qa/evidencias/ag010/` y temporales ignorados.
El [informe AG-010](../../docs/trazabilidad/AG-010-informe.md) registra incidencias,
roles, tiempos, revisión, archivos y pendientes. Las huellas relacionan resultados
con fuentes concretas; no demuestran operaciones anteriores a su captura.

La precondición terminó dentro de veinte minutos: verify heredado de 13 pruebas,
Spotless/SpotBugs, npm ci/build, herramientas, Compose y documentos PASS.
No se repitió toda AG-009 antes de implementar.

## Matriz IA

La [matriz backend](../../qa/evidencias/ag010/backend-resultados.md) relaciona
cada caso con su clase; [backend-pruebas.json](../../qa/evidencias/ag010/backend-pruebas.json)
conserva los 55 resultados individuales. PASS significa observado localmente.

| ID | Resultado esperado y observado | Evidencia principal | Estado |
|---|---|---|---|
| IA-01 | UUID, correo normalizado único, cuatro roles y múltiples roles por usuario; restricciones y permisos PostgreSQL | IdentidadDominioTest, IdentidadAccesoIT; cuatro cuentas reales Compose | PASS |
| IA-02 | Argon2id 19456 KiB/t=2/p=1; 15–128 puntos de código, Unicode/espacios, sal y lista común; no texto claro | IdentidadDominioTest; agregado Compose 4/4 hashes Argon2id | PASS |
| IA-03 | Aprovisionamiento local explícito, validado e idempotente; normal/test no crean demos, vacíos omitidos y parciales rechazados | PerfilesIdentidadIT, reinicios Compose | PASS |
| IA-04 | Login mínimo, refresh solo cookie; mismo 401 ausente/incorrecta/deshabilitada/bloqueada y hash ficticio | ServicioAutenticacionTest, IdentidadAccesoIT, compose-sesiones.json | PASS |
| IA-05 | Cinco fallos/15 min, bloqueo 15 min persistido, reloj controlado y éxito restablece | IdentidadDominioTest, IdentidadAccesoIT, PerfilesIdentidadIT | PASS |
| IA-06 | RS256/claims/duración, firma, algoritmo, issuer, audience, fechas y sid; rechazo tras revocación | JwtYClavesTest, IdentidadAccesoIT, 88 controles Compose | PASS |
| IA-07 | RSA efímera local/test y externa obligatoria normal; formatos/rutas/pareja válida; refresh sobrevive reinicio | JwtYClavesTest, PerfilesIdentidadIT, compose-sesiones.json | PASS |
| IA-08 | Refresh 256 bits opaco, SHA-256, ocho horas absolutas; rotación transaccional y reuse revoca pese a 401; concurrencia real | ServicioAutenticacionTest, IdentidadAccesoIT, Compose | PASS |
| IA-09 | HttpOnly/Strict/ruta/sin Domain/Max-Age; Secure según entorno y borrado explícito | CookiesIdentidadTest, IdentidadAccesoIT, Compose | PASS |
| IA-10 | Cookie XSRF materializada y cabecera Angular; tres POST rechazan CSRF ausente incluso con Bearer; CORS cerrado | IdentidadAccesoIT, ControladorSaludTest, pruebas Angular | PASS |
| IA-11 | Renovación no amplía familia; logout 204 revoca sid, cookie y caché; carrera refresh/logout queda revocada | ServicioAutenticacionTest, IdentidadAccesoIT, Compose | PASS |
| IA-12 | /yo exige Bearer y devuelve cuatro campos públicos; roles backend, method security, 401/403 y default deny | IdentidadAccesoIT; cuatro roles Compose | PASS |
| IA-13 | Signals en memoria, rutas/guard/interceptor, restauración, refresh compartido/reintento único, logout y formulario accesible | 56 pruebas Angular; 8 E2E Compose | PASS |
| IA-14 | SDD/ADR, OpenAPI Bearer, CI, seguridad/documentación/evidencia preservada | Regresión, revisión independiente y controles finales siguientes | PASS local; CI remota pendiente |

Argon2: cinco muestras locales de 22, 22, 23, 23 y 22 ms por hash. No son un
benchmark ni acreditan igualdad temporal de respuestas. No enumeración significa
forma/código genéricos y verificación ficticia, no resistencia temporal universal.

## Ejecuciones y regresión 001

| Comprobación ejecutada | Observado | Evidencia AG-010 |
|---|---|---|
| Backend `mvnw.cmd -B spotless:apply verify` íntegro | PASS 55/55: 33 unitarias/MockMvc + 22 IT; 0 fallos/errores/omitidas; Spotless y SpotBugs PASS | backend-verify-05.log; backend-pruebas.json |
| Frontend tipos/lint/formato/tests/build | PASS; 56 pruebas en 10 suites; build 262,71 kB | frontend-resultados.json y logs referidos |
| Docker frontend/backend `build --no-cache` | PASS ambas imágenes; pruebas backend separadas del empaquetado Docker | docker-frontend-sin-cache.log; docker-backend-sin-cache.log |
| Compose `up -d --no-build --wait` | PASS tres servicios saludables, cuatro cuentas ficticias | compose-arranque.log |
| `verificar-compose.ps1` | PASS V1/V2 idénticas tras stop/start; caída PostgreSQL 503 en 2017 ms; recuperación 200; navegador error/disponible | compose-persistencia-caida.json; navegador-error.json; navegador-disponible.json |
| `verificar-sesiones-compose.mjs` | PASS 88 controles; cuatro roles, cookies, logout, clave efímera nueva, refresh persistente y reuse | compose-sesiones.json |
| Ajustes y almacenamiento PostgreSQL efectivos | PASS siete ajustes logging; 4 usuarios/4 Argon2id/4 roles; 0 refresh con longitud hash incorrecta; V1/V2 | compose-configuracion-efectiva.json |
| E2E 001 + 002 | PASS 8/8 (5 base + 3 identidad), 3,3 s, sin reintentos; capturas escritorio/móvil inspeccionadas | frontend-e2e-01.txt; frontend-e2e-01.xml; frontend-*.png |
| `npm audit --omit=dev --json` y `npm audit --json` | PASS cero vulnerabilidades comunicadas | npm-audit-produccion.json; npm-audit-completo.json |
| OSV offline npm producción/completo | PASS 7/653 componentes únicos sin coincidencias | npm-produccion-osv.json; npm-completo-osv.json |
| OSV offline Maven final | PASS 132 componentes sin coincidencias, BC 1.86 | maven-osv.json; maven.cdx.json; maven-auditoria-02.log |
| Actionlint 1.7.12 y sintaxis JS QA | PASS local; CI remota no ejecutada | actionlint-final.json; actionlint-02.log |
| Enlaces/secretos documentales y búsqueda acotada de credenciales | PASS; cantidades y fecha exactas en los JSON posteriores a la consolidación | documentacion-control.json; datos-sensibles-control.json |
| Preservación histórica y manifiesto por SHA-256 | PASS 303 protegidos intactos, prefijo histórico CSV conservado | entrega-integridad.json; entrega-manifiesto.json |
| Parada final | PASS tres servicios detenidos y volumen conservado; backend 143 corresponde a SIGTERM | compose-cierre.json |

La regresión actual incluye las clases de salud/persistencia de 001 y adapta
sus expectativas a V2, seis rutas OpenAPI y API anónima denegada. La migración
inválida de prueba pasa de V2 a V999 para evitar colisión con V2 real; no cambia V1.
No se presentan las pruebas antiguas como ejecuciones actuales.

## Revisión e incidencias

Otro agente realizó revisión de solo lectura por instrucción, sin ejecutar
pruebas ni reparar. El permiso efectivo es workspace-write: no se acredita
aislamiento técnico de solo lectura. Su revisión parcial contrastó 56/56 huellas
backend y 26/26 frontend. La revisión consolidada de integración/documentación
no halló nuevos bloqueantes. Su [informe](../../qa/evidencias/ag010/revision-independiente.md)
dejó al coordinador los metadatos y controles mecánicos finales, aquí acreditados.

- R-002-01: corregida aceptación de pareja RSA de igual módulo pero exponente
  incompatible; desafío firma/verificación y prueba negativa PASS.
- R-002-02: diagnóstico PostgreSQL podía revelar hash en DETAIL. Ajustes de
  servidor y JDBC, restricción real en Testcontainers y configuración efectiva
  Compose comprobadas. Se conserva ERROR/SQLSTATE; no se afirma sanitización universal.
- Aprovisionamiento: se uniformó precisión temporal a segundos para evitar un
  fallo de restricción al iniciar sesión inmediatamente; regresión PASS.
- Fallos auxiliares de sandbox, tipos, fixtures Mockito, expectativas y formato
  constan en relevos backend/frontend. Ningún defecto agotó dos correcciones fallidas.
- Auditoría inicial BC 1.83: cinco avisos; superficies no usadas por Argon2 del
  producto. Se retiró la versión, se fijó 1.86 y se repitieron auditoría y verify.
  Véase [auditorías](../../qa/evidencias/ag010/auditorias.md).
- Incidencia Git: se lanzó `git status --short` antes de leer la prohibición del
  adjunto. Salida vacía, sin mutaciones. No se ejecutó nuevamente Git.

## Límites y pendientes

CI remota pendiente del push humano posterior. Aceptación, integración y
publicación pertenecen a la persona responsable. No existe HTTPS público probado.
Tokens robados/XSS, coordinación entre pestañas, disponibilidad de PostgreSQL y
rotación operativa de claves conservan los límites explicados en
[seguridad técnica](../../docs/documentaciondev/seguridad.md) y ADR-0003.
Las auditorías no cubren vulnerabilidades desconocidas ni todo el SO de imágenes;
accesibilidad básica no equivale a auditoría WCAG completa. Ninguna categoría
OWASP se declara íntegramente verificada por este incremento.
