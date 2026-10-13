# AG-010 — Identidad y acceso

**Estado:** 002 verificada localmente; aceptación e integración pendientes.
**Autorización:** orden humana AG-010 para definir, implementar y comprobar 002.
Especificación, plan y tareas fueron aprobados en la propia orden, sin segunda
aprobación documental. No se declara aceptación ni integración.
**Workspace:** `C:/Users/carli/gestion-solicitudes-asistida-por-ia`.
**Rama comunicada:** `feature/002-identidad-acceso`; no se verifica mediante Git.

## 1. Tiempo, entorno y coordinación

Inicio registrado: **2026-10-13 23:55:26 +02:00**, Europe/Madrid.
Límite absoluto: **2026-10-14 09:55:26 +02:00**; máximo diez horas.
Cierre registrado: **2026-10-14 00:32:05 +02:00**. Duración desde el inicio
registrado: **00:36:39**; 563 minutos antes del límite. Véase
[cierre.json](../../qa/evidencias/ag010/cierre.json). La lectura inicial precedió
a la primera consulta del reloj; no se inventa una hora más precisa.
La precondición terminó dentro de cinco minutos, por debajo del máximo de veinte.

Windows/PowerShell, Java 21.0.12.1, Node 24.13.0, npm 11.6.2,
Docker Client/Engine 29.1.3, Compose 2.40.3-desktop.1, PostgreSQL 17.11 real.
Sandbox workspace-write, auto_review y red restringida; elevaciones puntuales
para Docker, descargas y procesos de pruebas Windows. Cachés y temporales en el
workspace. No se cambian herramientas globales ni versiones mayores.

Nivel 1 de orquestación: planificador `analisis_preparacion`, implementadores
`backend_identidad` y `frontend_identidad`, revisor `revision_seguridad_002`.
Coordinador como escritor de SDD, docs, infraestructura, CI y QA conjunta.
Backend y frontend tienen propietarios separados; contrato acordado antes del código.
Planificador/revisor trabajan solo lectura por instrucción. Su permiso efectivo
es workspace-write: no existe aislamiento técnico de escritura acreditado.
Otro agente revisa; esa independencia no significa aceptación humana.

Skills SDD, QA, documentación y seguridad aplicadas mediante lectura de sus
SKILL.md locales; no se afirma invocación nativa ni aprobación automática.
No se dedicó tiempo prolongado a capacidades opcionales del arnés.

## 2. Requisitos IA-01 a IA-14

La [validación](../../especificaciones/002-identidad-acceso/validacion.md) contiene
matriz completa esperado/ejecutado/observado y referencias a casos individuales.

| Requisito | Entrega comprobada |
|---|---|
| IA-01 | Usuarios UUID, correo normalizado único, cuatro roles y múltiples roles. |
| IA-02 | Argon2id 19 MiB/2/1, política 15–128 puntos de código, Unicode/espacios y lista común local. |
| IA-03 | Cuatro demos ficticias solo perfil local, variables, idempotencia y fallo atómico de grupos inválidos. |
| IA-04 | Login con respuesta mínima y 401 genérico equivalente; hash ficticio para usuario ausente. |
| IA-05 | Cinco fallos/15 min, bloqueo 15 min persistido y Clock comprobado. |
| IA-06 | JWT RS256 diez minutos, claims mínimos y validación completa más sid activo. |
| IA-07 | RSA efímera 2048 local/test; externa obligatoria normal por ruta/PEM; pareja validada criptográficamente. |
| IA-08 | Refresh opaco 256 bits, hash SHA-256, familia ocho horas, rotación transaccional y reuse revoca. |
| IA-09 | Cookie HttpOnly/Strict/Path limitado/Max-Age/sin Domain, Secure por entorno y borrado. |
| IA-10 | Cookie XSRF, cabecera Angular, tres POST protegidos incluso con Bearer y CORS cerrado. |
| IA-11 | Refresh no extiende familia; logout 204 revoca JWT por sid, refresh y caché. |
| IA-12 | /yo protegido devuelve id/correo/nombreVisible/roles; backend autoriza y deniega por defecto. |
| IA-13 | Acceso/cuenta, signals solo memoria, guard/interceptor, restauración, refresh compartido y accesibilidad básica. |
| IA-14 | OpenAPI, SDD/ADR, documentación, CI y evidencias propias; control final en este informe. |

IA-01–IA-14 PASS local. La [revisión independiente](../../qa/evidencias/ag010/revision-independiente.md)
no encontró nuevos bloqueantes. El coordinador consolida los metadatos y controles
finales; no los atribuye a una nueva revisión que el otro agente no realizó.

