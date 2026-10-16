# Mapa del proyecto — Gestión de Solicitudes

**Versión:** 1.0
**Estado:** Aprobado

## Para qué sirve este mapa

Gestión de Solicitudes será una aplicación empresarial para gestionar
proveedores, solicitudes, conceptos, importes, decisiones e historial.
Este mapa sitúa el estado actual y las fases definitivas de un único producto.
Los resultados previstos no se dan por implementados por aparecer aquí.

## Cómo trabajamos y quién decide

SDD spec-anchored mantiene la especificación como referencia del desarrollo.
Primero se define qué debe cumplirse; después se planifica y divide en tareas.
Un cambio de requisito se refleja primero en su especificación.

La persona responsable del proyecto decide y aprueba.
El coordinador organiza; el planificador propone; el implementador ejecuta
tareas aprobadas; el revisor comprueba sin corregir durante la revisión.
Las [reglas de agentes](../AGENTS.md) y la
[orquestación aprobada](metodologia/orquestacion.md) delimitan su actuación.
Git conserva versiones; no sustituye requisitos ni evidencias.
Todas sus operaciones quedan a cargo de la persona responsable.

## Fases definitivas

### P0 — Preservar trabajo y describir el producto

Define problema, actores, alcance, límites y estado inicial.
Conserva el trabajo útil y produce la visión y alcance del producto.

### P1 — Reglas, memoria y primer historial

Establece reglas, políticas, documentación básica y memoria breve.
Inicia la trazabilidad Git/GitHub y las instrucciones para contribuir
y comunicar problemas de seguridad.

### P2 — Metodología y arnés Codex

Define SDD, contexto, orquestación, permisos, límites y relevos.
El arnés es el conjunto de instrucciones y herramientas que organiza a Codex.
Incluye agentes, skills para procedimientos reutilizables y MCP
para consultar herramientas externas con permisos delimitados.
También define cómo verificar y registrar el trabajo de los agentes.

### P3 — Especificación inicial, arquitectura, versiones y base de QA/CI

Aprueba la especificación inicial y las decisiones técnicas necesarias.
Crea una base reproducible antes de construir funcionalidades completas.
QA significa aseguramiento de la calidad; CI automatiza comprobaciones.
El primer incremento es 001-base-verificable, aprobado para implementación
y pendiente de lanzamiento humano y preflight bloqueante.

### P4 — Funcionalidades por porciones completas

Construye cada funcionalidad de extremo a extremo.
Cada porción reúne datos, backend, API, Angular, seguridad, pruebas y documentos.
El orden detallado dependerá de las especificaciones aprobadas.

### P5 — Integración, concurrencia ampliada y pruebas transversales

Verifica el conjunto y las operaciones simultáneas.
Amplía la idempotencia: evitar repetir un efecto al repetirse una petición.
Incluye integración, seguridad, accesibilidad, recuperación y QA transversal.
No sustituye las comprobaciones que ya necesita cada incremento.

### P6 — Despliegue, manuales comprobados y entrega

Despliega una revisión validada y comprueba la demo desde Internet.
Completa los manuales con pasos realmente comprobados.
Cierra una entrega reproducible, con sus límites y evidencias.

## Estado histórico de preparación P2

| Referencia | Estado real |
|---|---|
| P0 | Completada. |
| P1 | G01 publicado; G02-A y G02-B aprobados; preparado para cierre Git humano. |
| P2 | Aprobado documentalmente; configuración reconocida, roles/skills visibles y MCP operativo. |
| P3 | Especificación, plan, tareas de 001 y DT-01 a DT-08 aprobados; ejecución pendiente de lanzamiento humano y preflight. |
| P4–P6 | Previstas; sin implementación. |

G02-A y G02-B son subdivisiones prácticas de G02 dentro de P1.
G02-A reúne presentación, índice, mapa y política documental, ya aprobados.
G02-B reúne contribución, comunicación de vulnerabilidades y fuentes.
G02-B está aprobado. El cierre Git humano de P1 sigue pendiente.
Los permisos efectivos de roles, su delegación y el uso explícito de skills
se comprobarán en el preflight y la primera tarea autorizada del implementador.
El prompt nocturno está aprobado con comprobaciones bloqueantes y fallback agéntico.

