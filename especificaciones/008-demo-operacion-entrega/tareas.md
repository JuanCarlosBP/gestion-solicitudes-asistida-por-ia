# Tareas008 — AG-016

**Estado: tareas autorizadas dentro de AG-016; avance sujeto a revisión y evidencia.**

| Tarea | Requisitos | Propietario/rutas | Dependencia y comprobación |
|---|---|---|---|
| T008-01 | DO01–10 | Coordinador: SDD008, ADR0009, README, CONTRIBUTING, MEMORY, índices, informe/evidenciaAG016 | Diseño revisado antes de implementar; cierre007 e inventario documentados. Históricos preservados. |
| T008-02 | DO03–05/07, AIS01–08 | Implementador backend: backend/src, configuración backend/pruebas | Implementado y comprobado:149unitarias+128IT; aislamiento, roles, carreras y supervisor reales. |
| T008-03 | DO01/03/05/08, AIS02/05 | Implementador frontend: frontend/src y e2e demo | Implementado y comprobado:528casos,46demo, E2E demo final04 y capturas con60min. |
| T008-04 | DO02/04/06/07, AIS03/07/09 | Coordinador implementador: infraestructura/demo y QA/operación; backend delegado: solo qa/ag016/restaurar-archivo.mjs y su test | Laboratorio nuevo operativo;18controles de conexión,56de ciclo,6de cuota y9de supervisor. TLS local preparado. Pendiente recuperación separada desde copia cifrada guardada, fuera de las ventanas de carga, según plan actualizado y revisión independiente. |
| T008-05 | DO09, AIS01–09 | Coordinador QA; backend delegado: nueva backend/src/test/java/es/gestionsolicitudes/demo/CaducidadDemoIT.java | Aislamiento primero; regresión API636 y E2E final05:33PASS sin retries, contratos originales intactos. Añadir comprobación PG+servicio+filtro en frontera temporal, sin reconciliador, según plan/revisión. Fallos conservados. |
| T008-06 | DO02/06/09 | Coordinador: inventario, helpers comunes, muestreador/evaluador; frontend: carga, barrera pura y contrato nuevo; backend: observador privado y pruebas | A1 final65minFAIL conservada. Diseño de variante revisado: IT de frontera complementaria, barrera CADUCADA de solo lectura y única sonda401. Implementación/verificación y cuatro pasadas nuevas pendientes. |
| T008-07 | DO08/10 | Coordinador: manuales públicos/inventario/validación008/manifiesto/MEMORY | Manuales y matriz documentados; revisión independiente en curso. Manifiesto/sello e inventario final pendientes. |

Máximo3 agentes activos incluyendo coordinador. Un escritor por archivo.
Revisor independiente no repara ni ejecuta builds/Docker. No Git por ningún rol.
No repetir suite completa por cambio documental aislado. Tras dos correcciones
fallidas del mismo problema, detener esa parte y elevar decisión humana.
