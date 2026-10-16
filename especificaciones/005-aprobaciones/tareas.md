# Tareas — 005 Aprobaciones

**Estado:** Aprobadas por decisión humana AG-012
La puerta005 y el plan están redactados antes del código. No equivalen a pruebas
superadas ni aceptación/integración.

| Tarea | Criterios | Escritor | Terminación |
|---|---|---|---|
| T005-01 SDD/contrato |AP01–10|Coordinador, con propuesta del planificador|Spec/plan/tareas/validación y decisión técnica aprobadas por origen humano. |
| T005-02 Dominio/V5 |AP01–06,09|Backend, exclusivamente backend|Estados/textos/actor, evento, checks/privilegios y evolución sin editarV1–V4. |
| T005-03 Decisión transaccional/HTTP |AP01–07,09|Backend|DTO/errores/OpenAPI, versión/idempotencia/replay004, autorización vigente y evento atómico. |
| T005-04 Pruebas backend |AP01–07,09–10|Backend|Dominio, HTTP, PostgreSQL real, rollback/carreras/privilegios y regresión001–005; verify/Spotless/SpotBugs. |
| T005-05 Bandeja/detalle/formularios |AP07–08|Frontend, frontend/src|Contrato cerrado, rol/asignado/noautor, confirmación, resultado, foco y visual004. |
| T005-06 Angular/E2E |AP01–08,10|Frontend, src y e2e/aprobaciones.spec.ts|Unitarias/regresión y E2E real definido; sin omitir fixtures ni rebajar aserciones. |
| T005-07 QA/CI |AP01–10|Coordinador, qa/CI/infraestructura|API005/Compose/builds/navegador/auditorías/secretos/documentación e imágenes finales. |
| T005-08 Revisión |AP01–10|Revisor solo lectura|Requisito por requisito, evidencias y hallazgos remitidos al escritor. |
| T005-09 Cierre |AP10|Coordinador, docs/índices/MEMORY/CSV|Validación/resultados/archivos/manifiesto; evaluar006solo borrador con45min. |

Coordinador reserva frontend/e2e/base.spec.ts y proveedores.spec.ts. Frontend
puede adaptar solicitudes.spec.ts solo por compatibilidad y añadir aprobaciones.
Backend no opera Compose compartido. Cada escritor conserva pruebas y evidencias
004; no sobrescribir sus logs, huellas ni resultados. Salidas005 con prefijo
`backend005-`/`frontend005-` y directorios separados. Sin Git ni datos reales.

Estado de cierre: T005-01–09 completadas y verificadas localmente, incluida
consolidación documental y revisión. Backend180, Angular346, E2E14 y API425 PASS. La
[validación](validacion.md) registra criterios, fallos, correcciones y límites.
