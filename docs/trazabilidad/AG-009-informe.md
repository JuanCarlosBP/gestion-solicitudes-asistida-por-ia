# AG-009 — Correcciones de CI y respuesta a REV-001

**Estado:** Correcciones y verificación local completadas; segunda CI y aceptación humana pendientes.
**Inicio observado:** 2026-10-13 14:42:45 +02:00, Europe/Madrid.
**Límite orientativo:** 15:57:45 +02:00 (75 minutos).
**Cierre y duración observados:** [cierre.json](../../qa/evidencias/ag009/cierre.json).

La persona responsable comunicó la publicación de la rama
`feature/001-base-verificable`, los commits 2a4c15c, 7184ff8, 3f379d0,
234e2d5 y f05be8a, y la PR borrador #1. Los runs iniciales 38388926539 (push)
y 38389011007 (pull_request) ejecutaron frontend con PASS, backend con FAIL
por la notación `21.0.12.1+1` de setup-java y Compose con FAIL por `COPY public`.
Estos datos remotos proceden del encargo humano; no se consultó Git.

El encargo autoriza corregir ambos fallos, R-01 a R-04 de
[REV-001](REV-001-revision-independiente-01.md) y el estado documental posterior
a AG-008, sin funciones nuevas, cambios de requisitos funcionales o arquitectura.

Se protegió la historia antes de modificar, se corrigieron CI/Docker/QA, se
ejecutaron los controles locales y se conciliaron los documentos de estado.
No se implementaron funcionalidades ni se modificaron requisitos o arquitectura.
001 no está aceptada ni integrada. Ninguna operación Git.

## Respuesta a los hallazgos

| Hallazgo | Corrección y comprobación | Resultado local y riesgo restante |
|---|---|---|
| R-01, bloqueante | `frontend/Dockerfile`: retirada exacta de `COPY public public`. La carpeta tenía cero entradas, incluidas ocultas; se eliminó solo ese directorio vacío. Build Docker sin caché PASS sin public. | PASS; ejecución del runner remoto corregido pendiente. |
| R-02, medio | Salidas nuevas, protección de AG-003–AG-008 y baseline personalizada, artefactos CI exclusivos del job, pasos Maven posteriores condicionados a éxito. 187 históricos idénticos. | PASS local; subida real de artefactos del siguiente run por revisar. |
| R-03, medio | README, índice, entorno, arquitectura, plan, apéndice de validación y MEMORY concilian AG-008, PR publicada, primera CI fallida, REV-001 y AG-009. | PASS documental; aceptación humana pendiente. |
| R-04, bajo | Puerto por parámetro > entorno > archivo elegido > 18080. BASE_URL calculada llega al navegador; comprobación real completa en 18080 y 18081. | PASS; otros puertos no ensayados individualmente. |

[REV-001](REV-001-revision-independiente-01.md) conserva el dictamen original
«Correcciones requeridas»; la respuesta se registra aquí y en validación.

## CI y salidas QA

La única modificación de versión en setup-java es **`21.0.12.1+1` → `21.0.12.1`**.
Se conservan Temurin, Java 21, Spotless, SpotBugs, Testcontainers y verify íntegro.
No se sustituye por una versión mayor abierta. Las imágenes conservan sus digests.
La resolución concreta del build Temurin queda por confirmar en el próximo run.

El disparador es `pull_request` y `push` con `branches: [main]`.
Un push a `feature/001-base-verificable` no añade otro run de push al de la PR.
Se mantienen todos los controles y las Actions fijadas por SHA.

`qa/rutas-evidencia.mjs` centraliza rutas dentro del proyecto: usa
`QA_EVIDENCE_DIR` o `tmp/evidencias/local`, crea el destino y rechaza históricos,
`.git`, rutas externas y enlaces simbólicos/junctions en el recorrido.
Lo usan auditor Maven, verificador de navegador, Compose, entrega y documentación.
Este último también escribía en AG-006 y se incluyó para cerrar completamente R-02.
`-DirectorioEvidencias` tiene prioridad sobre el entorno en Compose.

`QA_BASELINE_DIR` controla exclusivamente lectura de `verificar-entrega.mjs`,
por defecto AG-006. Se rechaza que la salida coincida con la baseline o esté
dentro de ella antes de crear directorios. El verificador conserva su semántica
histórica AG-006; no acredita por sí solo el delta de AG-009. Esta entrega
aporta inventario inicial, manifiesto propio y control de históricos independientes.

| Job | Directorio nuevo | Artefactos permitidos |
|---|---|---|
| Backend | `${{ github.workspace }}/tmp/evidencias/backend` | Informes de pruebas/SpotBugs de `backend/target/` del run y `maven.cdx.json`/`maven-osv.json` del directorio nuevo. |
| Compose | `${{ github.workspace }}/tmp/evidencias/compose` | `frontend/test-results/` del run y el directorio nuevo. |

Cada job comprueba su ruta exacta antes de eliminar únicamente ese directorio
temporal y recrearlo. Inventario, preparación OSV y auditoría Maven requieren
éxito previo. La subida mantiene `always()`; ninguna ruta apunta a AG históricas.
Toda evidencia durable de AG-009 está en [su directorio](../../qa/evidencias/ag009/).
tmp, target y directorios de herramientas contienen salidas operativas,
no forman parte de los commits sugeridos.

