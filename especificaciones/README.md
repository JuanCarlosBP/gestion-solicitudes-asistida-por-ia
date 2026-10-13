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
| 001 — Base verificable | [Tareas](001-base-verificable/tareas.md) | Ejecutadas; verify corregido en AG-008 y repetido en AG-009. Aceptación pendiente. |
| 001 — Base verificable | [Validación](001-base-verificable/validacion.md) | Verificada localmente en AG-009; segunda CI, aceptación e integración pendientes. |
| 002 — Identidad y acceso | [Especificación](002-identidad-acceso/especificacion.md) | Aprobada por decisión humana AG-010. |
| 002 — Identidad y acceso | [Plan](002-identidad-acceso/plan.md) | Aprobado por decisión humana AG-010. |
| 002 — Identidad y acceso | [Tareas](002-identidad-acceso/tareas.md) | Aprobadas por decisión humana AG-010; ejecución y QA local superadas. |
| 002 — Identidad y acceso | [Validación](002-identidad-acceso/validacion.md) | Resultados locales AG-010; aceptación e integración pendientes. |
| 003 — Proveedores | [Especificación](003-proveedores/especificacion.md) | Borrador pendiente de aprobación humana; sin plan, tareas, validación ni código. |

Los tres y DT-01 a DT-08 recibieron aprobación humana expresa el 2026-10-13.
001 está aprobado para implementación tras lanzamiento humano y preflight bloqueante.
AG-004 superó el preflight y comenzó T001; la excepción humana aprobada de
[ADR-0001](../docs/decisiones/ADR-0001-dependencia-transitiva-rolldown-angular-21.md)
se incorporó al plan antes de reanudar AG-005. La resolución del lockfile detectó
gensync preliminar no autorizado y se detuvo antes de instalar o generar código
funcional. AG-006 aprobó [ADR-0002](../docs/decisiones/ADR-0002-politica-dependencias-transitivas.md)
y ejecutó la base local con pruebas. [Versiones](../docs/documentaciondev/versiones.md)
conserva la historia y los parches de seguridad; validación distingue controles
superados, la resolución del bloqueo de formato y el pendiente remoto.

AG-010 aprueba e inicia 002 expresamente, con
[ADR-0003](../docs/decisiones/ADR-0003-identidad-jwt-y-sesiones.md).
Esta autorización sustituye para 002 el límite anterior de solo borrador.

## Incrementos posteriores previstos

El [prompt nocturno](../docs/metodologia/prompts/sesion-nocturna-01.md)
está aprobado para redactar únicamente borradores de especificación para:

- 003-proveedores;
- 004-solicitudes-conceptos-importes;
- 005-aprobaciones;
- 006-concurrencia-idempotencia;
- 007-historial-auditoria;
- 008-demo-y-operacion.

Las carpetas 003–008 todavía no se han creado.
No se prepararán sus planes ni tareas sin aprobación posterior.
Su orden no resuelve por sí solo las dudas de cada funcionalidad.

## Estados y evidencias

Los requisitos tendrán IDs estables y criterios observables.
Las tareas conservarán la relación con esos IDs.
Los resultados se guardarán en la validación del incremento ejecutado.
Una propuesta, un archivo creado y una prueba superada son estados distintos.
La aceptación y las operaciones Git corresponden a la persona responsable.
