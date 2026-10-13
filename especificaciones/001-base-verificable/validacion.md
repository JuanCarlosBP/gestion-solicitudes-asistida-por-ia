# 001 — Validación parcial de dependencias: AG-005

**Estado:** Bloqueada; no acredita la base implementada ni aceptada.
**Fecha:** 2026-10-13, Europe/Madrid.
**Ámbito ejecutado:** documentación de decisión, consultas npm y resolución del
lockfile antes de instalar. No existen aplicación ni pruebas de aplicación.

Se comprueban la [especificación](especificacion.md), el [plan](plan.md) con
[ADR-0001 aprobado](../../docs/decisiones/ADR-0001-dependencia-transitiva-rolldown-angular-21.md)
y las [tareas](tareas.md), con la orden humana de detenerse ante cualquier
dependencia preliminar ajena a la cadena Rolldown autorizada.

## Hallazgo bloqueante observado

El lockfile resuelve `gensync@1.0.0-beta.2`, fuera de ADR-0001:

```text
@angular/build@21.2.26
└── @babel/core@7.29.7
    └── gensync@1.0.0-beta.2

@angular/compiler-cli@21.2.25
└── @babel/core@7.29.7
    └── gensync@1.0.0-beta.2
```

`@babel/core` declara el rango `^1.0.0-beta.2`. También llega a Babel
`istanbul-lib-instrument@6.0.3`. La licencia de gensync declarada en el lockfile
es MIT; su URL resuelta es del registro oficial npm y publica esta integridad:
`sha512-3hN7NaskYvMDLQY55gnW3NQ+mesEAepTqlg+VEbj7zzqEMBVNhzcGYYeqFo/TlYz6eQiFcp1HcsCZO+nGgS8zg==`.

La etiqueta preliminar basta para activar la parada expresamente ordenada.
No se afirma que este hallazgo sea una vulnerabilidad de seguridad ni se ha
ejecutado la auditoría. No se ha aplicado una nueva excepción o un override.

## Entorno, contenido y límites

- Directorio exclusivo: `C:\Users\carli\gestion-solicitudes-asistida-por-ia`.
- Node observado en la comprobación: `v24.13.0`; npm observado al cierre: `11.6.2`.
- Sandbox `workspace-write`, aprobación `auto_review`, red restringida.
- Consultas npm y resolución recibieron escalación concreta para npm oficial;
  caché en `tmp/npm-cache`, dentro del workspace, sin instalaciones globales.
- Docker y preflight A1–A10 se heredan de AG-004, no se reejecutaron en AG-005.
- Java/javac se heredan de AG-003, no se reejecutaron en AG-005.
- `frontend/node_modules` no existe: resolución de metadatos no equivale a instalación.
- No se ejecutó Git, CI remota, despliegue, build ni prueba de aplicación.
- Coordinador como único escritor, fallback nivel 3; revisión no independiente.
- Inicio AG-005: 02:47:42 +02:00; límite original: 12:30:55 +02:00, sin ampliación.

La selección exacta de dependencias directas y los siete resultados npm están
en [versiones](../../docs/documentaciondev/versiones.md). El conjunto frontend
está fijado para investigar su resolución; T001 no ha cerrado la selección
completa del incremento, incluidas las herramientas restantes del backend.

## Controles ejecutados y pendientes