## Comprobaciones ejecutadas

Entorno local: Windows 11, PowerShell 7, Temurin 21.0.12.1, Node 24.13.0,
npm 11.6.2 y Docker Desktop Linux; se mantienen las versiones documentadas.
Los archivos `*-comando.json` registran argumentos, directorio, hora, duración,
salida real y log. [Resumen JUnit](../../qa/evidencias/ag009/resumen-pruebas.json).

| Comprobación | Resultado observado | Evidencia AG-009 |
|---|---|---|
| `mvnw.cmd verify`, sin skip | PASS; 28,141 s de pared, 26,279 s Maven; 10 unitarias/HTTP + 3 IT PostgreSQL, cero fallos/errores/omitidas. Spotless PASS, SpotBugs 0 bugs/errores, compilación/empaquetado PASS. | `backend-verify.txt`, `backend-verify-comando.json`, `informes-backend/` |
| Tipos, lint y formato frontend | PASS: `npm run typecheck`, `lint`, `format:check`. | `frontend-typecheck.txt`, `frontend-lint.txt`, `frontend-format-check.txt` |
| Angular y build | PASS: 11 pruebas, cero fallos/errores; build completo. Script real `ng test --watch=false`, con reporter JUnit; no necesita añadir `--run`. | `frontend-unitarias.xml`, `frontend-test.txt`, `frontend-build.txt` |
| `docker build --no-cache --file frontend/Dockerfile frontend` | PASS, 13,906 s; public ausente antes y después. | `docker-frontend-sin-cache.txt`, `public-eliminado.json` |
| Compose 18080 | PASS: salud/OpenAPI/Swagger/Angular 200, persistencia stop/start, PostgreSQL detenido → 503 en 2010 ms, error visible, recuperación 200 y 5 E2E. | `puerto-18080/` |
| Compose 18081 | PASS con .env ficticio temporal: mismos controles, 503 en 2013 ms, recuperación y 5 E2E. Son las mismas cinco pruebas repetidas en otro puerto. | `puerto-18081/` |
| Parada y limpieza | Tres servicios detenidos y volumen conservado en ambos recorridos; configuración temporal alternativa eliminada. | `puerto-18081/cierre-compose.json`, `limpieza-configuracion.json`, `estado-docker-final.json` |
| Actionlint 1.7.12 | PASS, salida 0. YAML analizado con js-yaml instalado; triggers, rutas y condiciones comprobados. | `actionlint.txt`, `actionlint-comando.json`, `utilidades-y-workflow.json` |
| Sintaxis y ejecución QA | 6 .mjs y 2 PowerShell sin errores sintácticos. Utilidades modificadas ejecutadas; rechazo de históricos, destino predeterminado y baseline independiente comprobados. | `sintaxis.json`, `utilidades-y-workflow-final.txt`, `verificador-entrega-final/`, `documentacion-control.json` |
| Prioridad del puerto | Cinco casos enfocados PASS: parámetro, entorno, archivo con comillas/comentario, predeterminado e inválido. Docker interceptado solo en este arnés; integración real separada. | `precedencia-puerto.json`, `precedencia-puerto-repeticion.txt` |
| Dependencias | Inventario npm: 689 entradas, 16 preliminares transitivos controlados. Maven: 125 componentes, OSV offline sin coincidencias. | `inventario-transitivas.json`, `maven.cdx.json`, `maven-osv.json` |

La base OSV fue reutilizada, sin nueva descarga en AG-009; su huella y fecha están
en resumen-pruebas.json. Las auditorías npm e instalación reproducible de AG-006
conservan su fecha/alcance; no se presentan como nuevas. package.json, lockfile,
POM y configuración funcional están intactos. El Docker frontend sí ejecutó
`npm ci` dentro del build sin caché. No se midió cobertura ni se auditó el SO
de imágenes o los plugins Maven. El próximo runner Linux sigue siendo necesario.

## Incidencias y revisión independiente de las correcciones

Dos primeros intentos de auxiliares fallaron, con logs preservados: el arnés YAML
solicitó un módulo ausente (`yaml`) y se corrigió para usar `js-yaml` ya instalado;
el arnés de prioridad PowerShell capturaba la URL en un ámbito incorrecto y se
corrigió su variable de observación. Las repeticiones pasaron, sin modificar la
aplicación para acomodar las pruebas ni instalar dependencias.

Otro agente con rol revisor examinó código, CI y evidencias en solo lectura.
Encontró la colisión de salida con baseline personalizada; el implementador
añadió el rechazo previo a escritura y la prueba enfocada, y el revisor confirmó
la corrección. Detectó también un dumpstream de las 10:31 copiado desde target:
se retiró únicamente su copia nueva. residuo-excluido.json conserva ruta y hash;
los diez informes restantes se generaron dentro del verify de 14:47.

