# AG-012 — Solicitudes, conceptos, importes y presentación

**Estado:** AG-012 cerrada;004 y005 verificadas localmente. Sin aceptación ni integración.
**Autorización:** orden humana integral AG-012, D004-01–11 y continuación005 condicionada.
**Inicio:** 2026-10-14T23:34:02+02:00; **límite:** 2026-10-15T09:34:02+02:00.
**Zona:** Europe/Madrid. **Cierre registrado:**2026-10-15T00:41:12+02:00.
**Duración:**01:07:10, dentro del límite de diez horas.
Rama comunicada: feature/004-solicitudes-conceptos-importes; no comprobada con Git.

## Alcance y preservación

Obligatorio004, continuación005 solo tras verificación completa y margen120min;
006 solo borrador después de005 verificada con45min. Ninguna operación Git,
integración de PR ni publicación. Históricos AG003–AG011, REV001, ADR0001–0004,
validaciones anteriores y prefijo CSV preservados mediante huellas/bytes iniciales.
Fuentes iniciales en qa/evidencias/ag012/huellas-entrada.json; no acreditan hechos
anteriores a su captura. Evidencias nuevas AG012 y temporales dentro del workspace.

## Precondición y defecto heredado

Java21.0.12.1, Node24.13.0, npm11.6.2 y Docker29.1.3 comprobados. Compile backend
y build Angular heredados PASS a23:35:28;1.43min desde inicio, dentro de20min.
Compose arrancado con infraestructura/.env.example y volumen ficticio heredado.
No se repitió toda AG011 antes de programar; la regresión adicional es la
exigida expresamente para el fallo heredado.

Consulta GitHub de solo lectura: PR3 abierta/borrador; run38633782500,
head cfc8db3fd8b019b46b41cf23edfb09898989e16e. Backend/frontend PASS remotos;
Compose falla en paso10 E2E003, esperaba1/recibió2. Extracto original conservado.
Reproducción local: esperaba1/recibió6 con catálogo acumulado, campos de búsqueda
vacíos en captura. No se ha demostrado un defecto del buscador SQL.
Corrección01 solo de prueba: UUID, dato Unicode dentro de límites, esperar foco
y fin de carga, denominación completa única, fiscal exacto y aserción de URL.
Enfocada PASS1/1 y regresión E2E PASS9/9 sin reintentos; backend verify PASS98,
Spotless/SpotBugs; Angular PASS130 y tipos/lint/formato/build. Regresión completa
antes del desarrollo sustancial004. [Adenda003](../../especificaciones/003-proveedores/validacion-ag012.md).

Fallos de entorno preservados: acceso Docker/loopback restringido y resolución
Vite bajo sandbox. Ejecuciones autorizadas con acceso local resolvieron esas
limitaciones sin cambiar fuentes, dependencias ni controles.

## Orquestación y autorización documental

Roles personalizados invocados sin preparación adicional: planificador solo
lectura, implementador backend, implementador frontend y revisor solo lectura.
Máximo tres subagentes concurrentes; planificador termina antes de revisión.
El coordinador escribe spec/plan/tareas/ADR, QA/CI, documentación, índices y cierre.
Backend escribe backend; frontend escribe frontend/src y nuevo E2E004.
E2E003 reservado al coordinador. Ningún escritor puede sobrescribir otro.
Solo lectura de planificador/revisor por instrucción, sin aislamiento técnico
acreditado: permisos de sesión workspace-write y red restringida con auto-review.
Skills SDD, QA, documentación y revisión de seguridad aplicadas por lectura.

SDD004 y ADR0005 redactados con origen de aprobación humana AG-012 antes del código.
Contrato compartido cerrado: decimales texto, colección completa y versión,
resultado mínimo de presentación persistido, selector mínimo y filtros acotados.

## Implementación 004

La [especificación](../../especificaciones/004-solicitudes-conceptos-importes/especificacion.md),
el [plan](../../especificaciones/004-solicitudes-conceptos-importes/plan.md), las
[tareas](../../especificaciones/004-solicitudes-conceptos-importes/tareas.md) y
[ADR-0005](../decisiones/ADR-0005-solicitudes-importes-presentacion.md) incorporan
D-004-01–11 por aprobación humana anterior al código.

