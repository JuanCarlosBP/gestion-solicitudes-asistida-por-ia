# AG-008 — Alineación de Spotless y verificación local de 001

**Resultado:** se propone 001 como **verificada localmente**, pendiente de aceptación
humana. Registro factual pendiente de revisión humana; no equivale a aceptación,
integración ni CI remota superada.

**Inicio observado:** 2026-10-13 11:39:31 +02:00, Europe/Madrid.
**Límite autorizado:** 12:24:31 +02:00, 45 minutos.
**Cierre y duración:** [cierre.json](../../qa/evidencias/ag008/cierre.json).
Workspace exclusivo: `C:\Users\carli\gestion-solicitudes-asistida-por-ia`.
Referencia: [AG-007](AG-007-informe.md); se conserva íntegro junto con
[AG-006](AG-006-informe.md), sus fallos y pruebas superadas, AG-003–005 y ADR-0001/0002.

La decisión humana expresa «EJECUCIÓN AUTORIZADA: AG-008» aprobó cambiar únicamente
google-java-format **1.37.0 → 1.36.1**. Se aplicaron las skills de QA y mantenimiento
documental mediante lectura de sus instrucciones. Un único escritor en esta sesión;
roles secuenciales, siguiendo el nivel 3 heredado y la revisión de misma sesión
exigida por el encargo. No se repitió preflight ni investigación Angular.

## Cambio y configuración efectiva

Se modificó la definición existente en `backend/pom.xml`, línea 47:
`build/plugins/plugin/configuration/java/googleJavaFormat/version`.
No se añadió una segunda definición. Spotless permanece en **3.10.4**, Java **21**
y `style=AOSP`, valor ya configurado dentro de google-java-format.
No se cambió el estándar de formato, el plugin ni el runtime de la aplicación.
La decisión se añadió a [versiones](../documentaciondev/versiones.md) antes de apply.

Maven Wrapper generó `backend/target/ag008-effective-pom.xml`, fuera del manifiesto.
El [extracto y su huella](../../qa/evidencias/ag008/configuracion-efectiva.json) confirman:

- Una instancia activa de Spotless Maven 3.10.4 y formatter exactamente 1.36.1.
- Cero referencias a 1.37.0 en el POM efectivo. La repetición de 1.36.1 en la
  ejecución efectiva es herencia de la misma configuración, no otra definición fuente.
- `check` enlazado a `validate`, por tanto incluido en `verify`.
- Sin configuración skip ni exclusiones Java: **10 main y 4 test**.
- Java efectivo **Temurin 21.0.12.1+1-LTS**, observado también en los informes JUnit.

El [log de apply](../../qa/evidencias/ag008/spotless-apply.txt) identifica Spotless
3.10.4 y la resolución/descarga de
`com.google.googlejavaformat:google-java-format:1.36.1` desde Maven Central.
La caché Maven sigue dentro de `tmp/m2`; no se modificó `.m2` global.
No fue necesario el fallback `-U` ni probar otras versiones.

## Comandos ejecutados y resultados

El [registro de comandos](../../qa/evidencias/ag008/comandos.jsonl) conserva horas,
códigos de salida y duraciones. Maven se ejecutó desde backend con JAVA_HOME 21,
MAVEN_USER_HOME y temporales locales, usando el Wrapper existente.

