# Sesión nocturna 01 — Base verificable

**Estado:** Aprobado para lanzamiento humano tras superar las
comprobaciones bloqueantes del preflight.

## Condición de uso

P2, la especificación, el plan, las tareas de 001, DT-01 a DT-08 y este encargo
recibieron aprobación humana expresa el 2026-10-13.
Prepararlo o aprobarlo no inicia automáticamente una sesión.
La persona responsable debe indicar que comiences después de la revisión Git,
los dos commits/pushes humanos y la comprobación del remoto.
El lanzamiento comienza por el preflight; T001 requiere superar su grupo bloqueante.

## Encargo

Trabaja exclusivamente en el repositorio Gestión de Solicitudes indicado por la persona responsable.
Confirma que el directorio es `C:\Users\carli\gestion-solicitudes-asistida-por-ia`.
Crea la base técnica definida en 001 y compruébala con evidencia real.
No implementes dominios funcionales posteriores.

Lee [AGENTS](../../../AGENTS.md), [MEMORY](../../../MEMORY.md),
[contexto](../contexto.md), [orquestación](../orquestacion.md)
y los tres documentos de 001:
[especificación](../../../especificaciones/001-base-verificable/especificacion.md),
[plan](../../../especificaciones/001-base-verificable/plan.md) y
[tareas](../../../especificaciones/001-base-verificable/tareas.md).
Consulta seguridad, calidad y documentación según sus referencias.
Comprueba que no quedan dudas o aprobaciones necesarias para el trabajo afectado.

## Preflight

### A. Comprobaciones bloqueantes

Antes de modificar archivos, comprobar y conservar los resultados en la sesión:

1. Confirmar la ruta exacta: `C:\Users\carli\gestion-solicitudes-asistida-por-ia`.
2. Leer AGENTS, MEMORY y la especificación, el plan y las tareas de 001.
3. Confirmar que especificación, plan y tareas están aprobados.
4. Confirmar escritura limitada al workspace para el trabajo autorizado.
5. Comprobar disponibilidad y versiones de Java, javac, Node, npm, Docker
   y Docker Compose, contrastadas con el plan aprobado.
6. Comprobar que Docker daemon responde.
7. Comprobar espacio suficiente en disco para dependencias, imágenes y builds;
   registrar espacio libre, estimación de necesidad y motivo de suficiencia.
8. Comprobar acceso a las dependencias oficiales necesarias.
9. Confirmar que no se necesita ningún secreto real; se usarán datos ficticios
   y configuración local de prueba sin incorporar credenciales reales.
10. Confirmar que no había cambios de aplicación previos al preflight mediante
    inventario y huellas de archivos, sin Git, contrastados con el estado sin
    aplicación de MEMORY. Archivos de aplicación inesperados impiden confirmarlo.

Registrar resultado y evidencia de cada punto; no sustituir una comprobación
por el valor previsto. Si una comprobación bloqueante falla, no comenzar T001
ni generar código. Entregar diagnóstico, registrar el bloqueo en MEMORY y el
CSV de ejecuciones como única escritura de cierre y detenerse.

### B. Comprobaciones del arnés no bloqueantes

Tras superar A, probar en este orden, sin generar código de aplicación:

1. Pedir al coordinador que delegue al `planificador` la lectura de 001 y la
   devolución de BV-01 a BV-10 y DT-01 a DT-08, sin escritura.
2. Invocar expresamente `$sdd` para comprobar el paso hacia implementación.
3. Pedir al coordinador que delegue al `revisor` el contraste de especificación,
   plan y tareas: requisitos sin tarea, tareas sin requisito y contradicciones,
   sin escritura.
4. Invocar `$mantenimiento-documental` para identificar los documentos que
   deberá actualizar T007.
5. Confirmar si `openaiDeveloperDocs` continúa disponible.

Registrar cada elemento como `PASS`, `NO DISPONIBLE` o `FALLÓ`, con el motivo
real y su evidencia. La visibilidad o lectura manual no equivale a una invocación
explícita superada. Comprobar y registrar los permisos efectivos de los roles
iniciados; el implementador se probará dentro de su primera tarea autorizada,
con archivos asignados y antes de confiarle una escritura.