| Control | Esperado | Observado y resultado |
|---|---|---|
| Decisión antes de código | ADR aprobado y plan actualizado con excepción exacta | PASS: documentos preparados antes del manifiesto frontend. |
| Siete `npm view` solicitados | Build 21.2.26, Rolldown rc.4, licencia/origen/integridades | PASS: siete códigos 0, valores y origen coincidentes; detalle en versiones. |
| Metadatos de familia Rolldown | Paquetes automáticos de la misma publicación | PASS de metadatos: pluginutils y 13 bindings rc.4 requeridos por Rolldown; types 0.113.0 estable. |
| `npm install --package-lock-only --ignore-scripts --no-audit --no-fund` | Resolver sin instalar ni ejecutar scripts | PASS de resolución: código 0, `up to date in 22s`, lockfile v3 con 689 paquetes, sin contar la raíz. |
| Dependencias directas | Versiones estables exactas, sin Rolldown directo | PASS: manifiesto exacto, sin dependencia directa Rolldown, overrides ni resolutions. |
| Procedencia e integridades del lockfile | Registro npm oficial e integridad en cada entrada | PASS de metadatos: 689 entradas con integridad; ninguna URL resuelta ajena a npm oficial. No verifica bytes de paquetes descargados. |
| Cadena Rolldown resuelta | Solo por build 21.2.26 y versión rc.4 | PASS del lockfile: único introductor @angular/build 21.2.26; pluginutils y 13 bindings rc.4. No es resultado de árbol instalado. |
| Versiones preliminares | Solo Rolldown y familia autorizada | FALLÓ, código 1: 16 entradas preliminares; 15 autorizadas y gensync beta.2 no autorizada. |
| Instalación de paquetes e integridad de archivos | Descarga e instalación verificadas | PENDIENTE por parada previa; no existe node_modules. |
| `npm explain rolldown` | Árbol instalado exclusivamente autorizado | NO EJECUTADO: instalación detenida. El árbol mostrado aquí procede del lockfile. |
| `npm ls @angular/build rolldown --all` | Versiones instaladas y ausencia de conflictos | NO EJECUTADO: no hay instalación que comprobar. |
| `npm audit --audit-level=high` | Auditoría completa y tratamiento de hallazgos | NO EJECUTADO tras la parada obligatoria. No se declara ausencia de vulnerabilidades. |
| `npm ci` | Reproducir la instalación desde lockfile | NO EJECUTADO por bloqueo. |
| Build, pruebas, tipos, lint y análisis de aplicación | Criterios de BV-01–BV-09 | NO EJECUTADOS; aplicación aún inexistente. |

`--no-audit` separó la resolución del control de auditoría previsto; no permite
aceptar el conjunto sin auditarlo. `--ignore-scripts` evitó ejecutar scripts
durante esa resolución. No se usaron force, legacy-peer-deps, latest,
desactivación de integridad o audit fix. El fallo no se ocultó mediante reintentos.

El control leyó todas las entradas de `package-lock.json`, buscó versiones
con sufijo preliminar y admitió exclusivamente Rolldown, pluginutils y bindings
en `1.0.0-rc.4`. Comprobó además introductor, versión, integridades, procedencia,
dependencia directa y ausencia de overrides/resolutions. Solo falló la entrada
`node_modules/gensync`; no se intentó corregirla sin autorización.

SHA-256 del lockfile comprobado:
`7DEE45F2789B312968EFC716FB269C14E51836ACEA17D46B13BA41E7BF98A25F`.
La ruta conserva el contenido resuelto para revisión, no una instalación aceptada.

## Cobertura de requisitos y estado de tareas

| Requisito | Tareas | Estado real |
|---|---|---|
| BV-01, entorno reproducible | T001/T002/T004 | Parcial y bloqueado: versiones frontend y lockfile existentes; instalación y reproducción pendientes. |
| BV-02, backend técnico | T002 | No implementado ni probado. |
| BV-03, PostgreSQL y migraciones | T003 | No implementado ni probado. |
| BV-04, API y salud | T002/T003/T005 | No implementado ni probado. |
| BV-05, OpenAPI y Swagger | T002/T005 | No implementado ni probado. |
| BV-06, Angular y navegación | T004/T005 | Solo manifiesto, configuración npm y lockfile; no hay pantalla ni código funcional. |
| BV-07, Compose | T005 | No implementado ni probado; motor comprobado previamente no equivale a entorno del producto. |
| BV-08, pruebas y análisis | T002/T003/T004/T006 | Control de preliminares fallido; auditoría y pruebas de aplicación pendientes. |
| BV-09, CI | T006 | No creada ni ejecutada, local o remotamente. |
| BV-10, documentación/evidencia | T007/T008 | Registro parcial de T001; documentación operativa y validación integral pendientes. |

**T001 bloqueada; T002–T008 no iniciadas.** Los tres archivos de frontend
pertenecen a la resolución previa solicitada en AG-005, no acreditan T004.
Este registro de resultados reales no declara T007 ni T008 completas.

## Decisión pendiente y manifiesto

La persona responsable debe decidir específicamente sobre `gensync@1.0.0-beta.2`
en la cadena Babel observada. ADR-0001 sigue aprobado y no incluye este paquete.
No se amplía su excepción por semejanza ni porque el paquete venga de Angular.

