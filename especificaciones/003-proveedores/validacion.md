# Validación — 003 Proveedores

**Estado:** Verificada localmente en AG-011; aceptación e integración pendientes.
**Autorización:** AG-011; aceptación e integración pendientes de la persona responsable.

Inicio 2026-10-14 01:29:00 +02:00; límite 11:29:00 +02:00, Europe/Madrid.
Cierre y duración en el [informe AG-011](../../docs/trazabilidad/AG-011-informe.md).
Todas las evidencias propias están en [AG-011](../../qa/evidencias/ag011/).
No se ejecutó Git ni se modificaron los documentos cerrados 001/002 para registrar
su regresión: los resultados nuevos se conservan aquí.

## Resultado por requisito

Esperado: los criterios de la [especificación aprobada](especificacion.md).
PASS significa comprobado localmente dentro del alcance indicado, sin aceptación.

| Requisito | Resultado observado | Evidencia concreta |
|---|---|---|
| PR-01 Crear | PASS: 201/Location, UUID/fechas servidor, activo y versión0; inválido sin fila | ProveedoresIT, REST Compose y E2E paso1 |
| PR-02 Consultar | PASS: DTO sin normalizado, inexistente/no visible404 | IT matriz/visibilidad, REST y E2E pasos2/6/7 |
| PR-03 Listar/buscar | PASS: AND, literal %, _, escape, acentos significativos, fiscal normalizado, orden estable y límites | IT búsqueda/paginación, REST y E2E paso10, incluidos caracteres suplementarios |
| PR-04 Modificar | PASS: campos permitidos, versión incrementada, creadoEn/id/activo preservados | IT edición/Clock/rollback, REST y E2E paso3 |
| PR-05 Desactivar | PASS: fila conservada, ocultación y repetición vigente sin cambios/evento | IT estados, REST y E2E pasos5/6 |
| PR-06 Reactivar | PASS: solo administrador, repetición vigente sin cambios; obsoleta409 | IT matriz/estados, REST y E2E paso8 |
| PR-07 Duplicados | PASS: unique compuesto incluye inactivos; una sola alta concurrente persiste | Unitarias Unicode, IT con conexiones reales, REST concurrente y E2E paso9 |
| PR-08 Permisos | PASS: cuatro roles/uniones, no confiar en cliente, CSRF y denegación por defecto | IT matriz, REST78 y E2E cuatro cuentas ficticias |
| PR-09 Versión | PASS: id/version en SQL; una escritura gana, otra409, sin sobreescritura | Tres carreras IT, REST concurrente y E2E paso4 en dos contextos |
| PR-10 Angular | PASS: cuatro rutas, estados/formularios, filtros URL, conflicto/recarga, teclado/foco/móvil | 130 Angular, E2E12 pasos y capturas; accesibilidad básica, no auditoría WCAG completa |
| PR-11 Seguridad/eventos | PASS: entrada cerrada, errores controlados, consultas parametrizadas, eventos después de commit sin fiscal/contacto | IT/logs/rollback, errores HTTP400/401/403/404/409/500/503, REST y revisión independiente |
| PR-12 Entrega | PASS: pruebas/builds/CI local/auditorías/documentación y revisión independiente | Tablas siguientes, manifiestos, informe y revisión de cierre |

## Backend y PostgreSQL

`mvnw.cmd verify -Dstyle.color=never` terminó a las 02:06:05 +02:00 con código0,
en 47,081s de Maven: **98 pruebas, 0 fallos, 0 errores y 0 omitidas**.
Son 61 unitarias/HTTP aisladas y 37 IT PostgreSQL; 43 nuevas003 y 55 previas001/002.
Spotless PASS; SpotBugs Max/Low, cero hallazgos. No se redujeron umbrales.
[Log final](../../qa/evidencias/ag011/backend-verify-final.log),
[98 casos JUnit](../../qa/evidencias/ag011/backend-junit-resultados.csv),
[resumen backend](../../qa/evidencias/ag011/backend-resumen.md).

