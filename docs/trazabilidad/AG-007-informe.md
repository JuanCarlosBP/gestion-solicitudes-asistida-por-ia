# AG-007 — Incompatibilidad binaria de Spotless identificada

**Estado:** ejecución bloqueada; informe factual pendiente de revisión humana.
**Inicio:** 2026-10-13 11:16:00 +02:00, Europe/Madrid.
**Límite autorizado:** 12:01:00 +02:00. Cierre y duración en
[cierre.json](../../qa/evidencias/ag007/cierre.json) y en la única fila AG-007 del CSV.
**Referencia:** [AG-006](AG-006-informe.md), conservada íntegramente.

No se ha cerrado la verificación local de 001. El diagnóstico identifica un fallo
de compatibilidad de la integración del formatter, anterior al cálculo de formato.
No se modificaron fuentes, pruebas, POM, configuración, versiones ni workflow.
No se inició Compose, no se utilizaron omisiones de pruebas y no se ejecutó verify:
la orden exige que spotless:check pase primero.

## Causa exacta y evidencia

Configuración vigente: Spotless Maven **3.10.4**, spotless-lib **4.10.4**,
google-java-format **1.37.0**, estilo **AOSP**, check enlazado a validate y,
por tanto, al ciclo verify. Java observado en Maven: **21.0.12.1**, UTF-8.
Se conserva `.mvn/jvm.config` con los exports de jdk.compiler de AG-006.

`GoogleJavaFormatFormatterFunc`, adaptador incluido en spotless-lib, ejecuta
`JavaFormatterOptions.Style.valueOf(String)` en su constructor. La clase Style
publicada en google-java-format 1.37.0 es un **record**, no el enum esperado,
y no contiene ese método. El resultado concreto es:

```text
java.lang.NoSuchMethodError:
  JavaFormatterOptions$Style.valueOf(java.lang.String)
at GoogleJavaFormatFormatterFunc.<init>(GoogleJavaFormatFormatterFunc.java:51)
```

Spotless construye ese adaptador mediante reflexión; su salida de lint presenta
el envoltorio `InvocationTargetException` en los 14 archivos. No es evidencia de
14 errores de sintaxis o de formato del proyecto. Tampoco es un fallo de encoding,
finales de línea o archivos generados: la llamada incompatible ocurre al construir
el formatter, antes de procesar el texto. El diagnóstico se hizo con Java 21.
No se ejecutó Linux en AG-007; el enlace a ese método ausente no depende del OS.

Evidencias bajo [ag007](../../qa/evidencias/ag007/):

- [Check inicial](../../qa/evidencias/ag007/spotless-check-inicial.txt) y
  [apply oficial](../../qa/evidencias/ag007/spotless-apply-inicial.txt): versiones,
  clase afectada y los 14 errores observados.
- [Check con diagnóstico](../../qa/evidencias/ag007/spotless-check-diagnostico.txt):
  Java efectivo, configuración, resolución local y excepción envuelta.
- [Bytecode del adaptador](../../qa/evidencias/ag007/google-format-glue-bytecode.txt):
  invocación incondicional de Style.valueOf; [API real de Style](../../qa/evidencias/ag007/api-estilo-formateador.txt): record sin ese método.
- [Causa expuesta](../../qa/evidencias/ag007/causa-formateador.txt): reproducción
  del constructor con las mismas bibliotecas locales, sin modificar fuentes.
  [Fuente del diagnóstico](../../qa/evidencias/ag007/DiagnosticoFormato.java.txt)
  y [script de reproducción](../../qa/evidencias/ag007/reproducir-causa.ps1.txt).

No se generó una diferencia de formato esperada: el formatter no alcanza esa fase.
Cambiar espacios, AOSP por otro nombre, los exports o los includes no restaura
el método eliminado. No se intentó una configuración sin fundamento.
**Correcciones de configuración realizadas: cero. Archivos formateados: cero.**
El ajuste mínimo permitido no alcanza esta incompatibilidad. Alinear versiones
o reemplazar la integración exigiría una autorización distinta; no se investigaron
nuevas versiones ni se aplicó una tercera estrategia o un adaptador propio.

## Comandos y resultados de AG-007

Maven se ejecutó desde backend, con JAVA_HOME de Java 21, MAVEN_USER_HOME y
temporales locales ya documentados. El [registro de comandos](../../qa/evidencias/ag007/comandos.jsonl)
contiene horas y códigos; cada salida completa se conserva.