El manifiesto de archivos y commits sugeridos se conserva en la sección AG-005
del informe de versiones y en el registro AG-005. No se ejecutará Git ni se
reanudará la instalación automáticamente. El límite temporal original permanece.

## Verificación del cierre documental

Se comprobaron 80 enlaces internos de los documentos afectados: ningún destino
ausente y ningún espacio final. La búsqueda acotada de patrones de secretos no
encontró coincidencias; no es una garantía absoluta de ausencia de información sensible.

Se verificaron byte a byte mediante SHA-256 los prefijos anteriores a AG-005:
22193 bytes del CSV, 4659 de MEMORY y 13375 de versiones. Coinciden con sus
huellas iniciales; AG-003, AG-004 y la evidencia histórica permanecen intactos.
La configuración local conserva su huella inicial y no se modificó.
Inventario sin `.git` ni caché: 46 archivos frente a 41 al comenzar AG-005.
La caché operativa, no incluida en el manifiesto de commit, tiene 1323 archivos
y 487068673 bytes; permanece dentro de `tmp/npm-cache`.

El primer analizador PowerShell del cierre falló al convertir la clave vacía
estándar de `packages` del lockfile. Se corrigió únicamente la lectura con
`ConvertFrom-Json -AsHashtable`; la repetición terminó con código 0, sin cambiar
el lockfile. Esto no es una corrección de la dependencia bloqueante ni altera
su resultado fallido. No se repitieron instalación, auditoría o pruebas.

---

## AG-006 — Validación vigente de la base implementada

**Fecha:** 2026-10-13, Europe/Madrid. Inicio 10:16:08 +02:00; ventana nueva
hasta 20:16:08. Cierre exacto en [cierre.json](../../qa/evidencias/ag006/cierre.json).
**Resultado:** base operativa localmente; **aceptación pendiente** por formato Java
y CI remota. El contenido anterior es historia AG-005, preservada íntegramente.
[ADR-0002](../../docs/decisiones/ADR-0002-politica-dependencias-transitivas.md)
levanta la parada por etiqueta preliminar transitiva sin alterar aquellos resultados.

Se ejecutaron T001–T008 en fallback secuencial nivel 3, una sola sesión/escritor.
Revisión separada de reparaciones, **no independiente**. Skills SDD, QA, seguridad
y documentación aplicadas. No se ejecutó Git, despliegue ni funciones de 002–008.
La aprobación original de especificación/plan/tareas no equivale a aceptación.

### Matriz BV → tarea → comprobación → evidencia

PASS local acredita solo lo comprobado; no implica aceptación global.
Los nombres de evidencia de la tabla pertenecen a
[qa/evidencias/ag006](../../qa/evidencias/ag006/).