Testcontainers usa PostgreSQL17.11 real con imagen fijada. Comprueba V3 en base
nueva, actualización desde V1/V2 preservando usuario, segundo arranque y roles.
gestion_app tiene SELECT/INSERT/UPDATE, sin DELETE ni CREATE de esquema.
V3 usa varchar(2) con CHECK exacto de dos mayúsculas, evitando el padding de
char(2); la validación ISO reside en dominio. No se cambiaron V1/V2.

Las tres carreras de alta/edición/estado esperan dos conexiones bloqueadas en
pg_stat_activity antes de liberarlas. Alta: un éxito/un duplicado; edición y estado:
un éxito/una versión obsoleta. La restricción unique y UPDATE id/version son las
garantías finales. Además, REST Compose lanza pares mediante Promise.all contra
la aplicación real. La prueba de rollback verifica cero filas/eventos de éxito.

## Angular y navegador

| Comprobación ejecutada final | Observado | Evidencia AG-011 |
|---|---|---|
| typecheck, lint, format:check y build | PASS; bundle main-UBBPHK6T.js, inicial310,44kB | frontend-*-carga.log |
| Todas las pruebas Angular | 130/130 PASS, 13 suites; 74 nuevas y 56 previas | frontend-tests-regresion-carga.log |
| Playwright/Chromium contra Compose, intento03 | 9/9 PASS; ocho previas y una prueba con doce pasos003 | frontend-e2e-intento03.log/.xml |
| Rutas directas/recarga, teclado/foco y móvil | PASS básico; sin desbordamiento visible en capturas revisadas | frontend-proveedores-*.png y resumen frontend |

Recorrido E2E ejecutado: (1)alta administrador, (2)detalle/lista, (3)edición,
(4)conflicto mostrado entre dos contextos, (5)baja, (6)ocultación solicitante/supervisor,
(7)auditor solo lectura, (8)reactivación, (9)duplicado comprensible,
(10)búsqueda/filtros/páginas/Unicode, (11)recarga de rutas, (12)teclado/foco/móvil.
Datos ficticios identificables. Las unitarias Angular simulan HTTP; las garantías
de autorización/persistencia se acreditan separadamente en PostgreSQL y Compose.
[Resumen frontend](../../qa/evidencias/ag011/frontend-qa.md).

## Integración y regresión 001/002

| Esperado | Observado | Evidencia AG-011 |
|---|---|---|
| Docker build sin caché de fuentes finales | PASS backend y frontend | docker-backend-final.* y docker-frontend-carga.* |
| Imagen publicada localmente corresponde a candidata | HTTP200, main-UBBPHK6T.js | bundle-carga-runtime.json; huellas fuentes-pre-e2e-carga.json |
| Contrato OpenAPI real completo | Alta4/Edicion5/Estado1 obligatorios, additionalProperties=false | openapi-schemas-final.json; E2E Swagger |
| API proveedores, roles/CSRF/filtros/versión/carreras/eventos | 78 controles PASS | compose-proveedores.json y compose-proveedores-final.txt |
| Identidad: login/refresh/logout/yo y persistencia de sesión | 88 controles PASS | compose-sesiones.json y compose-sesiones-definitiva.txt |
| Navegación /mi-cuenta y protección/recarga | PASS | Ocho E2E previas dentro de intento03 |
| V1/V2/V3 persistentes, caída PostgreSQL503 y recuperación200 | PASS, error y recuperación visibles en Chromium | compose-persistencia-caida.json, compose-regresion-definitiva.txt y navegador-*.json |

No hay despliegue público. El volumen local conserva usuarios y proveedores de
prueba. La parada final conserva los datos; se registra separadamente en cierre.

## Auditorías y CI local

- npm audit producción y completo: cero vulnerabilidades comunicadas por el
  registro, tras autorizar exclusivamente metadatos. JSON propios AG-011.
- Maven: nueva comparación offline OSV-Scanner2.7.0 de **132 componentes**,
  cero hallazgos en la base pública Maven descargada el mismo día a las00:05.
  Fecha/huella e inventario en maven-auditoria.json; resultado maven-osv.json.
  No cubre CVE desconocidas, plugins Maven ni SO de imágenes.
