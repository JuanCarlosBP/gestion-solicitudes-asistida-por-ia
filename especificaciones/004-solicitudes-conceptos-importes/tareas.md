# Tareas — 004 Solicitudes, conceptos e importes

**Estado:** Aprobadas por decisión humana AG-012
Autorización integral del encargo. Implementación y verificación son estados
distintos; aceptación e integración corresponden a la persona responsable.

| Tarea | SCI | Dependencia | Escritor y archivos | Criterio de terminación / evidencia |
|---|---|---|---|---|
| T004-00 Corrección heredada | 14 | Ninguna | Coordinador; E2E proveedores, adenda003 y AG012 | Reproducir/analizar fallo remoto, UUID y filtros aislados, enfocada y regresión001–003 PASS; agrupación separable sin Git. |
| T004-01 SDD y contrato | 01–14 | Decisiones humanas | Coordinador; spec/plan/tareas/ADR0005 | Todas las decisiones incorporadas y contrato compartido antes de código. |
| T004-02 Dominio y V4 | 01,04,05,14 | 00/01 | Backend; solicitudes, V4 y pruebas | BigDecimal, límites, agregado/constraints/migración nueva y actualización; ejemplos obligatorios. |
| T004-03 CRUD de borrador y lecturas | 01–04,09,10,13 | 02 | Backend; solicitudes e integración de seguridad | Crear/detalle/listar/guardar, visibilidad SQL, rollback, versión y errores. |
| T004-04 Referencias y presentación | 06–11,13 | 03 | Backend; solicitudes, selector identidad y pruebas | Snapshot, supervisor, transacción/idempotencia; carreras PostgreSQL y resultado exacto. |
| T004-05 Lecturas Angular | 01–03,09,12 | 00/01 contrato | Frontend; solicitudes, rutas y navegación | Servicio/modelos/lista/detalle/filtros, query params y pruebas. |
| T004-06 Editor y visual | 04–12 | 05 | Frontend; solicitudes y CSS compartido | Conceptos/estimación/selectores, conflicto, confirmación y accesibilidad; pruebas y capturas. |
| T004-07 Integración y QA | 01–14 | 02–06 | Coordinador; qa, CI y evidencias AG012 | Todos los controles obligatorios y E2E13 pasos sobre imágenes finales. |
| T004-08 Revisión | 01–14 | Evidencia07 | Revisor solo lectura | Requisito por requisito, hallazgos remitidos al escritor; nunca reparar durante revisión. |
| T004-09 Cierre | 14 | 07/08 | Coordinador; validación/docs/README/índices/MEMORY/CSV | Resultados, riesgos, manifiesto y horarios comprobables; evaluar puerta005. |

## Asignaciones exclusivas

Backend: backend/src/main, backend/src/test, configuración backend necesaria;
sin cambiar versiones/dependencias salvo defecto justificado sin versión mayor.
Frontend: frontend/src, e2e/solicitudes.spec.ts. El E2E heredado proveedores
permanece del coordinador. No editar package-lock ni añadir dependencia visual.
Coordinador: documentación, qa, infraestructura, CI, registros y evidencias.
Ningún agente ejecuta Git ni escribe históricos AG003–AG011, REV001/ADR0001–0004.
Builds/pruebas compartidos se coordinan; no dos escritores sobre el mismo archivo.

Estado al cierre004 de AG-012: T004-00–09 ejecutadas y verificadas localmente.
La validación conserva matriz SCI, evidencias y correcciones; no equivale a
aceptación ni integración. La puerta condicional005 se registra con hora real.
