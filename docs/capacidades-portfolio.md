# Capacidades y referencias para el portfolio

Aplicación empresarial de proveedores y solicitudes con roles, conceptos,
importes calculados en servidor, decisiones, concurrencia e historial.
Backend Java21/Spring/PostgreSQL; frontend Angular/TypeScript; operación Docker.
La arquitectura es un monolito modular con entrada HTTP, aplicación, dominio
y persistencia separados.

| Capacidad | Referencia durable |
|---|---|
| Autenticación, sesión persistente, CSRF y permisos | [Seguridad](seguridad.md) |
| Proveedores, solicitudes, aprobación e idempotencia | [Índice SDD](../especificaciones/README.md) |
| Historial y resumen por permisos | [Incremento007](../especificaciones/007-historial-auditoria/especificacion.md) |
| Demo por visitante y generación | [Especificación008](../especificaciones/008-demo-operacion-entrega/especificacion.md) |
| Recorridos por solicitante, supervisor y auditor | [Guía de demo](demo-008.md) |
| Provisión separada, operación y recuperación | [Manual público](operacion-demo-008.md) |
| Pruebas, límites y dimensionamiento observado | [Informe AG-016](trazabilidad/AG-016-informe.md) |
| Decisión de aislamiento | [ADR0009](decisiones/ADR-0009-demo-aislada-y-operacion.md) |

Utilice estas rutas para preparar el contenido del portfolio. No se ha modificado
la web personal ni publicado un enlace de producción. Toda afirmación de calidad
o capacidad debe conservar el alcance y las limitaciones del informe.