| Área de entrega | Cambio y comprobación |
|---|---|
| V4 | Secuencia segura, solicitudes, conceptos e idempotencia; FK, checks, índices y privilegios mínimos. Evolución V3→V4 con datos y base vacía comprobadas. |
| HTTP | POST/GET colección, GET/PUT detalle, POST presentar y GET supervisores; 14 rutas totales en OpenAPI. Entradas cerradas, errores estables y no-store. |
| Importes | BigDecimal y HALF_UP por línea; 1×10.0000=10.00, 2.500×4.1250=10.31 y 3×0.3350=1.01; suma21.32EUR. Límites y desbordamientos controlados; decimales JSON como texto. |
| Permisos | Solicitante escribe borradores propios; supervisor lee presentadas asignadas; auditor/administrador leen todas. Unión de permisos explícitos, CSRF y404 para recursos no visibles. |
| Referencias | Proveedor vivo en borrador, inactividad bloquea presentar; fotografía inmutable al presentar. Supervisor habilitado con rol, distinto del autor y asignación fija. |
| Atomicidad | Cabecera y colección se reemplazan juntas; rollback real conserva todo. Presentación guarda estado, fotografía, versión y resultado idempotente en un commit. |
| Versión/idempotencia | Versiones obsoletas409; misma clave compatible devuelve resultado original persistido; incompatible409. Dos claves no duplican la transición. Replay sobrevive reinicio. |
| Listado | Visibilidad antes de contar, filtros AND, texto literal con acentos significativos, orden cerrado y desempateUUID, página máxima100. |
| Backend | Módulo solicitudes separado en HTTP, aplicación, dominio y JDBC. Clock/UUID/SQL parametrizado; eventos mínimos sin cuerpos ni credenciales. |
| Angular | Cuatro rutas; lista, detalle y editor; cálculo exacto estimado separado del total confirmado; selectores paginados, recuperación409, confirmación y replay. |
| Sistema visual | Tokens compartidos, navegación, paneles, chips, tabla/tarjetas, acciones e importes destacados; foco, reduced-motion y tamaños360/768/1440. |

No hay borrado físico de solicitudes, aprobación en004, reasignación ni historial
funcional completo. La retención definitiva permanece en los incrementos previstos.

## Pruebas y revisión 004

La [validación004](../../especificaciones/004-solicitudes-conceptos-importes/validacion.md)
es la fuente del estado SCI-01–14. Evidencias nuevas en
[AG-012](../../qa/evidencias/ag012/).

| Verificación ejecutada | Resultado observado |
|---|---|
| Backend verify final02 |144 PASS:76 unitarias+68 integración PostgreSQL real;98 anteriores+46 nuevas. Spotless/SpotBugs PASS sin exclusiones nuevas. |
| Concurrencia |9 carreras sincronizadas mediante bloqueos reales;12 altas con números únicos. Se prueban guardado/presentación, claves iguales/distintas y cambios concurrentes de referencias/rol. |
| Rollback |Triggers fallidos en PostgreSQL desechable después de modificar agregado y antes de persistir idempotencia; no quedan efectos ni eventos de éxito. |
| API Compose |Solicitudes119, sesiones88 y proveedores78 controles PASS sobre backend final. |
| Angular |275 PASS:130 anteriores+145 nuevas; tipos, lint, formato y build sin advertencias. |
| Docker |Builds backend/frontend sin caché; IDs runtime relacionados con manifestlist de los logs, sin exponer configuración. |
| Compose |Stop/start conserva historialV1–V4; caída PostgreSQL503 real y recuperación200; navegador incluido. |
| E2E001–004 |11 PASS sin reintentos:9 anteriores, recorrido de13 pasos004 y posiciones no consecutivas. Swagger ejecuta salud real. |
| Auditorías |npm producción/completa0 vulnerabilidades; OSV Maven offline132 componentes sin hallazgos, volcado público fresco con hash. Transitivas preliminares controladas porADR0002. |
| CI local |Actionlint y sintaxis verificadores PASS; Actions porSHA, PostgreSQL real y evidencias porjob. No equivale a ejecución remota. |
| Documentación/secretos |Enlaces y patrones acotados revisados; control adicional de JWT/claves privadas en evidencias. Controles repetidos al cierre general. |

Primeros fallos conservados: compilación de imports/anotación OpenAPI, avisos
SpotBugs corregidos sin exclusiones, fixtures frontend, formato Prettier, catálogo
de rutas Swagger desactualizado y CSRF obsoleto en llamadas de prueba. Ningún
defecto supera dos correcciones fallidas. Las advertencias de color del runner no
afectan al resultado. No se eliminaron aserciones ni controles para obtener PASS.

