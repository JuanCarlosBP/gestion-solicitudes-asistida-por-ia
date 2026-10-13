# MEMORY.md — Gestión de Solicitudes

Memoria breve del estado real; no sustituye requisitos, decisiones ni Git.

## Estado actual

- P0 completada; G02-B aprobado; P1 preparado para cierre Git humano.
- G01 publicado: `4f7eac858fa21b77d0f1184828fb4f2da2f072f7`.
- La referencia procede del trabajo anterior; remoto no consultado en esta consolidación.
- Visión, constitución, seguridad, amenazas, OWASP y calidad mantienen su aprobación.
- CAM-001 cerrado documentalmente; SEG-001 a SEG-028 conservan destinos.
- CAM-002 aprobado: proyecto único y fases definitivas P0–P6.
- G02-A aprobado: presentación, índice, mapa y política documental.
- G02-B aprobado: CONTRIBUTING, SECURITY y fuentes.
- P2 aprobado documentalmente el 2026-10-13.
- Aprobados SDD, contexto, orquestación, eficiencia, MCP, relevo y prompts.
- Configuración local, tres roles y cuatro skills aprobados y descubiertos.
- Codex CLI comprobado: 0.153.4; TOML reconocido por la CLI.
- Proyecto: sandbox `workspace-write` y aprobación predeterminada `on-request`.
- `multi_agent` y `goals` habilitados; máximo de tres subagentes configurado.
- Sesión observada: `workspace-write`, red restringida y escalaciones con revisión automática.
- Roles visibles: planificador, implementador y revisor.
- Skills visibles: sdd, revision-seguridad, verificacion-qa y mantenimiento-documental.
- MCP `openaiDeveloperDocs` operativo: búsqueda y lectura reales comprobadas.
- 001 aprobado para implementación: especificación, plan, tareas y DT-01 a DT-08.
- T001 fijará parches compatibles de las líneas aprobadas, sin preliminares ni latest.
- Prompt nocturno aprobado para lanzamiento humano tras preflight bloqueante.
- Máximo diez horas; implementación limitada a 001 y borradores posteriores solo de especificación.
- Fallback aprobado: roles personalizados, agentes incorporados o ejecución secuencial.
- No existe todavía código funcional nuevo, pruebas de aplicación, CI ni despliegue.
- No se crearon validación de 001 ni borradores 002–008.
- No se implementó 001 ni se inició o programó la sesión nocturna.

## Evidencia y pendientes operativos

- Delegación real e inicio de cada rol pendientes del preflight y tarea autorizada.
- Permisos efectivos de planificador, implementador y revisor aún sin comprobar.
- Invocaciones explícitas de $sdd y $mantenimiento-documental pendientes del preflight.
- Lectura/aplicación manual de skills no acredita invocación explícita.
- /debug-config llegó como texto; no ejecutó el diagnóstico nativo y no bloquea 001.
- Avisos de temporales solo bloquean si impiden una operación necesaria.
- Diagnósticos anteriores tuvieron límites de SQLite, sandbox, terminal y red.
- No se demostró corrupción ni se reparó configuración global.
- El fallo previo de quick_validate por PyYAML no demuestra un fallo de invocación.
- MCP no es bloqueante si las versiones se fijan con otras fuentes oficiales accesibles.
- Recursos, dependencias, Docker daemon, disco y permisos se comprobarán en el preflight.
- Evidencias y límites: docs/metodologia/mcp.md y registro de ejecuciones AG-002.
- Esta consolidación no ejecutó Git, no instaló herramientas ni ejecutó pruebas de aplicación.

## Siguiente acción

- La persona responsable revisa Git y prepara dos commits/pushes humanos.
- Commit 1: cierre G02/P1; commit 2: P2 y paquete 001/nocturno.
- Separar bloques compartidos para no enlazar documentos ausentes en el primer commit.
- Comprobar remotos y lanzar expresamente la sesión nocturna.
- La sesión registra preflight, permisos efectivos, red y nivel agéntico utilizado.
- Si falla una comprobación bloqueante, no comienza T001: registra y se detiene.
- Si falla una capacidad opcional del arnés, aplica fallback sin reducir requisitos ni pruebas.