| BV | Tareas | Esperado y observado | Resultado | Evidencia |
|---|---|---|---|---|
| BV-01 | T001/T002/T004/T007 | Versiones exactas, lockfile preservado, npm ci, Wrapper con integridad, build Windows y Linux Docker. Otra máquina Windows/CI Linux no probadas; verify falla por formato. | PARCIAL | npm-ci-corregido.txt, maven-wrapper-corregido.txt, backend-regresion-seguridad.txt, compose-parches-seguridad.txt |
| BV-02 | T002 | Compila, empaqueta y arranca. Sin DB_URL termina con salida 1. HTTP, aplicación y persistencia separados. | PASS local; verify integral pendiente | informes-backend/, configuracion-ausente.json |
| BV-03 | T003 | PostgreSQL real: primera migración, segundo arranque sin repetición, V2 inválida impide arranque y rollback permite recuperar. Solo tabla técnica; runtime no puede DDL, leer historial ni crear roles. | PASS | informes-backend/failsafe-reports/, backend-regresion-seguridad.txt |
| BV-04 | T002/T003/T005 | GET devuelve exactamente 200 DISPONIBLE o 503 NO_DISPONIBLE; caída real acotada, sin datos internos. | PASS | informes-backend/, compose-persistencia-caida.json, navegador-error.json |
| BV-05 | T002/T005 | OpenAPI 3.1, único path técnico con 200/503; Swagger carga y ejecuta GET real en Chromium. | PASS | e2e-final.txt, informes-frontend/e2e.xml |
| BV-06 | T004/T005 | Carga/disponibilidad/error; raíz, directa, recarga y desconocida. Teclado/foco, idioma es y ancho 375 px. Build y 11 unitarias. | PASS | frontend-pruebas-final.txt, frontend-build-final.txt, e2e-final.txt, inicio-disponible.png, inicio-error.png |
| BV-07 | T005 | Tres servicios, usuarios no root, solo 127.0.0.1:18080. Historial idéntico tras stop/start, caída real y recuperación. Parada final conserva volumen. | PASS local | compose-servicios.json, compose-persistencia-caida.json, compose-qa-revision.txt, compose-cierre.json |
| BV-08 | T002/T003/T004/T006 | 10 unitarias/HTTP + 3 IT Java, 11 Angular y 5 E2E PASS; tipos/lint/formato frontend, SpotBugs y auditorías PASS. Spotless Java falla. | BLOQUEADO local | backend-verify-final-obligatorio.txt; informes de pruebas/análisis |
| BV-09 | T006 | Workflow por SHA, permisos mínimos e informes; actionlint PASS. Equivalentes locales con formato fallido. Ninguna ejecución remota. | PARCIAL | actionlint-final.txt, .github/workflows/ci.yml |
| BV-10 | T007/T008 | Entorno, arquitectura, versiones, errores, matriz y manifiesto. Enlaces, secretos, archivos inesperados e integridad histórica comprobados. | Documentado; aceptación humana pendiente | documentacion-control.json, entrega-integridad.json, entrega-manifiesto.json, cierre.json |

### Resultados, revisión y límites

Backend independiente: `mvnw -B -ntp -Dspotless.skip=true verify`, 13 pruebas,
empaquetado y SpotBugs PASS tras los parches. **No acredita verify completo.**
El comando obligatorio sin omisiones falla en Spotless 3.10.4/google-java-format
1.37.0 con InvocationTargetException. JAVA_HOME 21 de proceso y exports de
jdk.compiler fueron las dos correcciones fallidas. El control permanece en POM/CI;
la regla de parada impide otra reparación en AG-006.

Frontend: tipos, lint, formato, 11 pruebas Vitest, build y 5 Playwright PASS.
Carga/error interceptados se distinguen de la caída PostgreSQL real, comprobada
por separado en Compose/Chromium. Último 503 real: 2013 ms, recuperación 200.
Dependencias: inventario único de 689 entradas, 16 transitivas controladas,
ninguna directa preliminar, override o importación directa. npm ci/explain/ls PASS;
auditorías npm producción/completa: cero vulnerabilidades informadas.
Maven: 125 componentes, 17 coincidencias iniciales conservadas; parches Tomcat
11.0.25 y Jackson 2.21.7/3.1.7, regresión y auditoría OSV offline final sin coincidencias.
Sin envío de inventarios. Actionlint 1.7.12 PASS; CI remota no ejecutada.

Revisión T008: R006-01, formato bloqueante de verificación, pendiente. R006-02,
TEMP no creado en QA Compose, devuelto al implementador, corregido y repetido
con PASS; revisión posterior de solo lectura sin nuevos hallazgos.
Controles y evidencias de AM-04/05/07/14/15/16/18/19/20/21/22/23 detallados en
el [informe AG-006](../../docs/trazabilidad/AG-006-informe.md). No certifican OWASP/ASVS.

No se midió porcentaje de cobertura ni se probó todo el modo de desarrollo nativo.
No se auditó SO de imágenes ni plugins Maven. Base OSV de la fecha, sin garantía
sobre vulnerabilidades desconocidas. Se conserva aviso de fin de soporte ESLint 9.
Búsqueda de secretos acotada; revisión no independiente. La primera asignación
de caché npm falló y usó la caché predeterminada; se corrigió y repitió npm ci local.

Prefijos CSV/versiones/ADR-0001/validación, lockfile y memoria histórica verificados
por SHA-256. [Memoria anterior íntegra](../../docs/trazabilidad/memoria-hasta-ag005.md).
Una única fila AG-006. Manifiesto de archivos sin operaciones Git.
Pendiente: decisión humana sobre formatter, verify sin omisiones, push/CI remota
y aceptación humana. No hay borradores 002–008. Informe AG-006 contiene tiempos,
riesgos restantes y commits semánticos sugeridos.

