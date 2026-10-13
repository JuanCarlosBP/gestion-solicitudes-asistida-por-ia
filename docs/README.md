# Índice de documentación

**Estado del documento:** Aprobado

Este índice recoge archivos existentes y distingue su estado de aprobación.
Un documento aprobado no demuestra una implementación ni una prueba ejecutada.
G02-B, P2, el paquete 001 y DT-01 a DT-08 recibieron aprobación humana expresa
el 2026-10-13. AG-004 superó el preflight y se bloqueó correctamente en T001.
AG-005 se detuvo ante gensync bajo la regla anterior. AG-006 aplicó ADR-0002
e implementó la base local. AG-008 completó Spotless y verify localmente.
La rama y PR borrador #1 se publicaron por intervención humana; la primera CI
pasó frontend y falló en setup-java y la copia de public del frontend Docker.
REV-001 registró R-01 a R-04; AG-009 aplica las correcciones y repite QA local.
La segunda CI espera el siguiente push humano. 001 no está aceptada ni integrada.
Las evidencias históricas permanecen conservadas.

AG-010 implementa 002 por autorización humana integral. Pasan 55 pruebas backend,
56 Angular, 8 E2E, Docker/Compose y auditorías. La revisión independiente no
encontró nuevos bloqueantes; cierre en el [informe AG-010](trazabilidad/AG-010-informe.md).

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
| [Informe AG-006](trazabilidad/AG-006-informe.md) | Resultados históricos y manifiesto. | Historia preservada; no describe el estado vigente. |
| [REV-001](trazabilidad/REV-001-revision-independiente-01.md) | Primera revisión independiente, R-01 a R-04. | Correcciones requeridas; informe original conservado. |
| [Informe AG-009](trazabilidad/AG-009-informe.md) | Respuesta a REV-001, primera CI, QA y manifiesto de commits. | Correcciones locales; segunda CI y aceptación pendientes. |
| [Informe AG-010](trazabilidad/AG-010-informe.md) | Identidad y acceso, resultados propios, incidencias y manifiesto. | QA local superada; aceptación e integración pendientes. |
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
| [001: tareas](../especificaciones/001-base-verificable/tareas.md) | Orden, dependencias y evidencias. | Plan de tareas conservado; estado de ejecución actualizado en validación. |
| [Versiones](documentaciondev/versiones.md) | Selección exacta vigente, fuentes e historia AG-004/005/006. | Registro factual; revisión humana pendiente. |
| [001: validación](../especificaciones/001-base-verificable/validacion.md) | Matriz BV, pruebas, fallos y límites de aceptación. | QA local superada; segunda CI remota y aceptación pendientes. |
| [ADR-0001: Rolldown transitivo](decisiones/ADR-0001-dependencia-transitiva-rolldown-angular-21.md) | Excepción exacta para la cadena oficial Angular 21.2.26, controles y parada. | Aprobado por decisión humana del 2026-10-13. |
| [ADR-0002: transitivas](decisiones/ADR-0002-politica-dependencias-transitivas.md) | Política general de evaluación y continuidad. | Aprobado expresamente para AG-006. |
| [002: especificación](../especificaciones/002-identidad-acceso/especificacion.md) | IA-01–IA-14 y alcance de identidad. | Aprobada por decisión humana AG-010. |
| [002: plan](../especificaciones/002-identidad-acceso/plan.md) | JWT, sesiones, CSRF, contrato y verificación. | Aprobado por decisión humana AG-010. |
| [002: tareas](../especificaciones/002-identidad-acceso/tareas.md) | Trabajo, dependencia y escritor por archivo. | Aprobadas por decisión humana AG-010. |
| [002: validación](../especificaciones/002-identidad-acceso/validacion.md) | Resultados ejecutados y pendientes IA. | QA local superada; cierre de revisión en informe. |
| [ADR-0003: identidad](decisiones/ADR-0003-identidad-jwt-y-sesiones.md) | Decisión JWT RS256, refresh, PostgreSQL y cookies. | Aprobado por decisión humana AG-010. |
| [003: especificación](../especificaciones/003-proveedores/especificacion.md) | Propuestas de catálogo de proveedores y preguntas abiertas. | Borrador pendiente de aprobación humana; no implementado. |
| [Entorno](documentaciondev/entorno.md) | Construcción, pruebas, arranque, parada y errores reales. | Comprobado con límites declarados; revisión humana pendiente. |
| [Arquitectura](documentaciondev/arquitectura.md) | Responsabilidades, contrato, permisos y topología existentes. | Implementación descrita; revisión humana pendiente. |
| [API y rutas](documentaciondev/api-y-rutas.md) | Contratos 001/002, errores, CSRF y navegación. | Verificados localmente en AG-010. |
| [Datos de identidad](documentaciondev/modelo-de-datos.md) | V2, tablas, restricciones y transacciones. | Verificados con PostgreSQL real en AG-010. |
| [Seguridad técnica](documentaciondev/seguridad.md) | Argon2, claves, JWT, refresh, cookies y riesgos restantes. | Controles acotados verificados en AG-010. |
| [Sesión nocturna 01](metodologia/prompts/sesion-nocturna-01.md) | Encargo limitado a 001 y borradores posteriores. | Aprobado para lanzamiento humano tras preflight bloqueante, con fallback. |

Los informes y evidencias AG-003–AG-008 conservan sus resultados y fechas.
Hay backend, frontend, migraciones, Compose, pruebas y workflow preparados.
Los runs iniciales 38388926539 y 38389011007 fueron ejecutados y fallaron;
su estado procede del encargo humano. AG-009 no ejecuta Git ni integra la PR.

## Uso

Para conocer el producto, lee presentación y visión.
Para retomar trabajo, consulta MEMORY y las fuentes de la tarea.
Para aprobar el siguiente paso, revisa el mapa, los pendientes y sus evidencias.