| Comprobación | Resultado observado | Evidencia AG-008 |
|---|---|---|
| `mvnw.cmd help:effective-pom -Doutput=target/ag008-effective-pom.xml` | Primer intento: salida 1 por DNS/restricción de red, sin resolver plugin help. Repetición con escalación específica: salida 0. | pom-efectivo.txt; pom-efectivo-red.txt; configuracion-efectiva.json |
| `mvnw.cmd spotless:apply` | PASS, salida 0; 3,693 s de pared, 2,151 s Maven; 14 archivos cubiertos, 7 reformateados. | spotless-apply.txt |
| Contenido y SHA-256 antes/después | PASS: tokens de código, literales, operadores e imports conservados; comentarios equivalentes sin espacios. | java-antes.json; java-comparacion.json; java-diferencias.json |
| `mvnw.cmd spotless:check` | PASS, salida 0; 2,796 s de pared, 0,858 s Maven. | spotless-check.txt |
| `mvnw.cmd verify` | PASS, salida 0; **24,718 s de pared / 23,164 s Maven**; compilación, Spotless, pruebas, empaquetado y SpotBugs. | backend-verify.txt; informes-backend/ |
| Compose `up -d --build --wait --wait-timeout 120` | PASS, salida 0; reconstruye backend final, reutiliza etapas frontend sin cambios; tres servicios disponibles. | compose-build-arranque.txt; compose-servicios.jsonl |
| HTTP integrado | Salud, OpenAPI, Swagger UI e inicio: HTTP 200. OpenAPI 3.1 y único path técnico. | http-integrado.json |
| Procedimiento integrado ya documentado | PASS, salida 0: persistencia, caída PostgreSQL, HTTP 503 en **2014 ms**, error real en Chromium y recuperación 200. | compose-regresion.txt; compose-persistencia-caida.json; navegador-*.json; inicio-*.png |
| `npm run test:e2e` | PASS, salida 0: **5 pruebas**, sin fallos ni reintentos; 2,0 s Playwright. | e2e.txt; e2e.xml |
| Compose `stop` | PASS, salida 0; tres servicios detenidos y volumen conservado. | compose-parada.txt; compose-cierre.json |

Todas las evidencias indicadas están en [ag008](../../qa/evidencias/ag008/).
El fallo inicial de acceso a Maven Central permanece registrado; no fue un fallo
del formatter ni una corrección de código. No hubo rechazos de revisión automática.

### Pruebas backend reales

| Clase | Pruebas | Fallos / errores / omitidas |
|---|---:|---|
| ServicioSaludTest | 2 | 0 / 0 / 0 |
| ControladorSaludTest | 5 | 0 / 0 / 0 |
| ComprobacionPostgresTest | 3 | 0 / 0 / 0 |
| BaseVerificableIT | 3 | 0 / 0 / 0 |
| Total | **13** | **0 / 0 / 0** |

Las 3 IT usan PostgreSQL real/Testcontainers y cubren Flyway en base nueva,
segundo arranque, migración inválida, rollback/recuperación, permisos y caída 503.
Surefire/Failsafe y `spotbugsXml.xml` se copiaron a informes-backend; el resumen
por clase está en [pruebas-backend.json](../../qa/evidencias/ag008/pruebas-backend.json).
SpotBugs informa **0 BugInstance y 0 errores**. No se midió cobertura.

No se usaron parámetros skip, perfiles reducidos ni omisiones de integración.
El mensaje de Spotless sobre 14 archivos conservados en caché durante check/verify
es su caché normal tras apply, que procesó los 14. No excluye archivos del control.
El mensaje de SpotBugs `Skipping ... report goal` corresponde al objetivo de
publicación de informe; el análisis y el `check` se ejecutaron y produjeron XML.

Warnings: Mockito se autoasocia mediante Byte Buddy; el JDK avisa sobre carga
dinámica futura de agentes y class sharing. Playwright avisa del conflicto
NO_COLOR/FORCE_COLOR. No se ocultaron ni se cambió configuración para silenciarlos.
Los errores controlados de migración inválida/caída pertenecen a pruebas negativas
superadas, no a un arranque final fallido. El backend termina con 143 al recibir
la parada normal; frontend y PostgreSQL terminan con 0.

## Archivos reformateados y equivalencia

Siete Java cambiaron únicamente su presentación/imports; los otros siete
permanecieron idénticos byte a byte:

