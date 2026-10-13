# MEMORY.md — Gestión de Solicitudes

Memoria vigente; historia inicial en
[AG-001–AG-005](docs/trazabilidad/memoria-hasta-ag005.md).

## Decisiones y límites

- P0, G02-A/G02-B, P2 y CAM-001/002 conservan su estado documental.
- 001: especificación, plan, tareas y DT-01–DT-08 aprobados el 2026-10-13.
- Rama declarada: `feature/001-base-verificable`; sin consultas ni comandos Git.
- ADR-0001/0002 intactos; sin funciones 002–008 ni cambios de arquitectura.
- La persona responsable decide aceptación, publicación e integración.

## Historia conservada

- [AG-006](docs/trazabilidad/AG-006-informe.md): base operativa; verify falló en Spotless.
- AG-006: 10 unitarias/HTTP + 3 IT backend, 11 Angular y 5 E2E PASS.
- Builds, frontend tipos/lint/formato, SpotBugs, actionlint y auditorías PASS AG-006.
- Auditorías de aquella fecha: npm 0 vulnerabilidades; Maven OSV 0 coincidencias.
- [AG-007](docs/trazabilidad/AG-007-informe.md): causa binaria Style.valueOf identificada.
- AG-007 apply/check FAIL, 14 Java idénticos; verify no ejecutado; sin cambio de versiones.
- Informes, evidencias, fallos y registros AG-003–AG-007 íntegros.
- Memoria anterior íntegra en `qa/evidencias/ag008/memoria-anterior.txt`.

## AG-008 — propuesta de verificación local

- Autorización humana: google-java-format 1.37.0 → 1.36.1; Spotless 3.10.4 intacto.
- Inicio 2026-10-13 11:39:31 +02:00; límite 12:24:31; cierre en evidencia AG-008.
- Java 21, style=AOSP existente, check en validate y los 14 Java conservados.
- POM efectivo PASS; primer intento falló por DNS sandbox, repetición autorizada PASS.
- Apply/check PASS; 7 Java reformateados, tokens/literales/imports conservados por comparación.
- Verify íntegro PASS: 10 unitarias/HTTP + 3 IT, cero omisiones; SpotBugs 0 bugs/errores.
- Verify: 24,718 s de pared; compilación y empaquetado PASS, sin parámetros skip.
- Compose/backend final reconstruido; 5 E2E PASS; salud/OpenAPI/Swagger/Angular PASS.
- Persistencia, caída PostgreSQL 503 en 2014 ms y recuperación 200 PASS.
- Tres servicios detenidos; volumen conservado. Sin CI remota ni despliegue.
- Frontend/workflow idénticos por SHA-256: 11 Angular y controles no afectados reutilizados.
- Auditorías AG-006 conservan fecha/alcance; no repetidas ni ampliadas.
- Auxiliar tmp/ag007/DiagnosticoFormato.java eliminado; copia durable intacta.
- Revisión final de misma sesión en solo lectura, no independiente.
- Ningún comando Git; JGit interno de Spotless conserva mecanismo documentado en AG-007.

## Entrega y siguiente paso

- Leer [informe AG-008](docs/trazabilidad/AG-008-informe.md) y
  [validación](especificaciones/001-base-verificable/validacion.md).
- Manifiesto, integridad, revisión y cierre en `qa/evidencias/ag008/`.
- 001 propuesta como verificada localmente; no aceptada ni integrada.
- Pendientes: push humano, CI remota, revisión independiente, aceptación e integración en main.
- Trabajo autorizado terminado; esperar decisión humana. Sin reanudación automática.
