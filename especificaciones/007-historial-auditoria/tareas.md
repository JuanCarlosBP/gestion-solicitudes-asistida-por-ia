# Tareas — 007 Historial y auditoría

**Estado:** Autorizadas por AG-014; ejecutadas y verificadas localmente.
Fuentes: [especificación](especificacion.md), [plan](plan.md).
Los estados de verificación definitivos se registran en [validación](validacion.md).

T007-01–10 ejecutadas: PostgreSQL real,247 pruebas backend,479 Angular,
639 controles API,33 E2E sin reintentos,12 capturas y42 contrastes comprobados.
T007-09 cuenta con revisión independiente sin hallazgos materiales abiertos;
T007-10 registra informe, memoria, CSV, evidencias y propuesta de commits para Git humano.
El cierre parcial previo se conserva como evidencia histórica de AG-014.
No se marca un criterio completo por la sola existencia de su implementación.

| ID | Propietario / alcance | Criterios y salida |
|---|---|---|
| T007-01 | Coordinador: SDD/ADR/protección | HA01–10: conciliación, contrato, registro temporal/huellas; precondiciones<=15min. |
| T007-02 | Backend: V7/dominio/repositorio | HA01–04,09: esquema cerrado, privilegios, proyección V5 sin duplicar, no backfill. |
| T007-03 | Backend: integración transaccional | HA02–04,09: siete acciones, rollback efecto/evento/resultado, replay/no-op/carreras. |
| T007-04 | Backend: HTTP/consulta/OpenAPI | HA04–07: identidad vigente,404/403, unión roles, filtros/count/orden y resumen. |
| T007-05 | Backend: pruebas | HA01–07,09: PostgreSQL real, migración anterior, restricciones/privacidad y negativos. |
| T007-06 | Frontend: cliente/timeline/rutas | HA01,03–06,08: estados, URL, global/proveedor autorizado, historia desconocida. |
| T007-07 | Frontend: resumen/pruebas | HA07–08: contadores, acciones propias, teclado/foco/contraste/360/768/1440. |
| T007-08 | Coordinador + frontend: integración QA/CI | HA09–10: verify/Angular/Docker/API/E2E/auditorías/actionlint/documentación. |
| T007-09 | Revisor independiente: lectura | HA01–10: matriz, riesgos, evidencia correspondiente a fuentes y hallazgos. |
| T007-10 | Coordinador: cierre documental | HA10: informe/CSV/MEMORY/manifestación Git precisa y commits sugeridos para humano. |

## Casos obligatorios

Alta/modificación/baja/reactivación proveedor; crear/guardar/presentar solicitud;
aprobar/rechazar desdeV5; replay y reintento; no-op; fallo escritura evento revierte
negocio; carreras misma/distinta clave; revocación con JWT previo; multirrol;
recursos ajenos/inexistentes indistinguibles; global y resumen por perfil;
decisiones anteriores aV7 conservadas; historia incompleta sin inventar;
empates por fecha/UUID entre fuentes; filtros inválidos/duplicados/desconocidos,
UUID/ISO/rangos/size/page; SQL parametrizado y campos privados ausentes;
SELECT/INSERT app permitidos, UPDATE/DELETE denegados; recarga/navegación/teclado.

## Condiciones de parada

Bloquear solo punto afectado ante contradicción de seguridad/integridad/privacidad
o dos correcciones fallidas. Parada global por corrupción, pérdida de datos,
secreto real necesario, modificación obligadaV1–V6, vulnerabilidad alta aplicable
sin solución, imposibilidad de construir o plazo agotado. No encubrir pruebas
pendientes o fallidas. No alterar evidencia histórica ni afirmar aceptación.
