# Coordinación de agentes

**Estado:** Aprobado

## 1. Para qué se coordinan los agentes

Dividir el trabajo permite separar análisis, implementación y revisión.
La coordinación evita que dos agentes cambien el mismo archivo
o den por resuelta una dependencia que todavía está pendiente.
El proceso sigue [SDD](sdd.md) y [AGENTS.md](../../AGENTS.md).

## 2. Persona responsable del proyecto

Decide alcance, prioridades y aceptación.
Aprueba especificaciones, planes, tareas y cambios de requisitos.
Resuelve decisiones que los agentes no tienen delegadas.
Realiza las operaciones Git y autoriza cualquier publicación o despliegue.

No se deduce su aprobación del silencio.
Un informe favorable de un agente no aprueba el trabajo en su nombre.

## 3. Coordinador

La sesión principal actúa como coordinador.
Divide el trabajo autorizado, asigna archivos y controla dependencias.
Conserva el estado global y consolida resultados.
Comprueba que cada tarea tiene requisitos y una evidencia esperada.

Puede escribir documentos de coordinación y consolidación autorizados.
También puede actuar como implementador si esa asignación queda explícita.
No escribirá un archivo que tenga otro agente asignado.
No convierte una decisión técnica propia en aprobación humana.

## 4. Planificador

Analiza requisitos, riesgos, dudas y alternativas.
Consulta archivos y devuelve una propuesta concreta al coordinador.
Su configuración es de solo lectura.
No modifica especificaciones ni planes directamente: propone texto o cambios.

No implementa ni ejecuta comandos que produzcan artefactos.
Identifica decisiones pendientes y qué tareas dependen de ellas.
Su propuesta debe enlazar las fuentes que ha utilizado.

## 5. Implementador

Escribe solo en el workspace y dentro de la tarea aprobada.
Comprueba el alcance antes de cambiar archivos.
Implementa, ejecuta las pruebas pertinentes y documenta resultados.
Entrega cambios y evidencias para revisión.

No amplía funciones ni sustituye requisitos por lo que resulte más sencillo.
No modifica políticas para evitar un fallo de su implementación.
Si una corrección requiere otra decisión, devuelve el problema al coordinador.

## 6. Revisor

Trabaja en modo de solo lectura.
Revisa requisitos, diferencias de archivos y evidencias.
Cuando no se permite Git, recibe comparaciones de contenido y huellas de archivos.
No corrige durante la misma revisión ni ejecuta pruebas que escriban artefactos.

Si una prueba necesita ejecución, pide al implementador evidencia reproducible.
Relaciona cada hallazgo con archivo, criterio, impacto y comprobación.
Distingue defectos bloqueantes de observaciones menores según calidad.
No acepta el trabajo por la persona responsable.

## 7. Configuración y permisos

Los tres roles están declarados en archivos de [.codex/agents](../../.codex/agents).
El [config.toml](../../.codex/config.toml) limita a tres subagentes concurrentes.
La sesión principal no cuenta como un cuarto subagente.
No se fuerza un modelo ni se cambia la configuración global.

El planificador y el revisor solicitan solo lectura.
El implementador usa escritura limitada al workspace.
Los permisos efectivos de la sesión y del entorno también se aplican.
Antes de delegar se comprueba que no amplían el acceso esperado.
Una instrucción escrita no sustituye una restricción técnica de permisos.

## 8. Un escritor por archivo

El coordinador asigna un propietario de escritura a cada conjunto de archivos.
La asignación incluye archivos nuevos, compartidos y generados.
README, MEMORY, índices y registros suelen quedar reservados al coordinador.
El implementador propone sus actualizaciones mediante el relevo.

Si dos tareas necesitan el mismo archivo, se ejecutan en serie.
No se resuelve la colisión sobrescribiendo el trabajo de otro agente.
Antes de consolidar se compara el estado actual con el recibido al iniciar.

## 9. Paralelismo seguro

Se pueden analizar de forma independiente requisitos o documentación pública.
Se pueden implementar backend y frontend si el contrato ya está acordado
y sus archivos, configuraciones y puertos no se pisan.
Una tarea dependiente espera a que se acepte su entrada.

Nunca se paralelizan cambios a una misma migración, lockfile o índice.
Las pruebas que comparten base de datos necesitan aislamiento explícito.
Más agentes no garantizan terminar antes ni consumir menos.
Se usa solo el paralelismo que tenga una separación clara.

## 10. Paquete de entrada

Se usa el formato de [relevo](plantillas/relevo.md).
Debe incluir autorización, objetivo, alcance, requisitos y fuentes.
Se indican archivos de lectura, escritura, prohibiciones y dependencias.
También criterios de aceptación, comprobaciones y condiciones de parada.

Un agente devuelve el encargo si falta un dato necesario para ejecutarlo.
No completa reglas de negocio mediante suposiciones.

## 11. Paquete de salida

