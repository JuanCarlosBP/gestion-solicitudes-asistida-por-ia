# MEMORY.md — Gestión de Solicitudes

Memoria vigente; historia inicial en [AG-001–AG-005](docs/trazabilidad/memoria-hasta-ag005.md).
Entrada AG-010 conservada en `qa/evidencias/ag010/memoria-entrada.txt`.

## Decisiones y límites

- La persona responsable conserva aceptación, integración, publicación y Git.
- 001 verificada localmente en AG-009; CI posterior, aceptación e integración pendientes.
- PR borrador #1 humana intacta; primera CI histórica falló en setup-java/copia public.
- AG-003–AG-009, REV-001, ADR-0001/0002, V1 y configuración de agentes preservados.
- Rama comunicada: feature/002-identidad-acceso; no comprobada con Git.
- Orden AG-010 aprueba definición e implementación de 002 sin nueva aprobación documental.
- Sin CRUD usuarios, proveedores ni otros módulos de negocio implementados.

## Resultado AG-010

- Inicio: 2026-10-13 23:55:26 +02:00; límite: 2026-10-14 09:55:26 +02:00, Europe/Madrid.
- Cierre AG-010: 2026-10-14 00:32:05 +02:00; duración registrada 00:36:39.
- [002](especificaciones/002-identidad-acceso/especificacion.md), plan y tareas aprobados por decisión humana AG-010.
- [ADR-0003](docs/decisiones/ADR-0003-identidad-jwt-y-sesiones.md) aprobado; JWT RS256, refresh opaco, PostgreSQL y CSRF.
- IA-01–IA-14 verificados localmente; [validación](especificaciones/002-identidad-acceso/validacion.md).
- Verify PASS 55 backend, 56 Angular y 8 E2E; tipos/lint/formato/build/SpotBugs PASS.
- Docker sin caché, Compose persistencia/503/200 y 88 controles de sesión PASS.
- npm audit producción/completo y OSV Maven132 sin avisos finales; BC fijada en 1.86.
- Revisión independiente sin nuevos bloqueantes; R-002-01 RSA y R-002-02 logs corregidos.
- Revisores solo lectura por instrucción; workspace-write efectivo, sin aislamiento acreditado.
- Un escritor backend, otro frontend; coordinador docs/infra/CI/QA; evidencias en AG-010.
- 303 protegidos intactos; CSV histórico conservado; manifiestos por SHA-256 sin Git.
- Servicios detenidos; volumen y datos ficticios conservados; ninguna publicación.
- Incidencia inicial: git status --short antes de leer adjunto, salida vacía; ningún Git posterior.
- npm audit inicialmente rechazado por auto-review; autorización expresa posterior y auditoría PASS.
- [Informe AG-010](docs/trazabilidad/AG-010-informe.md) conserva detalles, riesgos y tiempos finales.

## Pendientes y parada

- CI remota pendiente del push humano; 002 no aceptada ni integrada.
- [003 proveedores](especificaciones/003-proveedores/especificacion.md): borrador pendiente de aprobación humana; sin plan/tareas/código.
- Condición opcional acreditada al verificar 002: 564 minutos disponibles, superior a sesenta.
- Al entregar, sesión detenida; sin reanudación programada.
- Siguiente decisión humana: revisar evidencias, realizar Git/CI y decidir aceptación/integración.
