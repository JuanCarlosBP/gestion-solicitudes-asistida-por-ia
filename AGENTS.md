# AGENTS.md — Gestión de Solicitudes

Aplicación empresarial para gestionar proveedores, solicitudes, conceptos, importes, aprobaciones, permisos, concurrencia e historial.

## Stack
- Frontend: HTML, CSS, JavaScript, Angular y TypeScript.
- Backend: Java 21, Spring y PostgreSQL.
- Infraestructura: Docker. API REST documentada con OpenAPI y Swagger UI.
- Contenido propio en español, salvo nombres exigidos por estándares o herramientas.

## Contexto y memoria
- Lee solo los archivos necesarios para la tarea actual.
- Cuando exista, consulta `MEMORY.md` al comenzar y actualízalo al cerrar una tarea, fase, decisión o bloqueo relevante.
- Mantén `MEMORY.md` breve (≈50 líneas), sin secretos ni historial que corresponda a Git o a documentación durable.
- Antes de implementar, consulta la especificación, el plan y las tareas activas; usa las políticas y skills aplicables.
- Cuando una tarea afecte a seguridad, consulta `docs/seguridad.md` mientras sea su ruta vigente.
- Selecciona las lecturas con [contexto](docs/metodologia/contexto.md); no cargues todos los `.md` ni todas las skills por defecto.
- Para preguntas sobre Codex/OpenAI consulta el MCP oficial descrito en [MCP](docs/metodologia/mcp.md); contrasta la versión y sus límites.
- No des por existente, aprobado, implementado o probado nada sin evidencia.
- Si falta información o hay contradicciones, detente y pregunta.

## SDD y desarrollo
- Flujo: Especificación → Clarificación → Plan → Tareas → Implementación → Validación → Cambio.
- No pases de especificación a plan ni de plan/tareas a implementación sin aprobación explícita.
- Implementa solo tareas autorizadas; no inventes requisitos, reglas de negocio ni amplíes el alcance.
- Si cambia un requisito, actualiza primero la especificación y después plan, tareas, código, pruebas y documentación.
- Para tareas no triviales, presenta primero el plan; una lectura o corrección simple no requiere planificación ceremonial.
- Arquitectura de referencia: monolito modular.
- Separa entrada HTTP, aplicación, dominio y persistencia; organiza Angular por funcionalidades.
- Prioriza código legible, modular, mantenible, con alta cohesión y bajo acoplamiento.
- Aplica SOLID y patrones cuando aporten valor; no introduzcas microservicios, capas o abstracciones innecesarias.
- Documenta contratos, restricciones y decisiones no evidentes; en Java usa Javadoc cuando aporte valor.

## Seguridad y calidad
- El backend es la autoridad final sobre autenticación, autorización, validación y operaciones protegidas.
- Nunca expongas secretos, credenciales, tokens ni datos sensibles; si detectas uno, indica su ubicación sin reproducirlo.
- Respeta las políticas de seguridad y calidad aplicables.
- No declares una tarea terminada sin comprobar sus criterios de aceptación.
- Ejecuta las pruebas pertinentes y distingue resultado esperado, observado, ejecutado y pendiente.
- No inventes pruebas, métricas, evidencias ni resultados.

## Agentes, Git y entrega
- Planificador: analiza y propone. Implementador: ejecuta tareas aprobadas. Revisor: valida sin reparar en la misma revisión. Coordinador: organiza sin aprobar por la persona responsable del proyecto.
- Coordina roles, relevos y un único escritor por archivo según [orquestación](docs/metodologia/orquestacion.md).
- Skills disponibles: [SDD](.agents/skills/sdd/SKILL.md), [seguridad](.agents/skills/revision-seguridad/SKILL.md), [QA](.agents/skills/verificacion-qa/SKILL.md) y [documentación](.agents/skills/mantenimiento-documental/SKILL.md); aplica solo las pertinentes.
- Tras dos correcciones fallidas del mismo problema, detente y solicita decisión humana.
- `add`, `commit`, `push`, ramas, PR, integración y despliegue los realiza la persona responsable del proyecto salvo autorización expresa.
- Al terminar informa: cambios, archivos afectados, comprobaciones ejecutadas, resultados, pendientes y siguiente paso.
- Actualiza `MEMORY.md` si cambió el estado, detente y espera autorización.

## Regla final
La IA ejecuta; la persona responsable del proyecto decide, comprende y aprueba. No sacrifiques requisitos, seguridad, calidad, trazabilidad o verificación para terminar antes. No declares éxito sin evidencia.