Describe trabajo realizado y archivos afectados.
Incluye comprobaciones ejecutadas, comandos, entorno y resultados observados.
Relaciona cada criterio con su evidencia.
Declara fallos, pendientes, riesgos y siguiente paso.

El coordinador comprueba que la evidencia corresponde al contenido entregado.
Registra la ejecución real en el [CSV](../trazabilidad/ejecuciones-agentes.csv).
El registro no inventará métricas ni marcará tareas por intención.

## 12. Revisión y correcciones

El revisor recibe la misma especificación y la versión de archivos entregada.
Los hallazgos vuelven al implementador con criterios concretos.
El implementador corrige y ejecuta las comprobaciones afectadas.
Después se revisa el resultado corregido.

Tras dos correcciones fallidas del mismo problema se detiene esa tarea.
Se informa qué se intentó, qué ocurrió y qué decisión hace falta.
No se reinicia el contador cambiando de agente o de nombre de tarea.
El coordinador conserva ese contador en el relevo del problema.

## 13. Consolidación

Se comprueban dependencias y contratos entre los resultados parciales.
Se ejecuta la validación conjunta que corresponda.
Se revisan enlaces, documentación, archivos inesperados y posibles secretos.
Una tarea aislada correcta no garantiza que el conjunto funcione.

Se actualiza MEMORY y se entrega el estado real.
Ningún agente ejecuta Git: tampoco staging, ramas, commits, push o PR.
El manifiesto de commits es una propuesta de agrupación para la persona responsable.

## 14. Condiciones de parada

Falta de aprobación, cambio de requisito o contradicción relevante.
Permisos insuficientes, secretos necesarios o entorno que impide verificar.
Riesgo de seguridad que no puede corregirse dentro del alcance.
Dos correcciones fallidas del mismo problema.
Tiempo máximo alcanzado o trabajo autorizado terminado.

Se conserva el trabajo útil y se entrega un informe preciso.
No se debilitan controles para evitar la parada.

## 15. Sesión nocturna

El [prompt nocturno](prompts/sesion-nocturna-01.md) está aprobado para lanzamiento
humano tras superar las comprobaciones bloqueantes del preflight.
Esa sesión tiene un máximo de diez horas y termina antes si completa el encargo.
Se registra hora de inicio observada y se comprueba periódicamente el límite.
Activar goals no inicia la sesión ni elimina sus límites.

Solo ejecutará 001 aprobado y preparará borradores de especificaciones futuras.
No aprobará esos borradores ni creará sus planes o tareas.
No hará Git, despliegue ni cambios de alcance.
Entregará evidencia real, pendientes y agrupación sugerida de commits.

## 16. Fallback agéntico

Se intenta el primer nivel disponible y se registra el nivel realmente utilizado.
La visibilidad de un rol no prueba que pueda iniciarse ni sus permisos efectivos.
Una capacidad no disponible activa el siguiente nivel; un defecto de requisitos,
seguridad o una comprobación bloqueante fallida conserva su condición de parada.

### Nivel 1 — roles personalizados

Se utilizan `planificador`, `implementador` y `revisor`.
El preflight prueba delegación de análisis y revisión sin escritura.
El implementador se comprueba después dentro de una tarea aprobada, con archivos
asignados y escritura limitada al workspace. Se registran los permisos efectivos
de cada rol antes de confiarle la operación correspondiente.

### Nivel 2 — agentes incorporados

Si un rol personalizado no puede iniciarse, se utiliza:

- `explorer` para análisis de solo lectura;
- `worker` para implementación de la tarea y los archivos asignados;
- otro `explorer` o una ejecución posterior de solo lectura para revisión.

Se aplican los mismos límites y se comprueban sus permisos efectivos.
El nombre del agente no demuestra aislamiento ni sustituye esa comprobación.
La revisión solo se declara independiente si la realiza otro agente o revisor.

### Nivel 3 — ejecución secuencial

Si no pueden crearse subagentes:

1. La sesión principal analiza sin escribir.
2. Registra su plan, dentro del alcance ya aprobado.
3. Implementa únicamente la tarea aprobada.
4. Ejecuta las comprobaciones exigidas.
5. Realiza una revisión separada, sin reparar durante esa revisión.
6. Declara que no fue una revisión independiente si la hizo la misma sesión.

Los hallazgos vuelven a una etapa de implementación antes de repetir la revisión.
La persona responsable conserva la aceptación final y conoce esta limitación.

### Reglas comunes a los tres niveles

No se reducen requisitos ni se eliminan pruebas.
Hay un único escritor por archivo y ningún agente ejecuta Git.
Se mantienen separadas planificación, implementación y revisión.
El registro de ejecución identifica nivel, motivo del fallback, sandbox,
política de aprobación, red y permisos realmente observados.
La ausencia de agentes personalizados, MCP documental o invocación nativa de una
skill no bloquea por sí sola 001 si pasan todas las comprobaciones bloqueantes.
Si falta la invocación nativa, se lee y aplica el procedimiento aprobado de la
skill y se declara esa limitación; no se registra como invocación explícita superada.