Si una capacidad del arnés no está disponible, aplicar el
[fallback aprobado](../orquestacion.md#16-fallback-agéntico), registrar la limitación
y continuar si todas las comprobaciones bloqueantes pasan.
La ausencia de MCP, custom agents o invocación nativa de una skill no bloquea
por sí sola la implementación de 001. Se conserva el procedimiento aprobado
mediante lectura manual cuando falte la invocación nativa de una skill.
Un hallazgo real de requisitos, permisos o seguridad mantiene su condición de
parada aunque lo detecte una comprobación del grupo B.

Registrar también sandbox efectivo, política de aprobación efectiva,
nivel agéntico utilizado y red disponible o restringida.
El valor predeterminado `on-request` del proyecto no sustituye la política
realmente aplicada por la interfaz, incluida la revisión automática observada.
`/debug-config` no ejecutado y los avisos de temporales son no bloqueantes,
salvo que estos últimos impidan una operación necesaria.
Si el MCP documental falla, se pueden usar otras fuentes oficiales accesibles;
un fallo posterior a fijar versiones con esas fuentes no bloquea por sí solo 001.

## Tiempo y límites

Registra la hora real de inicio y un límite máximo de diez horas.
Revisa el tiempo al cerrar cada tarea y antes de iniciar una operación larga.
No inicies trabajo que impida entregar el estado antes de ese límite.
Detente antes si completas todo el encargo.
No programes otra ejecución ni continúes fuera de la ventana autorizada.

Ningún agente ejecutará Git: ni consultas, staging, commit, push, ramas o PR.
No se realizará despliegue público.
No se modificarán archivos fuera del workspace ni herramientas globales.
Las descargas de dependencias aprobadas necesitan red y permisos disponibles;
si falta autorización o acceso, detén la parte afectada.
No solicites credenciales reales para incorporarlas al repositorio.

## Organización

Actúa como coordinador en la sesión principal.
Usa planificador, implementador y revisor conforme a sus roles configurados
o aplica el nivel de fallback disponible y regístralo.
No superes tres subagentes concurrentes.
Comprueba los permisos configurados antes de delegar y registra los efectivos
al iniciar cada rol, antes de confiarle operaciones del proyecto.

El planificador analiza requisitos y versiones en solo lectura.
El implementador recibe tareas aprobadas y archivos de escritura concretos.
El revisor comprueba requisitos, diferencias y evidencias sin reparar.
Si revisa la misma sesión, realiza una etapa separada y declara que no fue independiente.
Reserva MEMORY, índice, registro y consolidación para un único escritor.
Paraleliza únicamente archivos y recursos independientes.

## Trabajo de 001

Sigue T001 a T008 y sus dependencias.
Antes de generar código, fija versiones y comprueba el entorno.
Crea backend Java 21/Spring/Maven Wrapper y frontend Angular/TypeScript.
Incluye PostgreSQL real, migraciones, Compose, API técnica,
OpenAPI, Swagger UI, salud, pantalla inicial y rutas directas.

Ejecuta builds y pruebas unitarias, integración PostgreSQL, HTTP y frontend.
Comprueba tipos, formato/lint, análisis estático y dependencias aplicables.
Crea la CI inicial y valida localmente su configuración y comandos.
No presentes como ejecutada una CI remota que requiere el push humano posterior.

Actualiza documentación del entorno y los pasos realmente comprobados.
Crea `especificaciones/001-base-verificable/validacion.md`
solo cuando haya resultados reales que registrar.
Relaciona BV-01 a BV-10 con comprobaciones, comandos, entorno y evidencia.
Marca fallido, pendiente o no aplicable con su motivo cuando corresponda.

## Borradores posteriores

Después del trabajo de 001, y si queda tiempo y no hay bloqueos que impidan
redactar con información suficiente, prepara únicamente `especificacion.md` en:

- `especificaciones/002-identidad-y-acceso/`;
- `especificaciones/003-proveedores/`;
- `especificaciones/004-solicitudes-conceptos-importes/`;
- `especificaciones/005-aprobaciones/`;
- `especificaciones/006-concurrencia-idempotencia/`;
- `especificaciones/007-historial-auditoria/`;
- `especificaciones/008-demo-y-operacion/`.

Todos serán borradores pendientes de aprobación humana.
Usa la visión, las políticas y las decisiones conocidas.
Registra preguntas abiertas sin inventar reglas de negocio.
No crees planes, tareas, validaciones ni implementaciones de 002–008.
Actualiza el índice solo con los archivos realmente creados.

## Tratamiento de fallos

No ocultes errores ni sustituyas una prueba real por una afirmación.
Registra intentos y correcciones.
Tras dos correcciones fallidas del mismo problema, detén esa tarea y escala.
No cambies requisitos, pruebas o controles para obtener un resultado favorable.
Si falta una aprobación, permiso o herramienta necesaria, conserva el trabajo y
explica el bloqueo. Las capacidades opcionales del arnés siguen el fallback del
grupo B; no se confunden con los recursos bloqueantes del grupo A.

## Entrega final

Entrega archivos creados y modificados y el estado de cada tarea.
Indica comprobaciones ejecutadas, resultados, evidencia y pendientes.
Separa base implementada, validada localmente y pendiente de aceptación/remoto.
Incluye riesgos y decisiones que necesita la persona responsable.

Registra la ejecución real en el CSV y actualiza MEMORY.
Entrega un manifiesto de commits sugeridos, agrupado por archivos y propósito.
Separa base técnica, pruebas/CI, documentación y borradores cuando sea útil.
Explica dependencias entre grupos para no crear versiones incoherentes.
No realices ninguna de esas operaciones Git.
Detente y espera revisión humana.
