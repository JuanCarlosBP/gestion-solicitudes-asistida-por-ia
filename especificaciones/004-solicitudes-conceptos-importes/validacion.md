# Validación — 004 Solicitudes, conceptos e importes

**Estado:** Verificada localmente en AG-012; aceptación e integración humanas pendientes
**Autorización:** AG-012. No significa aceptación ni integración.
Inicio2026-10-14 23:34:02+02:00; límite2026-10-15 09:34:02+02:00, Europe/Madrid.

Precondición: Java21.0.12.1, Node24.13.0, npm11.6.2, Docker29.1.3 disponibles.
Compile backend y build Angular heredados PASS; Compose local ficticio arrancado.
Consulta de PR3/Actions solo lectura, sin Git. Fallo remoto exacto preservado en
[extracto](../../qa/evidencias/ag012/primer-fallo-remoto.txt).
Corrección y regresión003 en [adenda](../003-proveedores/validacion-ag012.md).

## Resultados ejecutados durante la construcción

Backend final004: `mvnw verify dependency:list` PASS144 (76 unitarias y68 de
integración PostgreSQL real), cero fallos/errores/omitidas; Spotless y SpotBugs
PASS, cero avisos. Incluye46 pruebas nuevas004:15 dominio y31 integración, con
rollback forzado, carreras reales y permisos SQL. Fuente de resultado:
`qa/evidencias/ag012/backend-verify-final-02.log`. El primer verify pasó pruebas
pero detectó cuatro avisos SpotBugs; se corrigieron sin exclusiones. El segundo
verify completo incorpora la validación Unicode y UTF-16 incompleto.

Build Docker backend sin caché final004 PASS:
`qa/evidencias/ag012/docker-backend-final004-02.log`. V4 validada en arranque
sobre volumen ficticio conservado. La corrección local de restricción y su
alineación Flyway se detallan en entorno y revisión, sin cambios V1–V3.

API sobre esa imagen y PostgreSQL Compose:

| Conjunto | Observado | Evidencia |
|---|---|---|
| Solicitudes004 |119 controles PASS, incluido reinicio/idempotencia y carreras HTTP| `qa/evidencias/ag012/api004-final/compose-solicitudes.json` |
| Identidad002 |88 controles PASS| `qa/evidencias/ag012/api001-003-final/compose-sesiones.json` |
| Proveedores003 |78 controles PASS| `qa/evidencias/ag012/api001-003-final/compose-proveedores.json` |
| npm producción/completo |0 vulnerabilidades registradas| `qa/evidencias/ag012/npm-audit-resumen.json` |
| OSV Maven offline |132 componentes, salida0| `qa/evidencias/ag012/maven-osv.json` |

La repetición API004 final incluye las correcciones de los negativos del
selector: filtro por nombre único y consulta explícita del usuario inhabilitado.
No se atribuye esa cobertura reforzada a la ejecución inicial119PASS.

Frontend antes deUI03:271 pruebas PASS (130 previas y141 nuevas), tipos/lint/formato/build
sin advertencias. Build limpio PASS. E2E001–004:11/11 PASS, incluye13 pasos de
solicitudes y caso de posiciones no consecutivas; UI01/UI02 cerrados. Primer
intento8PASS/3FAIL conservado: catálogo Swagger desactualizado y CSRF obsoleto
en dos llamadas de prueba, corregidos sin cambios de aplicación. Capturas en
`qa/evidencias/ag012/e2e004-final/`, log y XML del mismo nombre.

Compose sobre imágenes finales: persistencia V1–V4 tras stop/start, caída real
PostgreSQL503 y recuperación200 con navegador PASS; evidencia
`qa/evidencias/ag012/salud004-final/compose-persistencia-caida.json`.
IDs runtime vinculados a builds en `qa/evidencias/ag012/imagenes004-runtime.json`.

Revisión independiente confirma backend y cierre UI01/UI02. Un control adicional
real de Tab detectó R004-UI03: barra sticky ocultaba controles enfocados a768/1440;
evidencia `foco-barra004-inicial.json`. Primera corrección: directiva que mide la
barra y desplaza el foco sin animación; respeta la barra estática móvil. Prueba
independiente idéntica:62 pasos,0 ocultos frente a24 iniciales; evidencia
`foco-barra004-final.json`. Se añadió el mismo control a E2E.

