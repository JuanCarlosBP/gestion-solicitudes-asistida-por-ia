# Índice de documentación

**Estado del documento:** Aprobado

Este índice recoge archivos existentes y distingue su estado de aprobación.
Un documento aprobado no demuestra una implementación ni una prueba ejecutada.
G02-B, P2, el paquete 001 y DT-01 a DT-08 recibieron aprobación humana expresa
el 2026-10-13. P1 está preparado para cierre Git humano; 001 espera lanzamiento.

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

## G02-B: documentación operativa de P1

| Documento | Responsabilidad | Estado |
|---|---|---|
| [Contribuir](../CONTRIBUTING.md) | Propuesta, pruebas, revisión y Git humano. | Aprobado. |
| [Comunicar vulnerabilidades](../SECURITY.md) | Canal privado y seguimiento de avisos. | Aprobado. |
| [Fuentes públicas](fuentes.md) | Referencias consultadas, finalidad y fecha. | Aprobado. |

## P2: metodología

Todos los documentos de esta tabla están aprobados documentalmente.
MCP está comprobado; la delegación, los permisos de roles y la invocación explícita
de skills siguen pendientes del preflight nocturno.

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

Configuración, roles y cuatro skills aprobados y descubiertos en la sesión.
Su visibilidad no demuestra delegación, permisos efectivos ni invocación explícita.
El [diagnóstico](metodologia/mcp.md) distingue las comprobaciones realizadas de las pendientes.

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
| [001: tareas](../especificaciones/001-base-verificable/tareas.md) | Orden, dependencias y evidencias. | Documento aprobado; ejecución pendiente. |
| [Sesión nocturna 01](metodologia/prompts/sesion-nocturna-01.md) | Encargo limitado a 001 y borradores posteriores. | Aprobado para lanzamiento humano tras preflight bloqueante, con fallback. |

No existe todavía validación de 001, código funcional nuevo, pruebas de aplicación ni CI.
La sesión nocturna no está iniciada ni programada.
Esta consolidación no ejecutó Git. La siguiente acción es la revisión Git,
los dos commits/pushes humanos y el lanzamiento de la sesión con su preflight.

## Uso

Para conocer el producto, lee presentación y visión.
Para retomar trabajo, consulta MEMORY y las fuentes de la tarea.
Para aprobar el siguiente paso, revisa el mapa, los pendientes y sus evidencias.
