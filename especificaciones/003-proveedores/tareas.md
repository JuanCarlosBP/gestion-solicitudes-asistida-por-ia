# Tareas — 003 Proveedores

**Estado:** Aprobadas por decisión humana AG-011
**Fuente:** [especificación](especificacion.md) y [plan](plan.md).

| ID | PR | Trabajo y aceptación | Dependencia | Escritor | Estado |
|---|---|---|---|---|---|
| PR-T01 | 12 | Herramientas/builds/documentos/baseline/inicio-límite | ninguna | coordinador | Precondición ejecutada |
| PR-T02 | 01–12 | Decisiones, contrato, SDD y ADR antes del código | T01 | coordinador/planificador lector | Documentado por autorización humana |
| PR-T03 | 01–09/11 | V3/dominio/aplicación/JDBC, unique/version y roles DB | T02 | backend | Implementada; PostgreSQL real PASS |
| PR-T04 | 01–09/11 | HTTP/permisos/CSRF/errores/OpenAPI | T03 | backend | Implementada y comprobada |
| PR-T05 | 01–09/11/12 | Unitarias/HTTP/PostgreSQL/carreras/logs/verify íntegro | T03/T04 | backend | 98 pruebas/Spotless/SpotBugs PASS |
| PR-T06 | 10 | Angular: servicio/rutas/lista/detalle/formulario/estados/accesibilidad | contrato T02 | frontend | Implementada y comprobada |
| PR-T07 | 10/12 | Angular y E2E doce pasos, tipos/lint/formato/build | T06 | frontend | 130 Angular y9 E2E PASS |
| PR-T08 | 01–12 | Docker sin caché/Compose/persistencia/identidad/salud/Swagger/E2E | T05/T07 | coordinador | PASS;78 controles proveedores y88 sesiones |
| PR-T09 | 11/12 | Auditorías/CI/actionlint/docs/enlaces/secretos/huellas/manifiesto | T08 | coordinador | PASS; auditorías/CI local/docs/huellas |
| PR-T10 | 01–12 | Revisión sin reparar, correcciones por escritor y cierre/memoria | T09 | revisor/coordinador | Revisión independiente PASS; cierre registrado en informe |

Backend escritura exclusiva backend/** y evidencias backend-* AG-011.
Frontend escritura exclusiva frontend/** y evidencias frontend-* AG-011.
Coordinador reserva README, MEMORY, índices, CSV, validación, docs, QA, CI e infra.
Los agentes no están solos: respetar cambios ajenos, sin revertirlos.

Evidencia T03–05: JUnit/verify/carreras/roles/logs y mapa PR. T06–07: pruebas y
checks frontend/E2E. T08: logs/JSON Compose y capturas. T09–10: auditorías,
revisión, huellas, validación/informe y pendientes. No verificada por intención.
