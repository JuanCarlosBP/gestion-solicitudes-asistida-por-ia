# Tareas — 006 Concurrencia e idempotencia

**Estado:** Aprobadas por decisión humana AG-013
**Fuente:** Encargo integral y [plan](plan.md), [especificación](especificacion.md).

| ID | CI | Dependencia | Escritor/archivos | Terminación/evidencia | Estado |
|---|---|---|---|---|---|
| T006-01 Precondición |10|Encargo|Coordinador, evidenciaAG013|Herramientas/builds/PR lectura/huellas/horario|Ejecutada PASS; fallo heredado reproducido y corregido|
| T006-02 SDD/contrato |01–10|01|Coordinador,SDD/ADR|Decisiones conciliadas antes de código|Documentada por autorización humana|
| T006-03 V6/canónica |03,04,08|02|Backend, migración/operaciones|V1–V5/filas/hash/replay intactos y pruebas|Ejecutada PASS; V5→V6 real y Testcontainers|
| T006-04 Transacción/HTTP |01–06,09|03|Backend, módulos/identidad|7POST/GET/permisos/espera/rollback|Ejecutada PASS; API e IT|
| T006-05 Pruebas backend |01–06,08–10|03/04|Backend, tests/evidencia|20+20/versiones/reinicio/revocación/verify|211 PASS; Spotless/SpotBugs PASS|
| T006-06 Angular |01,07,09|Contrato02|Frontend,src/app|Descriptor/TTL/misma clave/estados/foco/tests|411 PASS; tipos/lint/formato/build PASS|
| T006-07 E2E |04–07,09,10|04/06|Frontend,e2e|Respuesta perdida/pestañas/reapertura/progreso/permisos/reinicio|23 PASS; cero reintentos|
| T006-08 QA/CI |01–10|05/07|Coordinador,qa/infra/CI|Docker/Compose/API001–006/auditorías/docs|492 API PASS; imágenes/Compose/auditorías/actionlint PASS; CI remota humana|
| T006-09 Revisión |01–10|Evidencia05–08|Revisor,sin escritura|Criterios/hallazgos al escritor|CI-01–10 comprobados localmente; sin hallazgos abiertos|
| T006-10 Cierre |10|08/09|Coordinador,docs/validación/CSV/MEMORY|Resultados/horario/riesgos/huellas/manifiesto|006 cerrada localmente; registro de sesión AG-013 en el informe|

Un escritor por archivo. Agentes no están solos y acomodan cambios ajenos.
Backend no opera Compose compartido; frontend coordina su E2E con el coordinador.
Adaptar llamadas heredadas al UUID conservando negativos, sin reducir pruebas.
No editar históricos/migracionesV1–V5. Revisor no ejecuta builds ni corrige.
Autorización no equivale a implementación, verificación, aceptación o integración.