## 3. SDD, ADR, migraciones y arquitectura

Creados antes del código: [especificación](../../especificaciones/002-identidad-acceso/especificacion.md),
[plan](../../especificaciones/002-identidad-acceso/plan.md),
[tareas](../../especificaciones/002-identidad-acceso/tareas.md) y
[ADR-0003](../decisiones/ADR-0003-identidad-jwt-y-sesiones.md), con aprobación humana AG-010.
Validación se completó conforme se obtuvieron resultados, sin aprobar por la persona.
El ADR explica JWT, memoria, refresh/hash/cookie, estado PostgreSQL, RS256,
revocación, riesgos y alternativas rechazadas. No se presenta como servidor OAuth completo.

V2 `backend/src/main/resources/db/migration/V2__identidad_y_acceso.sql` crea
`roles`, `usuarios`, `usuarios_roles`, `sesiones_acceso` y `tokens_refresco`.
Incluye UUID, timestamptz, unicidad, FK compuesta/diferida de token actual,
restricciones de estado/fechas/hash, índices, versión de usuario y permisos mínimos.
V1 y la historia previa permanecen intactas. Base nueva, segundo arranque,
migración inválida, roles y PostgreSQL aislado se probaron realmente.

Módulo `identidad`: dominio, aplicación, persistencia JDBC, HTTP y configuración.
Spring Resource Server/JwtEncoder/JwtDecoder, transacciones y bloqueo de sesión
serializan renovación y cierre. Reuse devuelve 401 después de confirmar revocación.
Angular organiza identidad por funcionalidad; Nginx mantiene el mismo origen.
Sin microservicios, Redis, otra base ni módulos de negocio nuevos.

## 4. API y recorrido

| Método/ruta | Comportamiento |
|---|---|
| GET /api/autenticacion/csrf | 204 y materializa XSRF-TOKEN. |
| POST /api/autenticacion/iniciar-sesion | JSON correo/contrasena + XSRF; accessToken, tipoToken, expiraEn y usuario; refresh solo cookie. |
| POST /api/autenticacion/renovar | Refresh HttpOnly + XSRF; rota cookie y emite JWT nuevo. |
| POST /api/autenticacion/cerrar-sesion | Refresh + XSRF; revoca sesión, borra cookie, 204 y Clear-Site-Data cache. |
| GET /api/identidad/yo | Bearer válido; solo cuatro campos públicos del usuario. |

GET `/api/salud` permanece público; Swagger/OpenAPI se publican en local/test.
Otras APIs se deniegan; 401 no autenticado y 403 CSRF/permiso. Errores controlados.

Al arrancar Angular obtiene CSRF e intenta restaurar con refresh. Login deja JWT
solo en memoria y el navegador conserva el refresh HttpOnly. Un 401 comparte una
única renovación y reintenta una vez. Logout impide respuestas tardías que
restauren estado, revoca sid en PostgreSQL y devuelve al acceso.
No hay tokens en Web Storage, URL, logs ni refresh en JSON.
Al reiniciar local cambian claves, el JWT anterior falla y el refresh persistido
obtiene uno válido; se comprobó por HTTP contra el contenedor real.

## 5. Pruebas y regresión ejecutadas

| Área | Resultado real y evidencia |
|---|---|
| Precondición 001 | Verify 13 pruebas, Spotless/SpotBugs, npm ci/build, herramientas y Compose PASS. [precondicion.json](../../qa/evidencias/ag010/precondicion.json) |
| Backend final | Verify íntegro PASS: 33 unitarias/MockMvc + 22 IT = **55**, sin fallos/errores/omitidas; Spotless/SpotBugs PASS. [relevo](../../qa/evidencias/ag010/backend-resultados.md) |
| Angular | **56 pruebas**, 10 suites; tipos/lint/formato/build PASS. [relevo](../../qa/evidencias/ag010/frontend-resultados.json) |
| Docker | Backend y frontend `build --no-cache` PASS; pruebas ejecutadas por separado. Logs docker-*-sin-cache.log en AG-010. |
| Compose y regresión | Tres servicios saludables; V1/V2 preservadas en stop/start; caída real 503 en 2017 ms y recuperación 200, también en navegador. [resultado](../../qa/evidencias/ag010/compose-persistencia-caida.json) |
| Sesiones reales | **88 controles PASS**: cuatro roles, identidad/cookies, logout, reinicio, refresh persistente, rotación y reuse. [resultado](../../qa/evidencias/ag010/compose-sesiones.json) |
| E2E | **8/8 PASS**, 5 base + 3 identidad, 3,3 s, sin reintentos. Swagger seis rutas, teclado/foco/móvil, recarga y ausencia de tokens. [JUnit](../../qa/evidencias/ag010/frontend-e2e-01.xml) |
| Inspección visual | Capturas acceso escritorio/móvil y cuenta ficticia revisadas sin recortes ni superposiciones observadas. frontend-*.png en AG-010. |
| PostgreSQL efectivo | Siete ajustes de logging comprobados; 4 usuarios/4 Argon2id/4 roles y hashes refresh de 32 bytes. [agregados](../../qa/evidencias/ag010/compose-configuracion-efectiva.json) |
| Controles de entrega | Actionlint 1.7.12, sintaxis JS, enlaces, búsqueda acotada y huellas. Resultados finales en manifiestos AG-010. |