---

## AG-007 — Diagnóstico vigente de Spotless; cierre local bloqueado

Inicio 2026-10-13 11:16:00 +02:00, límite 12:01:00. Cierre exacto en
[cierre.json](../../qa/evidencias/ag007/cierre.json).
El [informe AG-007](../../docs/trazabilidad/AG-007-informe.md) conserva comandos,
causa, huellas, revisión y pendientes. AG-006 y todos sus fallos permanecen íntegros.

Spotless anterior: fallido. En AG-007 se ejecutaron, desde backend y Java 21,
`spotless:check`, `spotless:apply` y `-e -X spotless:check`: todos fallidos, salida 1.
El apply oficial no modificó ninguno de los 14 Java (10 main, 4 test).
La comparación de contenido/SHA-256 confirma ausencia de cambios de comportamiento,
nombres, lógica, pruebas, configuración funcional y endpoints.

Causa concreta: el adaptador de Spotless 3.10.4/spotless-lib 4.10.4 llama a
`JavaFormatterOptions.Style.valueOf(String)`. google-java-format 1.37.0 define
Style como record sin ese método. Se reprodujo **NoSuchMethodError** en el
constructor; Spotless lo presenta envuelto en InvocationTargetException.
No es una infracción ordinaria de formato; no llega a calcular una diferencia.
Evidencias: [causa](../../qa/evidencias/ag007/causa-formateador.txt),
[API real](../../qa/evidencias/ag007/api-estilo-formateador.txt) y
[adaptador](../../qa/evidencias/ag007/google-format-glue-bytecode.txt).

Reparación aplicada: ninguna, porque una opción de configuración no restaura
el método ausente y AG-007 prohíbe cambiar versiones. POM, estándar AOSP, todos
los includes efectivos, exports y goal obligatorio permanecen intactos.
No se utilizó skip, ni se excluyeron fuentes ni se convirtió el control en opcional.
Spotless final: **FALLIDO**. `mvnw verify`: **NO EJECUTADO en AG-007**, condicionado
a Spotless correcto. El verify fallido de AG-006 no se presenta como repetido.

| Criterio | Estado vigente y procedencia |
|---|---|
| BV-01 | PARCIAL: mismas versiones/builds heredados; incompatibilidad del control ahora identificada. |
| BV-02 | Evidencia local AG-006 válida para el mismo backend; verify integral pendiente. |
| BV-03 | 3 integraciones PostgreSQL AG-006 reutilizadas, sin cambios ni nueva ejecución. |
| BV-04 | Contrato 200/503 y caída/recuperación AG-006 reutilizados. |
| BV-05 | OpenAPI/Swagger real AG-006 reutilizado, sin cambios. |
| BV-06 | 11 pruebas Angular, build y navegación AG-006 reutilizados; frontend sin cambios. |
| BV-07 | Compose y persistencia AG-006 reutilizados; no se inició Compose en AG-007. |
| BV-08 | BLOQUEADO: apply/check fallan por incompatibilidad; no se puede proponer cierre local. |
| BV-09 | Actionlint repetido PASS, workflow sin cambios; ciclo verify aún no pasa. CI remota pendiente de push humano. |
| BV-10 | Diagnóstico, límites, manifiesto e integridad registrados; revisión humana pendiente. |

No se repiten builds, HTTP, E2E ni pruebas de aplicación: no hubo cambios y no se
alcanzó el prerrequisito de la regresión ordenada. Los 10 unitarios/HTTP + 3 IT,
11 Angular, 5 E2E, SpotBugs y auditorías de AG-006 conservan fecha y alcance;
no sustituyen verify ni constituyen un resultado nuevo. Sin medición de cobertura.

Revisión de solo lectura realizada por la misma sesión, **no independiente**.
Sin cambios de código durante esa revisión. Históricos protegidos mediante
huellas/prefijos; búsqueda acotada de secretos y enlaces en evidencia de cierre.
Sin comandos Git; el diagnóstico DEBUG documenta lectura interna automática
de .git/config por Spotless/JGit para finales de línea, sin modificación.
Pendientes: autorización para alinear versiones, verify completo, CI remota,
revisión independiente, aceptación humana e integración en main.

