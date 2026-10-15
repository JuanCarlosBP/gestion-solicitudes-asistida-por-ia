# Validación — 005 Aprobaciones

**Estado:** Verificada localmente en AG-012; aceptación e integración humanas pendientes
**Autorización:** AG-012, decisiones D-005-01–08 y condición de continuación cumplida.
Inicio de fase:2026-10-15T00:09:52+02:00, Europe/Madrid; límite09:34:02+02:00.
Restaban564 minutos. Evidencia `qa/evidencias/ag012/puerta005.json`.

004 está verificada localmente y congelada en `qa/evidencias/ag012/cierre004/`:
144 backend,275 Angular,11 E2E y API119+88+78 PASS; revisión sin hallazgos abiertos.
El snapshot de228 fuentes permite reconstruir la fase anterior sin usar Git.

## Matriz AP

| Criterio | Resultado observado | Evidencia principal |
|---|---|---|
| AP-01 Aprobar | PASS: PRESENTADA, supervisor asignado vigente, versión/fecha del servidor y un evento. | AprobacionesIT, API140 y E2E aprobación. |
| AP-02 Textos | PASS: comentario opcional≤500, motivo10–1000, Unicode/recorte, UTF-16 inválido, NUL, extras/tipos/límites. | Dominio8, IT, Angular71 nuevas y E2E rechazo. |
| AP-03 Permisos | PASS: no autor, no administrador implícito, supervisor ajeno oculto, multirrol asignado y revocación antes de replay. | Dominio/HTTP/IT, API y E2E roles. |
| AP-04 Estados/inmutabilidad | PASS: borrador/finales no admiten decisión nueva; se conservan cabecera, conceptos, total, asignación y fotografía. | PostgreSQL/HTTP y E2E. |
| AP-05 Concurrencia | PASS: una decisión gana, otra409; versión incrementa una vez y evento único. | Carreras DB sincronizadas, API paralela y dos pestañas. |
| AP-06 Idempotencia | PASS: replay exacto compatible, incompatible409, reinicio, rollback conjunto y replay004 intacto. | IT, API y E2E. |
| AP-07 Lectura/bandeja | PASS: asignado+PRESENTADA forzados aun con roles globales; finales solo para lectores autorizados, sin textos en resumen. | JDBC/HTTP, Angular y E2E multirrol. |
| AP-08 Interfaz | PASS: confirmación, validación, progreso, resultado, conflicto, clave/cuerpo originales; teclado y360/768/1440. |346 Angular,14 E2E y revisión visual. |
| AP-09 Datos/evento | PASS: seis tablas y V1–V4 preservadas; evento único SELECT/INSERT y actor fotografiado; logs sin textos/claves reutilizables. | Migración IT/Compose, SQL/rollback y logs. |
| AP-10 Calidad/entrega | PASS: pruebas, Compose, auditorías, CI local, documentación, revisión independiente e integridad. | Evidencias y manifiesto AG-012. |

## Ejecuciones finales

Rutas de evidencia relativas a `qa/evidencias/ag012/`.

| Control | Resultado ejecutado | Evidencia |
|---|---|---|
| Backend001–005 |180 PASS:84 unitarias+96 integración PostgreSQL real;144 anteriores+36 nuevas. Cero fallos/errores/omitidas. |backend005-verify-final-api01.log; backend005-junit-api01/; backend005-pruebas-final-api01.json |
| Calidad backend |Spotless PASS; SpotBugs0 hallazgos/0 errores, sin exclusiones nuevas. |backend005-spotbugs-final-api01.xml y verify |
| Carreras DB005 |10 escenarios sincronizados observando bloqueos: decisiones distintas, misma clave compatible/incompatible, recursos y rol antes/durante commit. |AprobacionesIT y manifiesto de casos |
| Rollback005 |Fallo real tras cambiar estado y tras insertar evento: sin estado parcial, evento ni resultado; sin éxito técnico anticipado. |AprobacionesIT |
| Frontend001–005 |346 PASS en19 archivos;275 anteriores+71 nuevas. Tipos/lint/formato/build PASS. |frontend005-resumen.json y logs asociados |
| Bundle |main-DW2S3G7C.js; total418,93kB sin advertencias. |frontend005-build-final.log; frontend005-huellas.csv |
| API005 |140 PASS: precisión de fixtures, siete logins, permisos, textos, cuatro carreras HTTP, revocación y replay tras reinicio. |api005-final/compose-aprobaciones.json |
| Regresión API001–004 |Sesiones88, proveedores78, solicitudes119 PASS. |api001-004-final005/ |
| Docker |Builds sin caché; manifestlist runtime coincide con logs. |docker-backend-final005-api01.log; docker-frontend-final005.log; imagenes005-final.json |
| V4→V5 real |Seis tablas conservan conteos/huellas; checksumsV1–V4 intactos; V5success y evento inicialmente vacío. |evolucion005/; v5-migracion.log |
| Compose |Stop/start conservaV1–V5; PostgreSQL caído503 en2018ms y recuperación200; navegador ejecutado. |compose005-final/compose-persistencia-caida.json |
| E2E001–005 |14/14 PASS sin reintentos,21,5s:11 anteriores+3 aprobaciones. |e2e005-final.log; e2e005-final/e2e.xml |
| Auditorías |Inventarios idénticos a004; npm producción/completa0 vulnerabilidades y OSV Maven132 componentes sin hallazgos, de esta sesión. |auditorias005-continuidad.json; npm-audit-resumen.json; maven-osv.json; osv-fuente.json |
| CI local |Actionlint/sintaxis QA PASS; ActionsSHA, una ejecución porPR y evidencias porjob; API/E2E005 incorporadas. |actionlint005-final.log y workflow |