- Sin dependencias nuevas ni cambios de lockfile/POM. Los16 preliminares
  transitivos siguen bajo ADR-0002; no se elevan a dependencia directa.
- CI incluye API y E2E003 junto a001/002, Actions por SHA, versiones/imágenes
  fijadas, permisos mínimos y artefactos exclusivos de cada ejecución.
  Actionlint1.7.12 y controles de scripts PASS locales.
- Enlaces, patrones acotados de secretos y huellas PASS; se vuelven a comprobar
  tras los últimos metadatos de cierre. Una búsqueda sin coincidencias no garantiza ausencia de todo secreto.
  No se afirma cumplimiento OWASP completo.

## Fallos y correcciones conservados

| Hallazgo/causa | Corrección y prueba | Resultado |
|---|---|---|
| R00301: U+0085 faltaba en espacios Unicode | Normalización corregida, unitarias y duplicado real | PASS |
| R00302: nanosegundos de Clock frente a microsegundos PostgreSQL | Truncar Clock a MICROS, POST/GET/PUT con Clock fijo | PASS |
| R00303: campos obligatorios OpenAPI incompletos | required exactos4/5/1 y prueba de conjuntos/runtime | PASS |
| CSRF: Bearer borraba cookie y difería reposición | Materializar token diferido, manteniendo rotación; jar real y sin cabecera403 | PASS, primera corrección |
| SpotBugs: dos EI_EXPOSE_REP2 | JdbcTemplate privado desde DataSource; exclusión precisa y justificada del puerto Spring inyectado | PASS tras segunda corrección; no supresión general |
| Nuevo proveedor perdía filtros y página fuera de rango | Conservar queryparams; Anterior recupera página válida | PASS Angular/E2E |
| R00304: maxlength contaba UTF-16 | Techo físico doble y límites por puntos Unicode en TS; unitarias/E2E | PASS |
| E2E intento02: foco/carga borraba filtros recién escritos | Fieldset disabled/aria-busy durante GET y bloqueo de envío; prueba de transición | 130 Angular y E2E intento03 PASS, primera corrección |

Los primeros logs permanecen. E2E intento01 no encontró Chromium en la ruta
predeterminada: se configuró el navegador ya instalado en tmp/playwright.
El intento02 pasó ocho E2E anteriores y pasos1–9 de 003, pero falló en10; no se
presenta como completo. Intento03 pasa todo tras corregir el producto, sin espera
artificial para ocultar el fallo. Docker registró un fallo de snapshot de caché;
construcción sin caché lo resolvió sin borrar volúmenes/cachés globales.
Compose registró también un arranque aún sin HTTP disponible: el verificador ahora
espera salud antes de autenticar. DNS/socket/temporales restringidos necesitaron
ejecuciones escaladas específicas; fallos preservados y ningún control debilitado.

## Revisión independiente y límites

La [revisión independiente](../../qa/evidencias/ag011/revision-independiente.md)
concluye sin hallazgos accionables abiertos y con evidencia coherente PR-01–12.
Las correcciones se realizaron por los escritores y se volvieron a comprobar.

## Siguiente paso

La precondición terminó en menos de 15 minutos, sin repetir AG-010 completa antes
de programar. Planificador/revisor respetaron solo lectura por instrucción; el
permiso efectivo workspace-write no acredita aislamiento técnico read-only.
Preservación de420 históricos/protegidos y prefijo CSV mediante SHA-256/bytes
desde la captura inicial, sin afirmar hechos anteriores al comienzo.

No hay benchmark de 50.000 proveedores, auditoría WCAG completa, validación fiscal
jurídica universal, retención/eliminación legal definitiva ni historial funcional.
006 y007 ampliarán controles transversales. CI remota sigue pendiente del push
humano, al igual que revisión/aceptación/integración. No quedan aprobados esos pasos
por esta validación local ni se ejecutan operaciones Git.