El revisor independiente confirma fuentes y evidencias backend, permisos,
rollback, carreras y privacidad; comprueba25 huellas backend y38 frontend.
Hallazgos cerrados: restricción SQL de tipoNULL, aislamiento/negativo del selector,
posiciones no consecutivas y Enter en búsquedas. Revisó capturas lista/detalle en
tres tamaños, conflicto y error. R004-UI03 también cerrada: barra sticky ocultaba
foco duranteTab; reproducción real62 pasos/24 centros ocultos, primera corrección
62/0 y regresión11/11 PASS. La directiva mide altura real y desplaza sin animación.
La última imagen frontend9e1a1dd6… y backend18a9ac00… están relacionadas en
`imagenes004-final.json`; salud y navegador repetidos tras esta corrección PASS.
La conclusión independiente no deja hallazgos abiertos y reserva al coordinador
la consolidación documental, realizada antes de evaluar la puerta005.

## Preservación y archivos

Las496 huellas protegidas capturadas al iniciar coinciden. El inventario inicial
con rg omitió63 logs ignorados; se contrastaron con huellas históricas AG011,
cuyos archivos de referencia también coinciden con la captura inicial:63/63
idénticos. El verificador distingue esas referencias de una captura nueva y no
clasifica los logs históricos como archivos creados. Prefijo CSV36924 bytes
conservado. No se han eliminado archivos del inventario.

El [manifiesto](../../qa/evidencias/ag012/entrega-manifiesto.json) enumera archivos
y SHA-256; su versión final se genera al cierre. El
[manifiesto de commits](../../qa/evidencias/ag012/manifiesto-commits.json) propone
grupos separables: arreglo E2E heredado, SDD/ADR004, backend, frontend, QA/CI y
documentación/evidencias. Es una propuesta para la persona responsable; ningún
commit, staging, consulta de estado/diff, rama, push o integración se ejecuta aquí.

## Riesgos, límites y siguientes pasos

004 tiene SCI-01–14 verificados localmente, incluida documentación y revisión.
La puerta005 se registra con hora real tras los controles documentales finales;
requiere004 completa y al menos120 minutos de margen.
Se cumplió a2026-10-15T00:09:52+02:00, con564 minutos restantes. El cierre004
conserva228 fuentes en ZIP con SHA-256 para facilitar separación de revisiones
y commits humanos. Se inicia SDD005 por la aprobación condicional ya otorgada.
006 solo podrá ser borrador tras005 verificada y45 minutos restantes.

100000 solicitudes es previsión de volumen, no carga medida. La revisión visual
es acotada, no auditoríaWCAG completa; los controles no acreditan OWASP íntegro.
No se prueba operación pública/HTTPS productivo ni retención/borrado jurídico.
Idempotencia local no se purga automáticamente. Datos QA ficticios permanecen en
el volumen. MigracionesV1–V3 y evidencias anteriores no se modificaron; el ajuste
local deV4 candidata se documenta en entorno y no autoriza reparar producción.

CI remota de estos cambios, aceptación, Git e integración son actuaciones humanas
pendientes. Al cierre se detuvo Compose sin borrar volúmenes y se registraron
hora, duración, SCI completos y estado real de005/006. No se declara aceptación
ni integración de ningún incremento.

## Continuación 005 — aprobaciones

La puerta de continuación se cumplió después del cierre documental y técnico de
004. El coordinador redactó especificación, plan, tareas, validación y ADR-0006
con las decisiones humanas D-005-01–08 antes de autorizar a los implementadores.
AP-01–10 son los criterios de seguimiento; AP-08 corresponde a interfaz y AP-09
a datos/evento. El planificador propuso contrato y el revisor lo contrastó en lectura.

V5 amplía los estados a APROBADA/RECHAZADA, conserva V1–V4 y añade un evento
único por solicitud, con privilegios de lectura/inserción para la aplicación.
Extiende el resultado idempotente local sin cambiar las huellas ni replays de
PRESENTAR. La transacción vuelve a comprobar supervisor asignado, no autor,
habilitación y rol vigentes antes del replay, y guarda estado, evento y resultado
juntos. La asignación, conceptos, importes y fotografía permanecen inmutables.

Se incorporan POST aprobar/rechazar con versión, CSRF y UUID Idempotency-Key.
El comentario es opcional hasta500 puntos Unicode; el motivo exige10–1000.
Detalle proyecta decisión y actor fotografiado; listado no expone textos de
decisión. La bandeja Angular fuerza supervisor actual y PRESENTADA incluso para
usuarios multirrol con lectura global. Hay confirmación, progreso, conflicto y
reintento con clave/cuerpo originales, y bloqueo de nueva decisión si falla el
GET posterior a un POST exitoso.