| Comando | Resultado |
|---|---|
| `.\mvnw.cmd spotless:check` | FAIL, salida 1; 14 archivos afectados; aproximadamente 3,0 s de pared. |
| `.\mvnw.cmd spotless:apply` | FAIL, salida 1; no pudo construir el formatter; aproximadamente 3,0 s de pared. |
| `.\mvnw.cmd -e -X spotless:check` | FAIL tras apply, salida 1; aproximadamente 3,1 s de pared. |
| `javap -private -c` sobre adaptador/estado del formatter y `javap -public` sobre Style/configuración | Inspección de los JAR ya instalados; evidencia del enlace incompatible. |
| Java 21 con el reproductor diagnóstico, mismos exports y bibliotecas | Salida 1, NoSuchMethodError expuesto, sin escritura en fuentes. |
| `tmp/herramientas/actionlint/actionlint.exe -color` | PASS, salida 0; workflow sin cambios. |
| `.\mvnw.cmd verify` | **NO EJECUTADO en AG-007**, falta prerrequisito spotless:check. El fallo de AG-006 se conserva como histórico. |
| Builds, pruebas de aplicación, HTTP, Compose y E2E | **NO REPETIDOS**: no hubo cambios de código y la regresión estaba condicionada a verify correcto. |

## Reutilización, CI y revisión

Se compararon contenido y SHA-256 de los **14 Java: 10 main y 4 test**,
sin diferencias. [Comparación por archivo](../../qa/evidencias/ag007/java-comparacion.json)
incluye huellas antes/después; [contenido previo](../../qa/evidencias/ag007/java-antes.json)
permite revisar la comparación sin Git. El inventario de cierre contrasta también
backend, frontend, infraestructura y configuración con el inicio de AG-007.

Se reutilizan las evidencias AG-006 de 10 unitarias/HTTP backend, 3 integraciones
PostgreSQL, 11 Angular, 5 E2E, builds, SpotBugs, auditorías, HTTP/Swagger,
persistencia/recuperación y parada. Siguen describiendo el mismo código y
configuración; **no se presentan como ejecutadas de nuevo ni sustituyen verify**.
Las auditorías conservan su fecha; no son una nueva evaluación de vulnerabilidades.
No se arrancaron servicios; el último estado observado de Compose es la parada
de AG-006 con volumen conservado, no una comprobación nueva de Docker.

Workflow revisado: actions por SHA, Java/Node fijados, contents:read,
persist-credentials:false, informes conservados y sin secretos incrustados
detectados. `sh mvnw -B -ntp verify` corresponde al mismo ciclo obligatorio
Windows, que aún no ha pasado. Sintaxis válida no implica ejecución correcta.
**CI remota: pendiente de push humano.** No se ejecutó GitHub Actions.

La revisión de BV-01 a BV-10 se hizo en solo lectura después del diagnóstico;
no se reparó código durante la revisión. La misma sesión realizó diagnóstico y
revisión: **no independiente**. El coordinador documenta después sus resultados.
La [matriz vigente](../../especificaciones/001-base-verificable/validacion.md)
mantiene BV-01/09 parciales, BV-08 bloqueado y BV-02–07 con evidencia local AG-006.
BV-10 incorpora el diagnóstico y límites. T006 continúa parcial y T008 pendiente
de revisión independiente/aceptación. No se propone cierre local.

## Conservación, archivos y siguiente decisión

Se preservan todos los bytes de AG-003/004/005/006 en CSV, los ADR 0001/0002,
informe AG-006 y evidencias pasadas/fallidas. Validación recibe un apéndice sin
reescribir su prefijo. MEMORY previo está guardado íntegro en
[memoria-anterior.txt](../../qa/evidencias/ag007/memoria-anterior.txt).
[Integridad](../../qa/evidencias/ag007/entrega-integridad.json) y
[manifiesto AG-007](../../qa/evidencias/ag007/entrega-manifiesto.json)
registran archivos, tamaños, huellas, cambios y exclusiones de temporales/builds.
Solo cambian validación, MEMORY, la fila nueva del CSV y el informe/evidencias AG-007.
No se reescriben manuales, índices, requisitos o arquitectura.

No se invocó Git por CLI ni se solicitaron operaciones de ramas, estado,
diferencias, commits, remoto o integración. Precisión observada: Spotless usa
JGit internamente con `GIT_ATTRIBUTES_FAST_ALLSAME` y su log DEBUG muestra una
lectura automática de `.git/config` para esa configuración de finales de línea.
No se modificó esa configuración ni se ejecutó un comando Git; se deja constancia
de la lectura indirecta en lugar de afirmar ausencia absoluta de acceso a metadatos.

Pendiente decisión humana: autorizar alinear la pareja Spotless/formatter bajo
un alcance nuevo. Después, apply/check, verify sin omisiones, regresión aplicable,
push humano, CI remota, revisión independiente, aceptación e integración en main.
No se instala, programa ni reanuda esa reparación en este cierre.

## Manifiesto de commits sugeridos

AG-007 solo añade evidencia/documentación; no hay commit de reparación de código.
Propuesta: `docs: identificar incompatibilidad binaria de Spotless en AG-007`.
Agrupar validación, informe AG-007, MEMORY, fila CSV y evidencias revisadas.
Excluir tmp, target, cachés y configuración local. Los grupos de implementación
sugeridos en AG-006 siguen siendo propuestas pendientes, sin reescribir su historia.
No describir la base como verificada ni integrar mientras exista este bloqueo.