Concurrencia no simulada: dos conexiones esperan el bloqueo real y se comprueba
revocación de la familia y del resultado ganador. Carrera refresh/logout probada.
Argon2 medido cinco veces: 22, 22, 23, 23 y 22 ms; no se presenta como benchmark.
Regresión 001 adapta expectativas a V2/seis rutas/deny; el fixture inválido pasa
de V2 a V999. No se altera la migración V1 ni evidencia histórica.

## 6. Dependencias y CI

Auditorías npm producción/completa: salida 0, cero vulnerabilidades comunicadas.
OSV offline adicional: npm 7 componentes de producción y 653 únicos completos,
sin coincidencias. Lockfile frontend y dependencias directas permanecen iguales.
Se aplica ADR-0002, sin repetir la investigación de Angular de 001.

Maven inicial detectó cinco avisos en nueva BC 1.83 (dos críticos, dos altos,
uno moderado), para superficies no usadas por Argon2 del producto. Se eliminó esa
versión igualmente y se fijó **1.86**, con plan actualizado, sin cambio mayor.
Maven final: **132 componentes, cero coincidencias**; verify posterior PASS.
[Auditorías](../../qa/evidencias/ag010/auditorias.md) preservan avisos iniciales,
aplicabilidad, fuentes, limitaciones y resultados finales; no se ocultaron fallos.

CI actualizada conserva `contents: read`, acciones por SHA, checkout sin
credenciales persistidas, una ejecución por PR, concurrencia y salidas aisladas.
Java/Node fijados, Docker 29.1.3 y Compose 2.40.3; binarios verificados por SHA-256.
Jobs backend, frontend y Compose incluyen identidad, reinicio, E2E y auditorías.
Actionlint 1.7.12 local PASS. **CI remota pendiente del push humano posterior**;
no se ejecutó Git para provocarla ni se presentaron históricos como actuales.

## 7. Hallazgos, correcciones e incidencias

R-002-01 (media, IA-07): igual módulo RSA no basta para comprobar pareja externa.
Se firma/verifica un desafío aleatorio; prueba de exponente incompatible PASS.
R-002-02 (IA-02/IA-14): un fallo de restricción podía incluir hash en DETAIL.
Se configura PostgreSQL terse/sin sentencias/parámetros y JDBC sin detalles;
Testcontainers comprueba un fallo real conservando ERROR/SQLSTATE, y Compose
confirma ajustes efectivos. Logs se inspeccionan en memoria, sin conservar valores.
Un hash derivado ficticio del fallo inicial fue redactado en log/reportes fallidos;
se mantiene constancia del fallo. No se detectaron secretos reales.

Otros defectos resueltos: precisión temporal del alta local frente a login
inmediato; expectativa FACTOR_BEARER de Spring Security 7; fixture Mockito con
stubbing anidado; SecureRandom de un solo uso detectado por SpotBugs; tipo de
Observable y formato frontend. Los relevos preservan cada intento y resultado.
Sandbox impidió DNS/attach/paquetes en primeras ejecuciones; permisos puntuales
permitieron ejecutar las pruebas reales. Ningún defecto agotó dos correcciones fallidas.

**Incidencia Git:** antes de leer el adjunto con la prohibición se lanzó
`git status --short` en paralelo con su lectura. Terminó sin salida ni mutaciones.
Se informó inmediatamente. Después no se ejecutó Git. Por ello **no se confirma
ausencia absoluta de Git**; no hubo add, commit, push, pull, cambio de rama,
integración, PR ni despliegue.