La primera regresión backend pasó180 pruebas y Angular346. La preservación del
volumen V4→V5 compara seis tablas y checksums anteriores; todos coinciden. La
primera lectura posterior se adelantó al commit de Flyway; se conservó FAIL y
se repitió tras arranque/salud200 con PASS. No se reparó ni alteró V5.

Incidencias 005 y resolución:

- Fixture HTTP Unicode: el cliente Java sustituía surrogate inválido por «?»;
  se envía escape JSON crudo. Primera corrección PASS, sin cambiar producto.
- R005-QA01: AJENO sin rol SUPERVISOR debe recibir403 antes de evaluar recurso;
  SUPERVISOR ajeno mantiene404. Ambos negativos pasan en API real.
- R005-UI01: trim de JavaScript omitía NEL y U+001C–1F. Normalizador común para
  validación/confirmación/cuerpo, con máximos y reintentos probados. Revisión
  independiente cierra fuente y pruebas;346 Angular y71 enfocadas PASS.
- R005-QA02: login inicial del supervisor QA falló por CHECK fechas_usuario.
  Creado a22:25:11.035473UTC, actualización truncada a22:25:11.000UTC; PostgreSQL
  acredita23514 a22:25:11.584UTC. Los200 logins posteriores no explicaban por sí
  solos el fallo. Corrección limitada a fixtures con precisión de segundos y
  aserción previa; causa contrastada y regresión corregida API140/119 PASS.
- R005-QA03: el E2E empezaba Tab antes del retorno asíncrono de foco al textarea.
  Espera explícita sin eliminar controles. Los tres recorridos enfocados PASS,
  con capturas y teclado en360/768/1440; suite completa14/14 PASS.
- R005-API01: Swagger omitía200 en las decisiones y asignaba esquemas de éxito
  a errores. Primera corrección descubrió inferencia incompleta de DTO anteriores;
  se completan éxitos y errores de las siete operaciones. Segundo intento enfocado
  PASS y regresión backend180/E2E14 PASS.

Las fuentes, XML, logs, imágenes y estados de cada ejecución se conservan con
prefijos/directorios005. Las auditorías de esta sesión siguen aplicando: POM,
package/lock y catálogo Maven son idénticos al cierre004, comprobado por hash en
`auditorias005-continuidad.json`. La [validación005](../../especificaciones/005-aprobaciones/validacion.md)
registra resultados de la imagen final, API, Compose y E2E. Cierre técnico
independiente sin hallazgos abiertos; documentación e integridad comprobadas.

| Verificación final005 | Resultado |
|---|---|
| Backend |180 PASS (84 unitarias+96 integración), Spotless y SpotBugs0; verify-api01 final00:34:11+02. |
| Angular |346 PASS (275 anteriores+71 nuevas), tipos/lint/formato/build; main-DW2S3G7C.js,418,93kB. |
| API final |Sesiones88+proveedores78+solicitudes119+aprobaciones140=425 controles PASS. |
| E2E final |14/14 PASS, sin reintentos,21,5s; aprobación/rechazo, multirrol, lecturas y dos pestañas. |
| Compose |PersistenciaV1–V5, PostgreSQL caído503 en2018ms, recuperación200 y navegador PASS. |
| Imágenes |Backend4058852f… y frontend16f3371b… coinciden con builds sin caché; imagenes005-final.json. |
| Revisión |23 huellas backend y81 frontend,17XML, imágenes, API y capturas contrastados; hallazgos cerrados. |

La inspección visual cubre bandeja, confirmaciones, resultados y conflicto,
con geometría de foco y anchos360/768/1440. Mantiene la cobertura004 de editor,
selectores y barra sticky; no acredita una auditoría WCAG completa.

## Correspondencia de la entrega solicitada