OpenAPI tiene16 rutas. IT comprueba éxitos200/201 y ErrorPublico para
400/401/403/404/409/500/503 en las siete operaciones de solicitudes, incluido
PaginaResumenSolicitud con elementos ResumenSolicitud. Swagger ejecuta salud
real en E2E. Sin cambios de dependencias, versiones mayores ni exclusiones.

## Incidencias y correcciones conservadas

- Fixture Java UTF-16: BodyPublisher sustituía surrogate inválido por «?»; escape
  JSON crudo reproduce la entrada inválida. Primera corrección PASS, sin cambiar
  producto. `backend005-http-postgres-01.log` y enfocada02.
- R005-QA01: AJENO sin rol devuelve403 antes de evaluar recurso; SUPERVISOR ajeno
  conserva404. Expectativa corregida y ambos negativos PASS en API final.
- R005-UI01: trim omitía NEL/U+001C–1F. Una corrección comparte normalizador para
  validación/confirmación/cuerpo; máximos500/1000, NUL, BOM y reintentos0/500/503
  probados. Angular346 y revisión independiente PASS.
- R005-QA02: primer login supervisor QA falla por23514/fechas_usuario: creado
  22:25:11.035473UTC frente a actualización truncada22:25:11.000UTC. Los200 logins
  posteriores se conservan como diagnóstico insuficiente por sí solo. Primera
  corrección solo QA: fechas a segundos y aserción previa. API140 y regresión119
  pasan con fixtures nuevos; identidad/restricciones intactas. Evidencias
  `login005-causa-postgresql.log` y `login005-causa-fecha.log`, sin filas completas.
- R005-QA03: Tab comenzaba antes del foco asíncrono de retorno al textarea.
  Espera explícita conservando controles/Enter/visibilidad: enfocada3/3 y final14/14
  PASS en primera corrección; producción intacta.
- R005-API01: ausencia200 y esquemas de error inferidos incorrectamente. Primer
  intento pierde registro del DTO004; segundo completa éxitos/errores de siete
  operaciones. Enfocada1/1, backend180 y E2E14 PASS. Intentos y regresión con
  sufijoapi01 conservados.
- Captura inicial posmigración consulta historial antes del commitV5. Datos
  intactos; repetición tras salud200 PASS. Se conserva
  `evolucion005/v5-datos-despues-inicial.json`; no se repara ni edita V5.

Ningún problema acumula dos correcciones fallidas. No se retiraron controles ni
se sustituyó un fallo inexplicado por repeticiones hasta obtener PASS.

## Interfaz y revisión

Capturas de bandeja, confirmaciones y resultados en360/768/1440, conflicto768.
Tab/Enter comprueban foco y geometría real; se conserva la prueba004 de barra
sticky. Coordinador y revisor inspeccionan capturas sin recortes/solapamientos;
el motivo HTML permanece como texto. Bundle y fuentes coinciden con huellas.
Es revisión acotada, no auditoría WCAG completa.

Revisor personalizado en lectura por instrucción, sin aislamiento técnico
acreditado: contrasta23 huellas backend,81 frontend,17XML, rollback/carreras,
OpenAPI/API, imágenes y capturas. Confirma cierre técnico y documental sin hallazgos
abiertos. Enlaces/patrones e integridad comprobados;496 huellas protegidas y63
históricas, prefijo CSV, V4 y snapshot004 intactos. Registro en `revision005-preliminar.md` y
revisión final. No ejecuta pruebas ni repara durante su revisión.

## Límites y siguientes pasos

CI remota tras push humano; aceptación/integración pendientes. Sin prueba de
carga100000, HTTPS público o auditoría integral OWASP/ASVS/WCAG. Sin reasignación,
reapertura, delegación, borrado físico, purga de idempotencia o historial avanzado.
Retención jurídica pendiente. Datos QA ficticios conservados; Compose detenido
al cierre sin borrar volumen.006 solo borrador tras cerrar AP-10 y comprobar45min
restantes; no autoriza plan, tareas, validación ni código006.

Puerta006 cumplida a2026-10-15T00:39:11+02:00 con534 minutos restantes, después
del cierre documental/CSV005 y comprobación de integridad. Se redactó únicamente
su especificación borrador pendiente de aprobación humana; `puerta006.json`.