Resultado definitivo frontend:275 pruebas PASS (130 previas+145 nuevas), tipos,
lint, formato y build sin advertencias; logs `frontend-ui03-*`. Build Docker
limpio `docker-frontend-final004-ui03.log`; bundle main-D2EWUAKY.js. E2E definitivo
11/11 PASS sin reintentos, `e2e004-ui03-final.log` y XML/capturas en su directorio.
La última repetición Compose en `salud004-ui03-final/` pasa persistencia,
caída503/recuperación200 y navegador. `imagenes004-final.json` identifica backend
18a9ac00… y frontend9e1a1dd6…, coincidentes con manifestlist de los builds.

## Matriz de aceptación técnica local

| Criterio | Resultado observado y evidencia principal |
|---|---|
| SCI-01 Crear borrador |PASS:201/Location, solo asunto, autor/número/fechas de servidor; dominio/IT, API y E2E paso1. |
| SCI-02 Consultar |PASS:detalle propio/global, fotografía y404 no visible; IT/API y E2E10–12. |
| SCI-03 Listar |PASS:filtros, páginas, orden, conteo visible, acentos y query params; IT/API, Angular y E2E13. |
| SCI-04 Guardar agregado |PASS:reemplazo completo, IDs exclusivos, posiciones no contiguas y rollback real; IT, UI01 y E2E específico. |
| SCI-05 Importes |PASS:10.00/10.31/1.01 y21.32, HALF_UP, límites/excesos; dominio/IT/API, cálculo Angular y E2E3. |
| SCI-06 Proveedor |PASS:referencia, baja bloquea sin perder borrador, fotografía estable; carreras IT y API; selector E2E7. |
| SCI-07 Supervisor |PASS:habilitación/rol/no autor, página acotada y bloqueo frente a cambio de rol; IT/API y E2E7/10. |
| SCI-08 Presentar |PASS:transición, foto/fecha/versión/resultado en transacción; rollback y carreras IT, API y E2E8. |
| SCI-09 Permisos |PASS:unión de roles explícitos, autor/recurso/estado, global solo lectura, CSRF/401/403/404; IT/API/E2E. |
| SCI-10 Conflictos |PASS:una edición gana,409 no sobrescribe, UI conserva y permite recargar;9 carreras IT, API y E2E5–6. |
| SCI-11 Idempotencia |PASS:replay exacto, incompatible409, mismo/distintoUUID, reinicio; IT/API y E2E9. |
| SCI-12 Interfaz/accesibilidad |PASS acotado:275 Angular,11 E2E, capturas360/768/1440, Tab62/0, Enter/foco/reduced-motion, UI01–03 cerrados. |
| SCI-13 Seguridad/eventos |PASS acotado:SQL parametrizado, privilegios mínimos, eventos sin cuerpos/credenciales y patrones de secretos; IT/API/auditorías/revisión. |
| SCI-14 Documentación/CI/evidencias |PASS local:SDD/ADR/contratos/índices, actionlint/sintaxis, auditorías, huellas, revisión y registro AG-012; CI remota pendiente de push humano. |

## Auditoría visual y revisión

Coordinador y revisor inspeccionaron las pantallas principales. Lista, editor y
detalle tienen capturas en360/768/1440; conflicto1440 y alta-error360 muestran
mensajes/foco. La geometría E2E verifica ausencia de desbordamiento horizontal.
La barra permanece visible en escritorio; el foco se mantiene por encima. En
móvil se coloca en flujo para conservar espacio útil. La inspección de capturas
no se presenta como auditoríaWCAG completa. Registro en
`qa/evidencias/ag012/revision-preliminar.md` y cierre independiente004.

## Límites y continuación

No se declara aceptación ni integración. Quedan CI remota, operación productiva,
carga100000, auditoríasWCAG/OWASP completas y retención jurídica posteriores.
Históricos:496 huellas iniciales y63 complementarias contrastadas, cero cambios;
prefijo CSV conservado. El cierre004 conserva huellas antes de cualquier005.
La continuación se decide mediante `qa/evidencias/ag012/puerta005.json`, usando
hora real y la autorización condicional del encargo; no por inferir aprobación.
