# Índice de documentación

**Estado del documento:** Aprobado

Este índice recoge archivos existentes y distingue su estado de aprobación.
Un documento aprobado no demuestra una implementación ni una prueba ejecutada.
G02-B, P2, el paquete 001 y DT-01 a DT-08 recibieron aprobación humana expresa
el 2026-10-13. AG-004 superó el preflight y se bloqueó correctamente en T001.
AG-005 se detuvo ante gensync bajo la regla anterior. AG-006 aplicó ADR-0002
e implementó la base local; el control de formato Maven bloquea su aceptación
completa. CI remota pendiente. Las evidencias históricas permanecen conservadas.

## Orientación y reglas

| Documento | Responsabilidad | Estado |
|---|---|---|
| [Presentación](../README.md) | Producto, tecnologías y estado real. | Aprobada como presentación inicial. |
| [Mapa](mapa-del-proyecto.md) | Fases definitivas P0–P6 y siguiente paso. | Aprobado. |
| [AGENTS](../AGENTS.md) | Reglas breves para trabajar con agentes. | Vigente; P2 aprobado documentalmente. |
| [MEMORY](../MEMORY.md) | Estado breve, límites y siguiente acción. | Registro de hechos de la sesión. |
| [Visión y alcance](vision-y-alcance.md) | Actores, capacidades y exclusiones. | Aprobada como alcance funcional inicial. |
| [Constitución](constitucion.md) | Principios innegociables. | Vigente. |
| [Seguridad](seguridad.md) | Controles exigidos al producto. | Aprobada. |
| [Calidad](politicas/calidad.md) | Estados, puertas, pruebas y evidencias. | Aprobada. |
| [Documentación](politicas/documentacion.md) | Escritura, mantenimiento y fuentes. | Aprobada. |

## Riesgos y trazabilidad

| Documento | Responsabilidad | Estado |
|---|---|---|
| [Modelo de amenazas](seguridad/modelo-de-amenazas.md) | Activos, STRIDE, AM y amenazas condicionadas AC. | Aprobada. |
| [Cobertura OWASP](seguridad/cobertura-owasp.md) | Categorías 2025, amenazas y controles previstos. | Aprobada; controles pendientes. |
| [Cambios](trazabilidad/cambios.md) | SEG-001 a SEG-028, CAM-001 cerrado y CAM-002 aprobado. | Aprobada. |
| [Ejecuciones de agentes](trazabilidad/ejecuciones-agentes.csv) | Tareas y comprobaciones realmente realizadas. | Registro factual; revisión humana pendiente. |
| [Informe AG-006](trazabilidad/AG-006-informe.md) | Resultados, manifiesto y pendientes. | Base local operativa; formato bloqueado y CI remota pendiente. |
| [Memoria hasta AG-005](trazabilidad/memoria-hasta-ag005.md) | Copia íntegra del MEMORY anterior. | Historia preservada, no estado vigente. |

## G02-B: documentación operativa de P1

| Documento | Responsabilidad | Estado |
|---|---|---|
| [Contribuir](../CONTRIBUTING.md) | Propuesta, pruebas, revisión y Git humano. | Aprobado. |
| [Comunicar vulnerabilidades](../SECURITY.md) | Canal privado y seguimiento de avisos. | Aprobado. |
| [Fuentes públicas](fuentes.md) | Referencias consultadas, finalidad y fecha. | Aprobado. |

## P2: metodología

Todos los documentos de esta tabla están aprobados documentalmente.
AG-004 confirmó búsqueda y lectura MCP. Los roles iniciados recibieron
workspace-write, sin aislamiento de solo lectura; se aplicó el nivel 3.
Las skills se aplicaron manualmente al no existir invocación nativa disponible.

| Documento | Responsabilidad |
|---|---|
| [SDD](metodologia/sdd.md) | Etapas, aprobaciones, cambios y relación con Git. |
| [Contexto](metodologia/contexto.md) | Qué leer, fuentes principales, memoria y contradicciones. |
| [Orquestación](metodologia/orquestacion.md) | Roles, permisos, escritura, revisión y parada. |
| [Eficiencia](metodologia/eficiencia-agentes.md) | Evitar trabajo repetido sin reducir requisitos ni QA. |
| [MCP y diagnóstico](metodologia/mcp.md) | Servidor oficial, comprobaciones reales y limitaciones. |
| [Relevo](metodologia/plantillas/relevo.md) | Formatos de entrada y salida entre agentes. |
| [Prompts operativos](metodologia/prompts/README.md) | Conservación, aprobación y relación con evidencias. |