No existen todavía código de aplicación, pruebas de la aplicación,
CI, Docker funcional, contrato OpenAPI, Swagger UI ni despliegue.
Una política aprobada exige controles; no demuestra que se hayan ejecutado.
La configuración local de agentes es distinta de la base técnica del producto.

## Documentos disponibles

El [índice documental](README.md) contiene sus enlaces y estados.

- [Visión](vision-y-alcance.md) y [constitución](constitucion.md): alcance y principios.
- [Seguridad](seguridad.md), [calidad](politicas/calidad.md) y
  [documentación](politicas/documentacion.md): reglas permanentes.
- [Amenazas](seguridad/modelo-de-amenazas.md) y
  [OWASP](seguridad/cobertura-owasp.md): riesgos y comprobaciones previstas.
- [Cambios](trazabilidad/cambios.md): conciliación SEG y decisiones documentales.
- [Contribución](../CONTRIBUTING.md), [avisos de seguridad](../SECURITY.md)
  y [fuentes](fuentes.md): documentación G02-B aprobada.
- [SDD](metodologia/sdd.md), [contexto](metodologia/contexto.md),
  [orquestación](metodologia/orquestacion.md) y
  [eficiencia](metodologia/eficiencia-agentes.md): metodología P2 aprobada.
- [MCP](metodologia/mcp.md), [relevo](metodologia/plantillas/relevo.md) y
  [prompts](metodologia/prompts/README.md): documentación y configuración aprobadas.
- [Configuración Codex](../.codex/config.toml): ajustes locales y límite de agentes.
- [Ejecuciones de agentes](trazabilidad/ejecuciones-agentes.csv): registro de trabajo observado.
- [Especificaciones](../especificaciones/README.md): entrada a 001 y su estado.
- [Sesión nocturna 01](metodologia/prompts/sesion-nocturna-01.md): prompt aprobado con preflight y fallback; lanzamiento pendiente.
- [Memoria](../MEMORY.md): resumen breve para retomar el trabajo.

Las cuatro skills reales y los tres roles están enlazados en el índice.
Sus aprobaciones documentales no acreditan ejecución ni permisos efectivos.

## Siguiente paso histórico de preparación P2

1. La persona responsable realiza la revisión Git de los cambios y comprueba el staging.
2. Crea y publica los dos grupos de commit propuestos y comprueba el remoto.
3. Lanza expresamente la sesión nocturna con el paquete aprobado.
4. La sesión ejecuta el preflight: si falla un punto bloqueante, registra y se detiene;
   si falta una capacidad opcional del arnés, aplica el fallback aprobado.
5. Solo tras superar los puntos bloqueantes comienza T001, sin operaciones Git.

El primer grupo cerrará G02/P1; el segundo reunirá P2 y el paquete 001/nocturno.
Los documentos compartidos requieren separar los bloques de P1 de las referencias
a P2/001 para que el primer commit no enlace archivos todavía no incluidos.
Esta consolidación no ejecutó Git ni creó código funcional nuevo.
La aprobación del prompt no inicia una ejecución ni programa una automatización.
La sesión podrá redactar futuras especificaciones, pero no aprobarlas.

## Mantenimiento

Al cerrar un paso se revisarán estado, enlaces y siguiente acción.
No se enlazarán archivos futuros como si ya existieran.
Las decisiones duraderas se guardarán en su documento principal.

## Estado vigente AG-012

La base001, identidad002 y proveedores003 están implementadas y verificadas localmente;
existen código, pruebas, Docker, CI, OpenAPI y Swagger. Aceptación/integración y
publicación no se deducen de esas verificaciones. Los apartados anteriores
conservan el contexto histórico de preparación, no el estado operativo actual.
AG-012 aprueba SDD004 y ejecuta solicitudes/conceptos/importes/presentación.
La corrección heredada003 supera regresión;004 está verificada localmente (SCI-01–14).
[Informe AG-012](trazabilidad/AG-012-informe.md) y [SDD](../especificaciones/README.md)
son la entrada al trabajo vigente.005 solo podrá continuar tras004 verificada y
comprobar el margen autorizado. No existe despliegue público validado.
