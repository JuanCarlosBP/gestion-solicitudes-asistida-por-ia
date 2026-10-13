# Contexto mínimo suficiente

**Estado:** Aprobado

## Qué necesitamos para trabajar

El contexto es la información necesaria para entender una tarea y sus límites.
Debe bastar para tomar decisiones correctas sin cargar archivos ajenos al trabajo.
Leer menos no permite perder requisitos o ignorar políticas aplicables.

Al comenzar se leen [AGENTS.md](../../AGENTS.md) y [MEMORY.md](../../MEMORY.md).
Se identifica el objetivo, la autorización y el resultado esperado.
Después se abren las fuentes necesarias y los archivos que podrían cambiar.

## Matriz de lectura

| Tipo de tarea | Lectura necesaria |
|---|---|
| Retomar trabajo | AGENTS, MEMORY y referencias de la tarea activa. |
| Definir alcance | Visión, constitución y especificación afectada. |
| Planificar | Especificación aprobada, políticas aplicables y decisiones técnicas relacionadas. |
| Implementar | Especificación, plan y tareas aprobados; código y contratos afectados. |
| Cambiar seguridad | Política de seguridad, amenazas, OWASP y requisitos relacionados. |
| Verificar calidad | Política de calidad, criterios, cambios y evidencias de la versión. |
| Mantener documentos | Política documental, fuente principal y resúmenes o enlaces afectados. |
| Coordinar agentes | Orquestación, tareas, límites de escritura y paquetes de relevo. |
| Consultar Codex/OpenAI | MCP oficial y documentación de la versión aplicable. |

La matriz señala responsabilidades; los enlaces principales están en el
[índice documental](../README.md).
No obliga a abrir todas las filas en cada tarea.

## Fuente principal de cada información

La [visión](../vision-y-alcance.md) define qué producto se construirá.
La [constitución](../constitucion.md) contiene los principios innegociables.
[Seguridad](../seguridad.md) define controles y límites.
[Calidad](../politicas/calidad.md) define aceptación, pruebas y evidencias.
[Documentación](../politicas/documentacion.md) define cómo mantener los documentos.

La especificación es la fuente del comportamiento de su incremento.
El plan contiene la solución técnica propuesta o aprobada.
Las tareas concretan el trabajo autorizado y sus dependencias.
La validación conserva resultados de comprobaciones realmente ejecutadas.
Git conserva versiones, sin sustituir ninguna de estas fuentes.

## Selección de archivos

Empieza por las referencias de la tarea y los símbolos o rutas que afecta.
Amplía la lectura cuando una dependencia pueda cambiar el comportamiento.
Revisa también a quien llama y a quien consume un contrato modificado.
Si una búsqueda no basta, lee el archivo completo relevante.

No cargues todos los Markdown, skills ni registros por defecto.
Una petición expresa de auditoría completa sí puede requerir leerlos todos.
No releas un archivo sin cambios cuando su contenido sigue disponible.
Si hubo edición concurrente, comprueba la versión antes de confiar en esa lectura.

## Requisitos completos

Una síntesis ayuda a orientarse, pero no sustituye los requisitos originales.
Conserva los IDs y enlaces para consultar errores, límites y condiciones.
No elimines un criterio del relevo porque parezca poco frecuente.
Indica cuáles se han revisado y cuáles siguen pendientes.

Antes de escribir se comprueban las autorizaciones de especificación y plan.
Una conversación técnica no equivale automáticamente a una aprobación.
Si no hay evidencia de autorización, se pide la decisión que falta.

## Memoria breve

MEMORY se consulta al inicio y cuando se retoma después de una interrupción.
Se actualiza al cerrar una tarea, decisión, fase o bloqueo relevante.
Mantendrá aproximadamente 50 líneas.
Conservará estado, decisiones vigentes, limitaciones y siguiente acción.

No será un diario completo ni copiará salidas de herramientas.
Las decisiones permanentes irán a su documento principal.
Los resultados de pruebas irán a validación o a su evidencia.
Nunca guardará secretos ni datos privados.

## Relevo o handoff

Un relevo permite que otro agente continúe sin reconstruir toda la conversación.
Usa la [plantilla de relevo](plantillas/relevo.md).
Incluye objetivo, alcance, fuentes exactas y archivos autorizados.
Adjunta requisitos, criterios de aceptación, comprobaciones y parada.

La salida distingue trabajo terminado, resultados y pendientes.
Declara qué archivos cambió y cuáles solo leyó.
Si el contexto se compacta, conserva el objetivo original y las correcciones humanas.
La última pregunta de estado no cancela por sí sola la tarea activa.

## Evitar contradicciones

Compara los resúmenes con su fuente principal antes de cambiar un estado.
Si discrepan, señala ambos lugares y el efecto concreto.
No elijas en silencio la interpretación más cómoda.
Detén la parte afectada y pide una decisión cuando no pueda resolverse con evidencia.

Una decisión humana explícita puede corregir un documento anterior.
Regístrala en el lugar que corresponde y actualiza los resúmenes afectados.
No presentes la propuesta de un agente como decisión humana.

## Cierre de contexto

Entrega una lista breve de cambios, comprobaciones, resultados y pendientes.
Relaciona las evidencias con los archivos efectivamente revisados.
No añadas cifras de tokens o tiempos que la herramienta no haya mostrado.
Actualiza MEMORY si cambió el estado relevante.
La siguiente sesión debe poder continuar desde fuentes duraderas y verificables.