- `backend/src/main/java/es/gestionsolicitudes/configuracion/ContratoApi.java`
- `backend/src/main/java/es/gestionsolicitudes/configuracion/SeguridadTecnica.java`
- `backend/src/main/java/es/gestionsolicitudes/salud/http/ControladorSalud.java`
- `backend/src/test/java/es/gestionsolicitudes/integracion/BaseVerificableIT.java`
- `backend/src/test/java/es/gestionsolicitudes/salud/aplicacion/ServicioSaludTest.java`
- `backend/src/test/java/es/gestionsolicitudes/salud/http/ControladorSaludTest.java`
- `backend/src/test/java/es/gestionsolicitudes/salud/persistencia/ComprobacionPostgresTest.java`

Se guardaron bytes originales en Base64 y contenido legible antes de apply.
La comparación tokeniza Java conservando literalmente cadenas, caracteres,
identificadores y operadores; compara imports sin orden y comentarios sin espacios.
Rechaza text blocks/escapes Unicode para no normalizarlos incorrectamente; no
aparecen en estas fuentes. También registra SHA-256 de cada versión y texto completo
antes/después de los siete archivos. Las aserciones, endpoints, nombres públicos,
lógica, literales y configuración funcional permanecen iguales. Ningún cambio
funcional detectado; ninguna reversión ni corrección adicional necesaria.

## Reutilización y conservación

Se reutilizan de AG-006 las **11 pruebas Angular**, tipos, lint, formato y build
frontend, las auditorías npm/OSV de aquella fecha y actionlint. No son ejecuciones
nuevas. [35 huellas](../../qa/evidencias/ag008/reutilizacion-huellas.json) confirman
34 archivos frontend y el workflow idénticos a AG-006 y al inicio de AG-008.
El actionlint adicional PASS de AG-007 también permanece conservado.
Las auditorías anteriores no cubrían plugins Maven ni SO de imágenes; AG-008 no
amplía esa cobertura ni vuelve a auditar dependencias no afectadas del runtime.

La regresión Compose utiliza copias temporales de los verificadores existentes:
solo se adaptaron raíces/import de Playwright y destinos de evidencia a AG-008.
No se modificaron aserciones ni se pasó OmitirNavegador. Las copias exactas quedan
en evidencias como `.ps1.txt`/`.mjs.txt`; los originales de QA están intactos.
El historial Flyway conserva exactamente `1:-60045458:2026-10-13 08:41:14.03714`
tras stop/start. El volumen `gestion-solicitudes-001_datos-postgres` sigue presente.

Se eliminó únicamente `tmp/ag007/DiagnosticoFormato.java`, idéntico por SHA-256 a
su copia duradera AG-007 y descrito íntegramente en aquel informe.
`tmp/ag007/` permanece porque contiene `verificar-cierre.mjs`.
[Limpieza](../../qa/evidencias/ag008/limpieza.json) registra esta decisión.

## Revisión final BV-01 a BV-10

La revisión final de solo lectura se registra en
[revision-final.json](../../qa/evidencias/ag008/revision-final.json).
La realiza **la misma sesión, no un revisor independiente**. No se corrige código
durante esa revisión. La consolidación documental posterior registra el resultado
sin convertirlo en aprobación de la persona responsable.

