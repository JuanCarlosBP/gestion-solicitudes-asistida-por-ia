# MEMORY.md — Gestión de Solicitudes

Memoria vigente; historia inicial en
[AG-001–AG-005](docs/trazabilidad/memoria-hasta-ag005.md).

## Decisiones y límites

- P0, G02-A/G02-B, P2 y CAM-001/002 conservan su estado documental.
- 001: especificación, plan, tareas y DT-01–DT-08 aprobados el 2026-10-13.
- ADR-0001/0002 intactos; sin funciones 002–008 ni cambios de arquitectura.
- La persona responsable decide aceptación, publicación e integración.

## Historia preservada

- AG-006 implementó la base; verify falló en Spotless; AG-007 identificó la causa.
- [AG-008](docs/trazabilidad/AG-008-informe.md) completó Spotless y verify sin skip.
- AG-008: 13 backend, 11 Angular acreditadas y 5 E2E; Compose/503/recuperación PASS.
- Informes/evidencias AG-003–AG-008 íntegros; anteriores memorias conservadas.
- La persona responsable publicó `feature/001-base-verificable` y PR borrador #1.
- Commits comunicados: 2a4c15c, 7184ff8, 3f379d0, 234e2d5, f05be8a.
- Primera CI real: runs 38388926539 y 38389011007; frontend PASS en ambos.
- Backend FAIL por setup-java `21.0.12.1+1`; Compose FAIL por carpeta public vacía.
- [REV-001](docs/trazabilidad/REV-001-revision-independiente-01.md): R-01–R-04 originales.

## AG-009 — correcciones y comprobación local

- [Informe AG-009](docs/trazabilidad/AG-009-informe.md); inicio 14:42:45 +02:00, 2026-10-13.
- Cierre y duración: `qa/evidencias/ag009/cierre.json`; límite orientativo 15:57:45.
- setup-java usa `21.0.12.1`; Dockerfile sin COPY public; directorio vacío eliminado.
- CI por PR y push solo main; salidas nuevas por job sin subir AG históricas.
- QA_EVIDENCE_DIR o tmp/evidencias/local; baseline solo lectura; históricos protegidos.
- Puerto: parámetro > entorno > archivo elegido > 18080; BASE_URL única para navegador.
- Verify íntegro PASS: 13 backend, Spotless, SpotBugs; 11 Angular y controles/build PASS.
- Docker sin caché PASS; Compose real 18080 y 18081, 5 E2E en cada puerto PASS.
- Persistencia/503/200 PASS; tres servicios detenidos, volumen conservado y .env temporal retirado.
- Actionlint/YAML/scripts PASS; incidencias auxiliares y repeticiones registradas.
- 187 históricos intactos; POM, lockfile, requisitos y configuración funcional sin cambios.
- OSV repetido con base previa; npm conserva auditorías históricas y sus límites.
- Revisor distinto del escritor: dos observaciones resueltas; sin hallazgos técnicos abiertos.
- Solo lectura del revisor por instrucción; workspace-write, sin prueba de escritura.
- Cierre documental/control final por sesión principal. REV-001 original intacta.
- Ningún comando Git ejecutado; ningún commit, push, integración ni despliegue.

## Siguiente paso humano

- Revisar informe, [validación](especificaciones/001-base-verificable/validacion.md) y manifiestos AG-009.
- Segunda CI pendiente del siguiente push humano; revisar resultados y artefactos.
- 001 verificada localmente con límites declarados; todavía no aceptada ni integrada.
- Trabajo autorizado concluido; esperar decisión humana, sin reanudación automática.