## P2: configuración y skills

Configuración, roles y cuatro skills aprobados documentalmente.
El [diagnóstico](metodologia/mcp.md) conserva el estado anterior; los resultados
de reanudación y permisos efectivos están en AG-004 y su informe de versiones.
En AG-006 la sesión principal realizó implementación y revisión secuenciales;
la revisión no es independiente. No se probaron nuevamente capacidades opcionales.

| Archivo | Función |
|---|---|
| [Configuración Codex](../.codex/config.toml) | Agentes, goals, máximo de tres subagentes y MCP oficial. |
| [Planificador](../.codex/agents/planificador.toml) | Analizar y proponer en solo lectura. |
| [Implementador](../.codex/agents/implementador.toml) | Ejecutar tareas aprobadas dentro del workspace. |
| [Revisor](../.codex/agents/revisor.toml) | Revisar sin reparar ni aprobar por la persona responsable. |
| [Skill SDD](../.agents/skills/sdd/SKILL.md) | Comprobar el paso entre etapas. |
| [Skill de seguridad](../.agents/skills/revision-seguridad/SKILL.md) | Revisar controles y evidencias. |
| [Skill de QA](../.agents/skills/verificacion-qa/SKILL.md) | Verificar criterios y registrar resultados. |
| [Skill documental](../.agents/skills/mantenimiento-documental/SKILL.md) | Mantener fuentes, estados y enlaces coherentes. |

## Preparación de P3

| Documento | Responsabilidad | Estado |
|---|---|---|
| [Índice SDD](../especificaciones/README.md) | Incrementos existentes y previstos. | Aprobado. |
| [001: especificación](../especificaciones/001-base-verificable/especificacion.md) | Qué debe cumplir la base verificable. | Aprobada. |
| [001: plan](../especificaciones/001-base-verificable/plan.md) | Cómo construirla y fijar versiones. | Aprobado; DT-01 a DT-08 aprobadas. |
| [001: tareas](../especificaciones/001-base-verificable/tareas.md) | Orden, dependencias y evidencias. | T001–T005 implementadas y comprobadas con límites; T006/formato bloqueado. |
| [Versiones](documentaciondev/versiones.md) | Selección exacta vigente, fuentes e historia AG-004/005/006. | Registro factual; revisión humana pendiente. |
| [001: validación](../especificaciones/001-base-verificable/validacion.md) | Matriz BV, pruebas, fallos y límites de aceptación. | Base local implementada; verificación integral pendiente por formato y CI remota. |
| [ADR-0001: Rolldown transitivo](decisiones/ADR-0001-dependencia-transitiva-rolldown-angular-21.md) | Excepción exacta para la cadena oficial Angular 21.2.26, controles y parada. | Aprobado por decisión humana del 2026-10-13. |
| [ADR-0002: transitivas](decisiones/ADR-0002-politica-dependencias-transitivas.md) | Política general de evaluación y continuidad. | Aprobado expresamente para AG-006. |
| [Entorno](documentaciondev/entorno.md) | Construcción, pruebas, arranque, parada y errores reales. | Comprobado con límites declarados; revisión humana pendiente. |
| [Arquitectura](documentaciondev/arquitectura.md) | Responsabilidades, contrato, permisos y topología existentes. | Implementación descrita; revisión humana pendiente. |
| [Sesión nocturna 01](metodologia/prompts/sesion-nocturna-01.md) | Encargo limitado a 001 y borradores posteriores. | Aprobado para lanzamiento humano tras preflight bloqueante, con fallback. |

AG-006 tiene ventana nueva de 10:16:08 a 20:16:08 +02:00 del 2026-10-13.
Conserva AG-003, AG-004 y AG-005 en el registro y las evidencias anteriores.
Hay backend, frontend, migraciones, Compose, pruebas y workflow preparados.
No se ha ejecutado Git ni se ha publicado o aceptado la base completa.

## Uso

Para conocer el producto, lee presentación y visión.
Para retomar trabajo, consulta MEMORY y las fuentes de la tarea.
Para aprobar el siguiente paso, revisa el mapa, los pendientes y sus evidencias.