---

## AG-008 — Verificación local propuesta tras alinear Spotless

**Fecha:** 2026-10-13, Europe/Madrid. Inicio 11:39:31 +02:00; límite 12:24:31.
Cierre y duración en [cierre.json](../../qa/evidencias/ag008/cierre.json).
**Resultado:** se propone 001 como verificada localmente; aceptación humana pendiente.
[Informe completo AG-008](../../docs/trazabilidad/AG-008-informe.md) y
[manifiesto](../../qa/evidencias/ag008/entrega-manifiesto.json).

Se conserva íntegramente la secuencia anterior:

1. **AG-006:** Spotless falló; las pruebas independientes superadas siguen conservadas.
2. **AG-007:** causa exacta identificada: incompatibilidad binaria de Style.valueOf(String).
3. **AG-008:** decisión humana expresa de alinear google-java-format **1.37.0 → 1.36.1**;
   Spotless **3.10.4**, Java **21**, `style=AOSP` existente y check obligatorio intactos.
4. POM efectivo confirma 3.10.4/1.36.1, cero referencias activas 1.37.0, sin skip ni
   exclusiones Java; 10 main y 4 test. Primer intento falló por DNS del sandbox;
   repetición con escalación de red concreta PASS. Ambos resultados conservados.
5. **spotless:apply PASS**, salida 0: 7 Java reformateados de 14. Contenido/SHA-256 y
   comparación de tokens/literales/imports PASS, sin cambios funcionales detectados.
6. **spotless:check PASS**, salida 0; sin modificar controles.
7. **mvnw.cmd verify PASS**, salida 0, **24,718 s de pared / 23,164 s Maven**.
   Compilación, 10 unitarias/HTTP + 3 IT PostgreSQL/Testcontainers/Flyway, Spotless,
   SpotBugs y empaquetado; cero fallos, errores u omitidas. SpotBugs: cero bugs/errores.
8. **Regresión integrada PASS**: backend final reconstruido, Compose disponible,
   salud/OpenAPI/Swagger/inicio HTTP 200, Angular/API, 5 E2E sin reintentos,
   persistencia, caída real PostgreSQL con HTTP 503 en 2014 ms y recuperación 200.
   Parada final PASS: tres servicios detenidos y volumen conservado.
9. **CI remota: Pendiente de push humano.** Workflow idéntico, Java 21 y mismo POM/
   `sh mvnw -B -ntp verify`. Actionlint PASS reutilizado de AG-006/AG-007.
10. **Revisión independiente pendiente**, posterior al push. Revisión final de esta
    sesión en solo lectura, no independiente; no se corrigió código durante ella.
11. **Aceptación humana e integración en main pendientes.** No se ejecutó Git.

| BV | Estado AG-008 y evidencia |
|---|---|
| BV-01 | PASS local: POM efectivo, Wrapper, verify Windows y build Docker Linux; otra máquina y runner remoto pendientes. |
| BV-02 | PASS local: compilación/empaquetado y arranque; configuración ausente de AG-006 reutilizada. |
| BV-03 | PASS local: 3 IT PostgreSQL/Flyway y persistencia Compose repetidas. |
| BV-04 | PASS local: unitarias/HTTP y secuencia real 200/503/200 con respuesta controlada. |
| BV-05 | PASS local: OpenAPI 3.1 y Swagger ejecutando la consulta en Chromium. |
| BV-06 | PASS local: 11 Angular reutilizadas; nuevas E2E de rutas, estados, teclado y móvil. |
| BV-07 | PASS local: reconstrucción, arranque, persistencia, caída/recuperación y parada con volumen. |
| BV-08 | PASS local: apply/check/verify sin omisiones, 13 backend y 5 E2E; controles no afectados reutilizados. |
| BV-09 | PASS local: workflow/Java/POM/comando equivalente; CI remota pendiente de push humano. |
| BV-10 | Evidencias y manifiesto actualizados con límites; revisión independiente y aceptación humana pendientes. |

Evidencias [AG-008](../../qa/evidencias/ag008/): configuracion-efectiva.json,
spotless-apply.txt, spotless-check.txt, java-comparacion.json, backend-verify.txt,
informes-backend/, pruebas-backend.json, http-integrado.json, compose-regresion.txt,
compose-persistencia-caida.json, navegador-*.json, e2e.xml, compose-cierre.json,
revision-final.json y entrega-integridad.json.

