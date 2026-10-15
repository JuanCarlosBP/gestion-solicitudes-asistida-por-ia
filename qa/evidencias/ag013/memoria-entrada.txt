# MEMORY.md — Gestión de Solicitudes

Memoria vigente; entrada AG-012 conservada en qa/evidencias/ag012/memoria-entrada.txt.
Historia en informes y validaciones; esta memoria no sustituye sus evidencias.

## Decisiones vigentes

- La persona responsable conserva Git, aceptación, integración y publicación.
- AG-012 aprueba expresamente D-004-01–11, SDD e implementación004.
- D-005-01–08 aprobadas; continuación condicionada a004 verificada y margen120min.
- Con60–119min solo SDD005; menos60min no005;006 solo borrador tras005 verificada+45min.
- Rama comunicada feature/004-solicitudes-conceptos-importes, sin comprobar con Git.
- Sin Git, datos reales, cambios mayores ni modificaciones de históricos.
- AG003–AG011, REV001, ADR0001–0004 y validaciones anteriores protegidos.

## AG-012 cerrada

- Inicio2026-10-14 23:34:02+02:00; límite2026-10-15 09:34:02+02:00 Europe/Madrid.
- Cierre2026-10-15 00:41:12+02:00; duración01:07:10, dentro del límite.
- Precondición construcción PASS a23:35:28,1.43min; herramientas y Docker disponibles.
- PR3/Actions consultadas solo lectura: backend/frontend PASS; Compose E2E003 FAIL.
- Fallo remoto esperaba1/recibió2; reproducción local1/6 con filtros vacíos.
- Corrección prueba única: UUID, espera preparación/foco, filtros aislados y URL exacta.
- Enfocada1/1 y E2E001–003 9/9 PASS, sin reintentos; buscador sin cambios.
- Regresión backend98/98 verify/Spotless/SpotBugs; Angular130/130 y controles PASS.
- Sandbox Docker/loopback/Vite necesitó ejecución local autorizada; fallos conservados.
- Adenda003 nueva registra corrección; validaciónAG011 intacta.
- SDD004 y ADR0005 aprobados por orden humana y redactados antes de implementar.
- Backend/frontend004 implementados; revisión independiente sin hallazgos abiertos.
- Backend144, Angular275 y E2E11 PASS; API004119, sesiones88 y proveedores78 PASS.
- Docker limpio, Compose persistencia/503/200, auditorías y actionlint PASS.
- UI03 foco oculto corregido: Tab62/0 frente a24; capturas360/768/1440 revisadas.
- V4 candidata local alineada sin borrar filas; datos/V1–V3 preservados y FlywayPASS.
- 496 huellas iniciales+63 históricas coinciden; prefijoCSV intacto; sin Git.
- Revisor independiente solo lectura por instrucción; sin aislamiento técnico acreditado.
- Evidencias nuevas qa/evidencias/ag012 y temporales; huellas iniciales capturadas.

## Estado y siguiente paso

- SCI-01–14 verificados; cierre004/snapshot de228 fuentes conservado.
- Puerta005 a2026-10-15 00:09:52+02:00:564min restantes; implementación autorizada.
- SDD005/ADR0006 redactados antes de código; AP01–10 verificados localmente.
- Backend180/Angular346/E2E14/API425 PASS; V5 conserva seis tablas y V1–V4.
- LoginQA por precisión temporal, foco E2E y OpenAPI corregidos y regresados.
- Builds finales, Compose persistencia/503/200 y revisión independiente PASS.
- Docs/integridad PASS; sin hallazgos abiertos. Puerta00600:39:11+02,534min.
- 006 únicamente especificación borrador pendiente de aprobación; sin otros artefactos.
- No declarar004/005 aceptadas/integradas; CI remota pendiente de push humano.
- Compose detenido; volumen y datos ficticios conservados.
- Criterios/contratos y resultados en especificaciones004/005 y sus validaciones.
- Informe vivo docs/trazabilidad/AG-012-informe.md; validación004 consolidada.
- Siguiente paso humano: revisar entrega, Git/CI remota, aceptación e integración.