| Criterio | Estado local y evidencia | Límite pendiente |
|---|---|---|
| BV-01 | PASS local: POM efectivo exacto, Wrapper Windows, compilación Docker Linux y fijaciones conservadas. | Otra máquina Windows y runner CI Linux no probados en AG-008. |
| BV-02 | PASS local: compilación, empaquetado, arranque Compose; fallo por configuración ausente AG-006 reutilizado. | Aceptación humana. |
| BV-03 | PASS local: 3 IT PostgreSQL/Flyway y persistencia Compose repetidas. | Aceptación humana. |
| BV-04 | PASS local: unitarias/HTTP y caída real 200/503/200 sin datos internos. | Aceptación humana. |
| BV-05 | PASS local: OpenAPI 3.1, Swagger y petición técnica desde Chromium. | Aceptación humana. |
| BV-06 | PASS local: 11 Angular reutilizadas y 5 E2E nuevas; rutas, recarga, estados, teclado y móvil. | Aceptación humana. |
| BV-07 | PASS local: build/arranque, persistencia, caída, recuperación y parada con volumen. | Aceptación humana. |
| BV-08 | PASS local: apply/check/verify íntegros, 13 backend, SpotBugs, E2E y controles no afectados reutilizados. | Auditorías con fecha/alcance heredados; revisión independiente. |
| BV-09 | PASS local: mismo POM, Java 21 y `sh mvnw -B -ntp verify`; workflow idéntico/actionlint reutilizado. | **CI remota: Pendiente de push humano.** |
| BV-10 | Evidencias, matriz, historia, manifestación de límites y memoria actualizadas; controles de integridad/documentación. | Revisión independiente y aceptación humana. |

El [control de entrega](../../qa/evidencias/ag008/entrega-integridad.json) comprueba
huellas históricas, prefijos CSV/versiones/validación, enlaces, cambios inesperados
y patrones acotados de secretos. No encontrar coincidencias no garantiza ausencia
absoluta de secretos. Se conserva el contenido anterior de MEMORY en memoria-anterior.
Los estados AG-006/AG-007 anteriores siguen siendo historia; el apéndice AG-008 de
validación y MEMORY contienen el estado vigente. No se reescriben informes pasados.

## Manifiesto y entrega humana

El [manifiesto actualizado](../../qa/evidencias/ag008/entrega-manifiesto.json)
enumera cada archivo, tamaño, SHA-256, estado respecto al inicio y propuesta AG-008.
No es un estado Git. Sus dos salidas propias están identificadas sin autohuella
para evitar referencias circulares. Solo el delta autorizado se propone en AG-008.

Modificados: POM, los siete Java anteriores, versiones, validación, MEMORY y la
misma fila única AG-008 del CSV. Nuevos: este informe y evidencias AG-008.
Eliminado: únicamente el auxiliar temporal AG-007 descrito arriba, fuera del manifiesto
de commit. No se eliminan lockfiles, evidencias, cachés ni volúmenes.

Se excluyen `.env`, `.git`, `tmp/`, cachés npm/Maven, `target/`, `node_modules/`,
`dist/`, `.angular/`, resultados temporales y logs temporales. Los logs bajo
qa/evidencias/ag008 son evidencia duradera de comandos concretos, revisable.

Mensajes semánticos sugeridos, sin ejecutar:

1. `build: alinear google-java-format 1.36.1 con Spotless 3.10.4`
   — POM y siete Java reformateados.
2. `docs: registrar verificación local de 001 y evidencias AG-008`
   — informe, versiones, validación, MEMORY, fila CSV y evidencias.

**Ninguna operación Git ejecutada**, tampoco consultas de estado, rama o diff;
sin CI remota ni despliegue. Spotless conserva su mecanismo interno JGit de finales
de línea, cuya lectura automática de `.git/config` se documentó en AG-007;
no se invocó Git ni se modificó esa configuración.

Siguen pendientes **push humano, CI remota, revisión independiente posterior al push,
aceptación humana e integración en main**. La propuesta local no levanta esos pasos.
La sesión se detiene tras entregar; no hay reanudación ni automatización programada.

Incidencia de consolidación posterior a la revisión: el lector JSON PowerShell
convirtió automáticamente la fecha ISO a DateTime; su reconversión regional falló
al actualizar el cierre y dejó metadatos de duración inconsistentes. Se corrigió
únicamente el cierre/fila AG-008 usando el inicio ISO conocido y se comprobó su
consistencia. No afecta a código, pruebas ni históricos. Detalle en
[incidencia-cierre.json](../../qa/evidencias/ag008/incidencia-cierre.json).