Se reutilizan **11 pruebas Angular, build/tipos/lint/formato frontend, actionlint y
las auditorías npm/OSV AG-006 con su fecha y alcance**, sin repetirlas ni presentarlas
como nuevas. Huellas de 34 archivos frontend y workflow coinciden con AG-006.
No se midió cobertura; auditorías heredadas no cubren plugins Maven ni SO de imágenes.
Warnings conservados: autoasociación Mockito/Byte Buddy, carga dinámica de agentes,
class sharing y NO_COLOR/FORCE_COLOR. No impiden el resultado observado.
La caché normal de Spotless tras apply y el mensaje de SpotBugs sobre report goal
no son omisiones del análisis/check, ejecutados y acreditados por sus informes.

Se preservan por huella todos los históricos, fallos anteriores, ADR y lockfiles.
Solo se elimina tmp/ag007/DiagnosticoFormato.java, con copia duradera idéntica y
explicación completa en AG-007. Búsqueda acotada de secretos sin coincidencias;
no es garantía absoluta. No se detectan archivos inesperados en el delta autorizado.

---

## AG-009 — Correcciones de CI y respuesta a REV-001

**Estado vigente, 2026-10-13:** correcciones locales verificadas; segunda CI remota,
aceptación humana e integración pendientes. Este apéndice actualiza el estado;
los apartados AG-006–AG-008 anteriores conservan su contexto y bytes originales.
Inicio 14:42:45 +02:00; cierre/duración en [cierre.json](../../qa/evidencias/ag009/cierre.json).
[Informe AG-009](../../docs/trazabilidad/AG-009-informe.md) y
[primera revisión independiente](../../docs/trazabilidad/REV-001-revision-independiente-01.md).

AG-008 completó Spotless y verify local. Después la persona responsable publicó
feature/001-base-verificable, los commits 2a4c15c, 7184ff8, 3f379d0, 234e2d5 y f05be8a,
y la PR borrador #1. Primera CI **ejecutada**, runs 38388926539 (push) y 38389011007
(pull_request): frontend PASS; backend FAIL por setup-java `21.0.12.1+1`;
Compose FAIL por copiar public vacío. Son datos del encargo humano, sin consulta Git.
La segunda CI queda pendiente del siguiente push humano; 001 no está aceptada ni integrada.

| REV-001 | Respuesta comprobada en AG-009 | Resultado |
|---|---|---|
| R-01 | Retirada COPY public public; comprobación de carpeta totalmente vacía y eliminación exclusiva; build frontend Docker sin caché PASS sin public. | PASS local |
| R-02 | QA_EVIDENCE_DIR o tmp/evidencias/local; AG-003–AG-008 protegidos, QA_BASELINE_DIR solo lectura, rechazo de salida igual/descendiente; jobs CI con directorios nuevos; 187 históricos idénticos antes/después. | PASS local; artefactos del segundo run por revisar |
| R-03 | README, índice, entorno, arquitectura, plan, este apéndice y MEMORY distinguen AG-008 PASS, primera CI fallida, correcciones AG-009 y segunda CI pendiente. | PASS documental |
| R-04 | Puerto por parámetro > entorno > .env elegido > 18080; BASE_URL única; Compose y Chromium probados en 18080 y 18081. | PASS local |

REV-001 conserva sus hallazgos originales y su estado Correcciones requeridas.
La versión solicitada a setup-java cambia exactamente a `21.0.12.1`, manteniendo
Temurin/Java 21 y todos los controles. Workflow: pull_request y push solo main,
Actions por SHA y permisos mínimos. No se han cambiado dependencias, lockfiles,
requisitos funcionales, código de aplicación ni arquitectura.

Evidencias nuevas bajo [AG-009](../../qa/evidencias/ag009/):

- `mvnw.cmd verify` sin omisiones PASS: 13 pruebas backend (10 unitarias/HTTP + 3 IT
  PostgreSQL/Flyway), cero fallos/errores/omitidas; Spotless y SpotBugs PASS (0 bugs/errores).
  Tiempo de pared 28,141 s. Logs e informes JUnit en backend-verify.txt e informes-backend/.
