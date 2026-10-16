# Especificaciones del producto

**Estado:** Aprobado

Cada incremento tiene una carpeta numerada con un objetivo verificable.
La especificación define qué se necesita; el plan propone cómo conseguirlo;
las tareas ordenan el trabajo y sus evidencias.
El proceso está en [SDD](../docs/metodologia/sdd.md).

Estado vigente comunicado por el encargo AG-013: gobierno/001/002 aceptados
formalmente;003–005 verificados localmente. Las referencias AG-009/010 de la tabla
conservan el resultado documentado en aquellas ejecuciones.006 queda verificada
localmente en AG-013; su aceptación e integración continúan pendientes.
AG-014 verifica007 localmente y, tras su puerta, crea solo el borrador008.
AG-015 corrige localmente la primera CI fallida de007; publicación y nueva CI
siguen pendientes. [Informe correctivo](../docs/trazabilidad/AG-015-informe.md).
008 tiene aprobación conceptual de la tercera opción (un VPS, Java y PostgreSQL,
bases temporales separadas); prototipo y dimensionamiento después del cierre007.
El archivo008 permanece como borrador histórico, sin cambios en esta reparación.

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
| 003 — Proveedores | [Especificación](003-proveedores/especificacion.md) | Aprobada por decisión humana AG-011. |
| 003 — Proveedores | [Plan](003-proveedores/plan.md) | Aprobado por decisión humana AG-011. |
| 003 — Proveedores | [Tareas](003-proveedores/tareas.md) | Aprobadas por decisión humana AG-011; implementación y pruebas ejecutadas. |
| 003 — Proveedores | [Validación](003-proveedores/validacion.md) | Verificada localmente en AG-011; aceptación e integración pendientes. |
| 003 — Adenda AG-012 | [Corrección y regresión](003-proveedores/validacion-ag012.md) | E2E heredado corregido y regresión001–003 local; histórico AG-011 conservado. |
| 004 — Solicitudes, conceptos e importes | [Especificación](004-solicitudes-conceptos-importes/especificacion.md) | Aprobada por decisión humana AG-012. |
| 004 — Solicitudes, conceptos e importes | [Plan](004-solicitudes-conceptos-importes/plan.md) | Aprobado por decisión humana AG-012. |
| 004 — Solicitudes, conceptos e importes | [Tareas](004-solicitudes-conceptos-importes/tareas.md) | Aprobadas y ejecutadas en AG-012. |
| 004 — Solicitudes, conceptos e importes | [Validación](004-solicitudes-conceptos-importes/validacion.md) | Verificada localmente, sin aceptación ni integración. |
| 005 — Aprobaciones | [Especificación](005-aprobaciones/especificacion.md) | Aprobada por decisión humana AG-012; puerta cumplida. |
| 005 — Aprobaciones | [Plan](005-aprobaciones/plan.md) | Aprobado por decisión humana AG-012. |
| 005 — Aprobaciones | [Tareas](005-aprobaciones/tareas.md) | Aprobadas y ejecutadas en AG-012. |
| 005 — Aprobaciones | [Validación](005-aprobaciones/validacion.md) | AP-01–10 verificados localmente, sin aceptación ni integración. |
| 006 — Concurrencia e idempotencia | [Especificación](006-concurrencia-idempotencia/especificacion.md) | Aprobada por decisión humana AG-013. |
| 006 — Concurrencia e idempotencia | [Plan](006-concurrencia-idempotencia/plan.md) | Aprobado por decisión humana AG-013. |
| 006 — Concurrencia e idempotencia | [Tareas](006-concurrencia-idempotencia/tareas.md) | Aprobadas y ejecutadas en AG-013. |
| 006 — Concurrencia e idempotencia | [Validación](006-concurrencia-idempotencia/validacion.md) | CI-01–10 verificados localmente, revisión sin hallazgos abiertos; aceptación e integración pendientes. |
| 007 — Historial y auditoría | [Especificación](007-historial-auditoria/especificacion.md) | Aprobada por AG-014; SDD, ADR0008 e implementación realizados. |
| 007 — Historial y auditoría | [Plan](007-historial-auditoria/plan.md) | Autorizado por AG-014 y ejecutado. |
| 007 — Historial y auditoría | [Tareas](007-historial-auditoria/tareas.md) | Ejecutadas y verificadas localmente. |
| 007 — Historial y auditoría | [Validación](007-historial-auditoria/validacion.md) | Corrección AG-015 verificada localmente tras primera CI fallida; publicación, nueva CI, aceptación e integración pendientes. |
| 008 — Demo, operación y entrega | [Especificación](008-demo-operacion-entrega/especificacion.md) | Solo borrador tras puerta AG-014; sin plan/tareas aprobados, código ni despliegue. |

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

AG-011 aprueba e inicia 003 con las decisiones D-003-01 a D-003-08 y
[ADR-0004](../docs/decisiones/ADR-0004-catalogo-proveedores-y-concurrencia.md).

## Incrementos posteriores previstos

El [prompt nocturno](../docs/metodologia/prompts/sesion-nocturna-01.md)
está aprobado para redactar únicamente borradores de especificación para:

- 005-aprobaciones;
- 006-concurrencia-idempotencia;
- 007-historial-auditoria;
- 008-demo-y-operacion.

AG-012 aprueba D-004-01–11 y su paquete SDD, sustituyendo el borrador de AG-011.
D-005-01–08 también están aprobadas por el encargo, pero la continuación exige004
completamente verificada y al menos120 minutos de margen (60–119 solo SDD005).
006 solo puede ser borrador tras005 verificada y al menos45 minutos.
La puerta005 se cumplió a2026-10-15 00:09:52+02:00, con564 minutos restantes.
Su SDD se redactó antes del código. Tras verificar005, la puerta006 se cumplió
a2026-10-15 00:39:11+02:00 con534 minutos restantes. Se creó únicamente su
especificación borrador. Ese límite histórico queda sustituido para006 por AG-013:
D-006-01–10, SDD/ADR e implementación expresamente autorizados.007solo borrador
si006queda completamente verificada y restan45min;008 continúa prevista.
La [puerta007](../qa/evidencias/ag013/puerta007.json) se cumplió a13:23:37+02:00,
con537,298min restantes. Se creó únicamente la especificación borrador007.

## Estados y evidencias

AG-014 sustituye el límite anterior de borrador007: D-007-01–10 y ejecución
autorizadas, con [plan007](007-historial-auditoria/plan.md),
[tareas](007-historial-auditoria/tareas.md) y
[validación](007-historial-auditoria/validacion.md). La continuación008 requiere007
completamente verificada localmente, revisión sin bloqueantes y90 minutos restantes;
solo autoriza borrador documental, nunca código ni despliegue.
La [puerta008](../qa/evidencias/ag014/reanudacion/puerta008.json) se cumplió
a22:17:38+02:00 con347,351 minutos restantes; se creó únicamente la especificación.

Los requisitos tendrán IDs estables y criterios observables.
Las tareas conservarán la relación con esos IDs.
Los resultados se guardarán en la validación del incremento ejecutado.
Una propuesta, un archivo creado y una prueba superada son estados distintos.
La aceptación y las operaciones Git corresponden a la persona responsable.