[Revisión técnica](../../qa/evidencias/ag009/revision-tecnica.json): sin hallazgos
técnicos abiertos en su alcance. El revisor no ejecutó Git, builds, pruebas,
Docker ni escrituras, ni aprobó 001. El entorno anunciaba workspace-write:
la lectura exclusiva fue una restricción de trabajo, no una barrera comprobada.
Planificador y revisor fueron agentes distintos del escritor principal.
La revisión del cierre documental y los controles finales corresponden a la
sesión principal; no se atribuyen al dictamen independiente anterior.

## Estado de BV-01 a BV-10

PASS local identifica evidencia técnica, no aceptación de la persona responsable.

| BV | Estado | Evidencia y límite restante |
|---|---|---|
| BV-01 | PASS local; plataforma remota pendiente | Wrapper/verify Windows y builds Docker Linux, lockfile e imágenes conservados, build limpio sin public. Runner de la nueva CI todavía no probado. |
| BV-02 | PASS local | 13 pruebas backend y arranque Compose. Fallo por configuración ausente reutilizado de AG-006, sin cambios de aplicación/configuración. |
| BV-03 | PASS local | 3 IT PostgreSQL/Flyway: migración inicial, repetición e inválida; persistencia en ambos puertos. |
| BV-04 | PASS local | HTTP 200/503 y secuencia real de fallo/recuperación, cuerpo público sin detalles internos. |
| BV-05 | PASS local | OpenAPI accesible y Swagger ejecutando consulta real en ambos recorridos Chromium. |
| BV-06 | PASS local | 11 Angular, build, rutas directa/recarga/raíz/desconocida, estados, teclado y móvil en E2E. |
| BV-07 | PASS local | Build sin caché, tres servicios, 18080/18081, persistencia y parada conservando volumen. |
| BV-08 | PASS local con límites de auditoría declarados | Tipos/lint/formato, Spotless/SpotBugs, 13 backend, 11 Angular y 5 E2E por puerto; OSV con base reutilizada. |
| BV-09 | PENDIENTE remoto; PASS local | Primera CI ejecutada y fallida; actionlint/YAML/comandos locales corregidos PASS. Segundo run tras push humano, artefactos y resolución Temurin por revisar. |
| BV-10 | PASS documental local; revisión humana pendiente | Fuentes de estado conciliadas, REV-001 conservada, manifiestos, enlaces y hashes. Aceptación de 001 pendiente. |

## Integridad, archivos y commits sugeridos

[Antes](../../qa/evidencias/ag009/historicos-antes.json) y
[después](../../qa/evidencias/ag009/historicos-despues.json): **187 archivos iguales**,
sin añadidos ni eliminados dentro de los históricos protegidos. Se preservan
informes AG-006–008, evidencias, memoria hasta AG-005 y ADR-0001/0002.
Los prefijos anteriores de CSV y validación permanecen idénticos por SHA-256.
Hay una sola fila AG-009. REV-001 mantiene su huella tras su registro inicial.

El [control final](../../qa/evidencias/ag009/control-final.json) enumera cambios
autorizados, ausencia de archivos inesperados y valores de verificación.
La búsqueda acotada de patrones no encontró secretos; .env coincide con el
ejemplo ficticio y no se copia a evidencia ni commits. No garantiza ausencia
absoluta de cualquier secreto. Los artefactos operativos de herramientas quedan
en sus directorios ignorados, y los auxiliares/configuraciones temporales en tmp.
No se modificó Docker global ni se eliminaron volúmenes.

Se modifican **15 archivos existentes**; se crean el helper QA y los dos informes,
además de las evidencias AG-009. No se elimina ningún archivo fuente inicial:
solo frontend/public vacío y las configuraciones temporales utilizadas.
Se retiró también la copia residual antes descrita, creada durante esta ejecución.
El [manifiesto completo](../../qa/evidencias/ag009/entrega-manifiesto.json) incluye
ruta, estado, tamaño y SHA-256; la [integridad](../../qa/evidencias/ag009/entrega-integridad.json)
declara sus exclusiones. No se usó Git para calcularlos.

1. **`fix(ci): corregir reproducibilidad y aislamiento de evidencias de 001`**:
   .github/workflows/ci.yml, frontend/Dockerfile, qa/rutas-evidencia.mjs,
   qa/auditar-maven.mjs, qa/verificar-compose.ps1,
   qa/verificar-estado-navegador.mjs, qa/verificar-entrega.mjs,
   qa/verificar-documentacion.mjs.
2. **`docs(001): registrar primera CI y respuesta a REV-001`**:
   README, MEMORY, índice docs, entorno, arquitectura, plan y validación 001,
   ejecuciones-agentes.csv, REV-001, informe AG-009 y qa/evidencias/ag009/.

El [manifiesto de commits](../../qa/evidencias/ag009/manifiesto-commits.json)
enumera ambos grupos, sin tmp, target, dist, node_modules ni .env.
Son propuestas para la persona responsable, no commits ejecutados.

Pendientes: siguiente push humano, segunda CI real con enlaces/resultados y
artefactos revisados, decisión de aceptación y eventual integración de PR #1.
La recomendación técnica es mantener 001 pendiente hasta esas comprobaciones.
Esta ejecución termina aquí; no hay publicación, integración ni reanudación automática.
