# Especificaciones del producto

**Estado:** Aprobado

Cada incremento tiene una carpeta numerada con un objetivo verificable.
La especificación define qué se necesita; el plan propone cómo conseguirlo;
las tareas ordenan el trabajo y sus evidencias.
El proceso está en [SDD](../docs/metodologia/sdd.md).

## Paquete existente

| Incremento | Documento | Estado |
|---|---|---|
| 001 — Base verificable | [Especificación](001-base-verificable/especificacion.md) | Aprobada. |
| 001 — Base verificable | [Plan](001-base-verificable/plan.md) | Aprobado; DT-01 a DT-08 aprobadas. |
| 001 — Base verificable | [Tareas](001-base-verificable/tareas.md) | Documento aprobado; tareas pendientes de ejecución. |

Los tres y DT-01 a DT-08 recibieron aprobación humana expresa el 2026-10-13.
001 está aprobado para implementación tras lanzamiento humano y preflight bloqueante.
Esta consolidación documental no inicia su ejecución ni acredita pruebas.
Todavía no existe `validacion.md`: se creará con comprobaciones reales.

## Incrementos posteriores previstos

El [prompt nocturno](../docs/metodologia/prompts/sesion-nocturna-01.md)
está aprobado para redactar únicamente borradores de especificación para:

- 002-identidad-y-acceso;
- 003-proveedores;
- 004-solicitudes-conceptos-importes;
- 005-aprobaciones;
- 006-concurrencia-idempotencia;
- 007-historial-auditoria;
- 008-demo-y-operacion.

Esas carpetas y documentos todavía no se han creado.
No se prepararán sus planes ni tareas sin aprobación posterior.
Su orden no resuelve por sí solo las dudas de cada funcionalidad.

## Estados y evidencias

Los requisitos tendrán IDs estables y criterios observables.
Las tareas conservarán la relación con esos IDs.
Los resultados se guardarán en la validación del incremento ejecutado.
Una propuesta, un archivo creado y una prueba superada son estados distintos.
La aceptación y las operaciones Git corresponden a la persona responsable.