Auto-review rechazó inicialmente npm audit porque el envío del inventario requería
autorización específica. Se preparó alternativa offline y se pidió esa autorización.
El usuario autorizó expresamente npm audit y consultas de solo lectura de
dependencias/vulnerabilidades/documentación, sin código, archivos, credenciales,
tokens, secretos ni datos privados. La repetición autorizada pasó; no queda bloqueo.

La consulta pública de sumas Compose devolvió bytes: se corrigió su representación
a UTF-8 antes de usar la suma, sin cambiar el valor. La copia de MEMORY de entrada
se renombró de .md a .txt para que no se interpretaran sus enlaces relativos fuera
de ubicación; el contenido histórico se preservó. El primer control documental
fallido también se conserva. No se eliminaron pruebas para hacer pasar controles.

## 8. Archivos, preservación y commits propuestos

[Manifiesto de entrega](../../qa/evidencias/ag010/entrega-manifiesto.json) enumera
cada archivo creado, modificado o eliminado con SHA-256 anterior/final.
Los archivos nuevos de evidencia se enumeran separadamente para evitar hashes
circulares. La única eliminación de fuente corresponde al fixture V2 inválido,
sustituido por V999; no es una migración de producto eliminada.
[Integridad](../../qa/evidencias/ag010/entrega-integridad.json) compara 303 archivos
protegidos y el prefijo de 34796 bytes del CSV; ningún histórico autorizado a cambiar.
AG-003–AG-009, REV-001, ADR-0001/0002, V1 y configuración de agentes se conservan.

El [manifiesto de commits](../../qa/evidencias/ag010/manifiesto-commits.json)
es propuesta exclusivamente para la persona responsable, con estos grupos:

1. SDD y ADR: `docs(sdd): definir identidad y acceso aprobados en AG-010`.
2. Backend, V2 y pruebas: `feat(identidad): autenticar y revocar sesiones con JWT y refresh`.
3. Angular y E2E: `feat(frontend): incorporar acceso y cuenta con sesión en memoria`.
4. Infraestructura, CI y QA: `ci(qa): verificar identidad en Compose y proteger evidencias`.
5. Documentación y evidencia: `docs(ag010): registrar validación, revisión y entrega local`.
6. Borrador opcional: `docs(proveedores): proponer especificación 003 para revisión humana`.

## 9. Riesgos, pendientes y siguiente paso

JWT robado sigue siendo credencial hasta expiración/revocación. HttpOnly no evita
que XSS opere dentro de una sesión. PostgreSQL es necesario para validar sid y
su caída rechaza acceso. Dos pestañas no coordinadas pueden activar reuse y cerrar
la familia de forma segura. Bloqueo por cuenta permite indisponibilidad temporal
inducida. Lista común de contraseñas es local y acotada; sin MFA/recuperación/CRUD.
No se probó HTTPS público, rotación operativa ni múltiples instancias con claves
externas. Logs más restrictivos pierden detalle diagnóstico; no sanitizan todos
los errores posibles. Accesibilidad básica no equivale a auditoría WCAG completa.
Auditorías/búsquedas no garantizan ausencia de vulnerabilidades desconocidas,
de todo secreto ni de problemas en el SO de las imágenes. OWASP sigue parcial.

Pendientes externos: push humano, ejecución/revisión de CI remota, aceptación e
integración humanas. Ninguno se representa como realizado. La base 001 conserva
su aceptación/integración pendiente y PR borrador #1 intacta.
Siguiente paso: la persona responsable revisa fuentes/evidencias y decide Git/CI.
No se crean tareas recurrentes ni se reanuda trabajo después de la entrega.

## 10. Condición opcional 003 y cierre

La verificación local se registró el 2026-10-14 a las 00:30:38 +02:00, con
564 minutos de margen: [registro](../../qa/evidencias/ag010/verificacion-local.json).
Después de completar los controles documentales y de integridad se creó únicamente
[especificación 003](../../especificaciones/003-proveedores/especificacion.md),
**Borrador pendiente de aprobación humana**, con campos, operaciones, permisos,
búsqueda, paginación, validaciones, duplicados, errores y preguntas abiertas.
No se crearon plan, tareas, validación, migraciones ni código de proveedores.

La [parada final](../../qa/evidencias/ag010/compose-cierre.json) conserva volumen
y datos ficticios; los tres servicios están detenidos. Backend termina con 143
por SIGTERM de la parada deliberada; los otros dos con 0. No se elimina .env
del usuario. Tras la entrega, la sesión se detiene sin trabajo programado.
