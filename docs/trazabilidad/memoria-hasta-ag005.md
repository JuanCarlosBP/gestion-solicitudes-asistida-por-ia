# MEMORY.md — Gestión de Solicitudes

Memoria breve del estado real; no sustituye requisitos, decisiones ni Git.

## Estado actual

- P0 completada; G02-A, G02-B y P2 aprobados documentalmente.
- G01 publicado según memoria anterior: `4f7eac858fa21b77d0f1184828fb4f2da2f072f7`.
- Visión, constitución, seguridad, amenazas, OWASP y calidad mantienen su aprobación.
- CAM-001 cerrado documentalmente; SEG-001 a SEG-028 conservan destinos.
- CAM-002 aprobado: proyecto único y fases definitivas P0–P6.
- Aprobados SDD, contexto, orquestación, eficiencia, MCP, relevo y prompts.
- 001: especificación, plan, tareas y DT-01 a DT-08 aprobados el 2026-10-13.
- La persona responsable declara creada y publicada `feature/001-base-verificable`.
- Rama, commits y remoto no consultados: prohibición expresa de toda operación Git.
- Sesión nocturna iniciada por orden humana el 2026-10-13 a las 02:18:35 +02:00.
- Límite autorizado: 2026-10-13 a las 12:18:35 +02:00; parada anticipada por A6.
- Preflight bloqueado: Docker deniega acceso a `dockerDesktopLinuxEngine`.
- T001 no iniciada; T002–T008 pendientes. No se generó código de aplicación.
- No existen validación de 001, pruebas de aplicación, CI ni borradores 002–008.

## Evidencia y límites de la sesión

- Registro durable: `docs/trazabilidad/ejecuciones-agentes.csv`, ejecución AG-003.
- Ruta exacta confirmada; inventario previo de 40 archivos con SHA-256, sin aplicación.
- Java/javac Temurin 21.0.12.1; Node 24.13.0; npm 11.6.2.
- Docker CLI 29.1.3; Compose v2.40.3-desktop.1.
- `docker info --format '{{json .ServerVersion}}'`: servidor vacío y permiso denegado.
- Un intento de acceso al motor; cero correcciones, instalaciones o escalaciones.
- Disco C: 309,37 GiB libres; estimación 30 GiB para dependencias, imágenes y builds.
- La capacidad interna del motor no se verificó al fallar el acceso.
- Acceso a dependencias oficiales no ejecutado por parada; versiones aún sin fijar.
- No se necesitan secretos reales: el alcance aprobado utiliza datos ficticios locales.
- Sandbox efectivo `workspace-write`; aprobación `auto_review`; red restringida.
- Solo se escriben MEMORY y el CSV dentro del workspace autorizado.
- B1–B5 no ejecutados: el grupo A no pasó. No se iniciaron subagentes.
- No se aplicó fallback agéntico: A6 es un recurso bloqueante, no una capacidad opcional.
- Roles visibles; permisos efectivos e invocaciones nativas siguen pendientes.
- Skill mantenimiento-documental aplicada manualmente al cierre; no acredita B4.
- MCP comprobado en sesiones previas; disponibilidad actual no probada en este preflight.
- Revisión del cierre por la misma sesión, sin independencia.
- No se ejecutó Git, pruebas de aplicación, CI remota ni despliegue.
- README e índices no actualizados por el límite expreso de escritura del cierre.

## Siguiente acción

- La persona responsable debe habilitar el acceso de esta sesión al motor Docker.
- Tras resolver el bloqueo y autorizar otro lanzamiento, repetir el preflight completo.
- Mantener T001–T008 pendientes hasta superar A y realizar B con el fallback aprobado.
- Revisar MEMORY y AG-003; commit sugerido: `docs: registrar bloqueo del preflight nocturno 001`.
- Detenido a la espera de revisión humana; sin continuación ni ejecución programada.

## Reanudación AG-004 — estado vigente

Los apartados anteriores conservan íntegro el cierre histórico de AG-003.
- Inicio real: 2026-10-13 02:30:55 +02:00; límite original: 12:30:55 +02:00.
- Huellas iniciales: 40 archivos; solo MEMORY, CSV y .codex/config.toml diferían.
- A1–A10 PASS; A6 pasó con escalación Docker específica tras permiso denegado.
- Client/Engine 29.1.3; Desktop 4.55.0; Compose 2.40.3; servidor Linux operativo.
- Fuentes oficiales accesibles tras escalación HTTPS; host 309,38 GiB libres.
- B1/B3 sin aislamiento read-only; B2/B4 sin invocación nativa; fallback nivel 3.
- B5 PASS real; sandbox workspace-write/auto_review, red restringida; sin Full Access.
- T001 bloqueada: las 40 versiones estables de @angular/build 21.x consultadas
  declaran dependencias preliminares; 21.2.26 fija rolldown 1.0.0-rc.4.
- Evidencia y candidatos sin fijación final: docs/documentaciondev/versiones.md.
- Hace falta decidir una excepción concreta o revisar la construcción; plan intacto.
- T002–T008 no iniciadas; sin código, instalaciones, pruebas de aplicación, CI o Git.
- AG-003 y el contenido previo de MEMORY/CSV se conservan byte a byte.
- Cierre documental revisado por la misma sesión; no es revisión independiente.
- Detenido para decisión humana, sin continuación programada. Hora final en AG-004.

## AG-005 — reanudación autorizada, estado vigente

- Inicio observado 2026-10-13 02:47:42 +02:00; límite fijo 12:30:55 +02:00.
- Docker y A1–A10 verificados en AG-004; evidencia heredada, sin repetirla todavía.
- AG-004 se bloqueó correctamente en T001; su registro permanece íntegro.
- Excepción humana aprobada: @angular/build 21.2.26 → rolldown 1.0.0-rc.4,
  solo con subpaquetes/bindings oficiales automáticos de esa misma publicación.
- ADR-0001 aprobado y plan actualizado antes de generar código.
- Node 24.13.0 se conserva; sin Rolldown directo, overrides u otros preliminares.
- AG-005 en curso; todavía no existe código funcional ni se ejecutó Git.
- Pendientes: consultas npm, selección, cadena, integridad, auditoría, npm ci y QA.
- Se conserva íntegro todo el contenido anterior; siguiente estado en AG-005.

## Cierre AG-005 — estado vigente

- T001 bloqueada al resolver lockfile: gensync 1.0.0-beta.2 no está autorizada.
- Ruta: Angular build 21.2.26 y compiler-cli 21.2.25 → Babel 7.29.7 → gensync.
- ADR-0001 sigue aprobado para Rolldown exclusivamente; no se amplió la excepción.
- Siete consultas npm PASS; lockfile resuelto, 689 paquetes; control de preliminares FALLÓ.
- Rolldown rc.4 solo por build; pluginutils y 13 bindings rc.4 permitidos.
- Frontend contiene solo package.json, package-lock.json y .npmrc; sin node_modules.
- Auditoría, npm explain/ls, npm ci, builds y pruebas NO EJECUTADOS por parada previa.
- T002–T008 no iniciadas; validacion.md parcial creada con resultados reales.
- No hubo código funcional, instalación global, Git, CI, despliegue ni Full Access.
- AG-003/004 y todo el contenido previo de MEMORY/CSV/versiones permanecen íntegros.
- Decisión humana pendiente sobre gensync; límite sin ampliar: 12:30:55 +02:00.
- Informe, versiones y manifiesto en docs/documentaciondev/versiones.md; hora final en AG-005.
- Detenido sin continuación programada; revisión del cierre no independiente.