| Nº | Elemento | Fuente de entrega |
|---|---|---|
|1|Horario/duración|Cabecera del informe y cierre.json al terminar. |
|2|SCI-01–14|Validación004, todos PASS local. |
|3|SDD/ADR|Paquetes004/005 y ADR0005/0006, con aprobación humana anterior al código. |
|4|V4|Migración, pruebas, ajuste local documentado y SHA congelado. |
|5|Endpoints|Contrato API/OpenAPI:14 rutas en004,16 en005; Swagger real. |
|6|Cálculos|BigDecimal/HALF_UP;10.00,10.31,1.01 y suma21.32EUR comprobados. |
|7|Permisos|Matriz SCI09/AP03, SQL/HTTP/Angular/E2E y revocación vigente. |
|8|Proveedor/supervisor|Fotografía inmutable, proveedor activo al presentar y asignación fija. |
|9|Versión/idempotencia|Resultados persistidos, incompatibles409 y replay004 conservado en005. |
|10|Backend/pruebas|144 al cierre004;180 finales con PostgreSQL real. |
|11|Frontend/pruebas|275 al cierre004;346 finales y calidad/build. |
|12|Visual/capturas|Directorios E2E004/005, foco real y revisión acotada. |
|13|E2E|11 al cierre004;14 finales, sin reintentos. |
|14|Concurrencia|9 escenarios DB004,12 altas con números únicos;10 escenarios DB005 y carreras HTTP/navegador. |
|15|Regresión001–003|98 backend/130 Angular/9 E2E antes del desarrollo; conservadas en suites finales. |
|16|CI local|Workflow ampliado, actionlint, builds/Compose y auditorías; remota pendiente. |
|17|Documentos/evidencias|Validaciones, informe, índices, MEMORY y qa/evidencias/ag012. |
|18|Riesgos|Carga, operación pública, retención, auditorías integrales y aceptación pendientes. |
|19|Archivos|entrega-manifiesto.json y fuentes-finales.json con SHA-256. |
|20|Commits propuestos|manifiesto-commits.json; arreglo heredado separable y snapshot004 para separar005. |
|21|Ausencia Git|Ningún comando Git ni staging/commit/rama/PR/integración ejecutado. |
|22|Estado005|AP-01–10 verificados localmente, incluida documentación e integridad; sin aceptación ni integración. |
|23|Borrador006|Única especificación creada tras cerrar005 a00:39:11+02:00 con534min; pendiente de aprobación humana. |

## Puerta 006 y límite de la continuación

Después del cierre técnico/documental de005, sincronización de MEMORY/índices y
registro CSV, los controles volvieron a pasar:508 enlaces sin roturas/patrones,
496 huellas iniciales+63 históricas y prefijo CSV intactos, junto con V4 y
snapshot004. La puerta006 se registró a2026-10-15T00:39:11+02:00, con534 minutos.

Se creó únicamente
[especificación006](../../especificaciones/006-concurrencia-idempotencia/especificacion.md),
**Borrador pendiente de aprobación humana**. Describe garantías existentes,
alcance candidato, criterios propuestos y decisiones abiertas de operaciones,
ámbito de clave, errores, caducidad, esperas y recuperación del cliente. No se
crearon plan, tareas, validación, migración, ADR ni código006. Ninguna propuesta
de este borrador se presenta como requisito aprobado.

## Cierre y entrega a la persona responsable

Compose detenido a00:40:43+02:00: backend, frontend y PostgreSQL en exited;
volumen conservado. Cierre registrado a00:41:12+02:00, duración01:07:10.
Comprobaciones documentales e integridad finales en sus JSON de control;
búsqueda adicional de JWT completos, claves privadas y bcrypt en333 archivos
de evidencia sin hallazgos. Son comprobaciones acotadas, no garantía universal.

Las fuentes y archivos afectados se enumeran con SHA-256 en el
[manifiesto final](../../qa/evidencias/ag012/entrega-manifiesto.json).
El [manifiesto de commits](../../qa/evidencias/ag012/manifiesto-commits.json)
propone grupos para actuación humana y conserva separación004/005 mediante el
snapshot004. Ningún comando Git se ejecutó. Los496 archivos protegidos y63 logs
históricos contrastados permanecen iguales; prefijo CSV y snapshot004 intactos.

Ejemplos visuales: [bandeja1440](../../qa/evidencias/ag012/e2e005-final/capturas/frontend005-bandeja-1440.png),
[confirmación360](../../qa/evidencias/ag012/e2e005-final/capturas/frontend005-confirmacion-aprobación-360.png) y
[rechazo768](../../qa/evidencias/ag012/e2e005-final/capturas/frontend005-rechazada-768.png).
El resto de capturas y todos los primeros fallos se conservan junto a los resultados.

Pendientes humanos: revisar la entrega, realizar Git y CI remota, aceptar o
integrar004/005 y decidir el alcance de006. Los límites de carga, operación
pública, retención y auditorías integrales permanecen explícitos. No queda
trabajo local autorizado pendiente en esta sesión; se detiene la ejecución.