- Frontend tipos/lint/formato PASS, 11 Angular PASS y build PASS. Se usó el script real
  ng test --watch=false con salida JUnit, sin reducir las pruebas.
- `docker build --no-cache --file frontend/Dockerfile frontend` PASS, 13,906 s;
  ninguna carpeta public ni asset artificial añadido.
- Compose 18080: HTTP salud/OpenAPI/Swagger/Angular 200, persistencia stop/start,
  PostgreSQL caído → 503 real en 2010 ms, error en navegador, recuperación 200 y 5 E2E PASS.
- Compose 18081: mismo recorrido, 503 real en 2013 ms y las mismas 5 E2E PASS.
  Entorno ficticio temporal retirado; tres servicios detenidos y volumen conservado.
- Actionlint PASS y YAML/estructura de triggers/artefactos/prerrequisitos PASS.
  Sintaxis de 6 Node .mjs y 2 PowerShell PASS; utilidades modificadas ejecutadas.
  Cinco casos enfocados de prioridad de puerto PASS, con Docker interceptado solo
  en el arnés; no sustituyen las dos integraciones reales.
- Maven OSV: 125 componentes, sin coincidencias con base pública previamente descargada.
  No actualizada en AG-009. Inventario npm repetido: 689 entradas, 16 preliminares
  transitivos controlados; auditorías npm históricas conservan fecha/alcance.
- Los primeros auxiliares YAML y de ámbito PowerShell fallaron; repeticiones corregidas
  PASS, logs fallidos conservados. Ninguna dependencia nueva por esos fallos.

| BV | Resultado vigente | Evidencia y límite |
|---|---|---|
| BV-01 | PASS local; Linux CI pendiente | Verify Windows, builds Docker Linux, lockfile/POM/digests intactos, construcción sin public. Falta nuevo runner remoto. |
| BV-02 | PASS local | Verify y arranque Compose; fallo sin configuración de AG-006 reutilizado para aplicación intacta. |
| BV-03 | PASS local | 3 IT PostgreSQL/Flyway y persistencia real en ambos recorridos. |
| BV-04 | PASS local | HTTP 200/503/200, respuestas controladas y error visible. |
| BV-05 | PASS local | OpenAPI y Swagger con petición real desde Chromium en ambos puertos. |
| BV-06 | PASS local | 11 Angular, build y E2E de rutas, estados, teclado y móvil. |
| BV-07 | PASS local | Build limpio, Compose 18080/18081, parada y volumen conservado. |
| BV-08 | PASS local con límites | Tipos/lint/formato, Spotless/SpotBugs, 13 backend, 11 Angular y 5 E2E por puerto; auditorías con fecha/alcance declarados. |
| BV-09 | PENDIENTE remoto; PASS local | Primera CI fallida real. Workflow y equivalentes corregidos PASS; segundo run y artefactos por revisar tras push humano. |
| BV-10 | PASS documental local | Estado conciliado, manifiestos, enlaces y hashes. Aceptación humana pendiente. |

Un revisor delegado distinto del escritor examinó las correcciones sin ejecutar
Git, builds, pruebas, Docker ni escrituras. Identificó una colisión baseline/salida,
corregida antes de mkdir y comprobada por arnés; confirmó el cierre del hallazgo.
También se retiró únicamente de AG-009 un dumpstream residual anterior al verify,
con ruta/hash conservados en residuo-excluido.json. No quedan hallazgos técnicos
abiertos en su alcance. El entorno anunciaba workspace-write: solo lectura por
instrucción, sin barrera de escritura acreditada. No aprueba 001.
La revisión de documentos finales corresponde a la sesión principal.

Se preservan 187 archivos históricos por SHA-256 y los prefijos de CSV/validación.
Una sola fila AG-009; REV-001 original intacta. Manifiesto e inventario actual
separados del verificador histórico AG-006. Búsqueda acotada de secretos y delta
sin archivos inesperados; .env local coincide con el ejemplo ficticio.
No se midió cobertura, no se auditó SO de imágenes/plugins Maven y no se reprodujo
el workflow en GitHub. No hubo comandos Git ni integración. Próximo paso: revisión
humana de los dos grupos de commit, push y segunda CI; aceptación y main posteriores.
