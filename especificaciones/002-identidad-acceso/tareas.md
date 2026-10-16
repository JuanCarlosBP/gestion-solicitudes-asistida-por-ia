# Tareas — 002 Identidad y acceso

**Estado:** Aprobadas por decisión humana AG-010.
**Autorización:** orden integral AG-010; ejecución sin nueva aprobación documental.

| ID | Requisitos | Trabajo y aceptación | Dependencia | Escritor | Estado observado AG-010 |
|---|---|---|---|---|---|
| IA-T01 | IA-14 | Precondición en veinte minutos, inicio/límite y huellas históricas | ninguna | coordinador | verificada; precondicion.json |
| IA-T02 | IA-01–14 | Especificación, plan, tareas y ADR coherentes con orden humana | IA-T01 | coordinador | creada; aprobaciones humanas preservadas |
| IA-T03 | IA-01–09, IA-11 | V2, dominio, JDBC, transacciones, contraseñas, sesiones y JWT | IA-T02 | implementador backend | implementada; PASS |
| IA-T04 | IA-04–12 | HTTP, seguridad, CSRF, cookies, default deny y contrato OpenAPI | IA-T03 | implementador backend | implementada; PASS |
| IA-T05 | IA-01–12 | Unitarias, HTTP y PostgreSQL incluyendo concurrencia y regresión 001 | IA-T03–04 | implementador backend | verify íntegro PASS 55/55 |
| IA-T06 | IA-13 | Servicio/store/interceptor/guard, rutas, formulario y navegación | contrato IA-T02 | implementador frontend | implementada; PASS |
| IA-T07 | IA-13 | Pruebas Angular y E2E 001/002, accesibilidad y almacenamiento | IA-T06 | implementador frontend | PASS 56 Angular y 8 E2E |
| IA-T08 | IA-03, IA-07–14 | Compose local, ejemplos, Docker limpio, integración y regresión conjunta | IA-T04/06 | coordinador | PASS builds, salud/persistencia, 88 controles de sesión |
| IA-T09 | IA-14 | CI, auditorías, documentación, enlaces, secretos, huellas y manifiesto | IA-T05/07/08 | coordinador | PASS local; CI remota pendiente del push humano |
| IA-T10 | IA-01–14 | Revisión separada, correcciones verificadas y cierre real | IA-T09 | revisor sin escritura; correcciones al escritor | dos hallazgos corregidos; revisión independiente sin nuevos bloqueantes; controles finales en evidencia |

## Propiedad de archivos

Coordinador: especificaciones, docs, README, MEMORY, infraestructura, `.github`,
`qa` y evidencias generales AG-010. También ejecuta la integración conjunta.
Backend: `backend/**`, pruebas y evidencias con prefijo backend en AG-010.
Frontend: `frontend/**`, pruebas y evidencias con prefijo frontend en AG-010.
No hay escritores simultáneos de un mismo archivo ni histórico autorizado.
Todo relevo conserva contrato, pruebas reales, fallos, intentos de corrección y pendientes.

## Comprobaciones para completar

- IA-T01: herramientas, verify 001, npm ci/build, Compose, documentos y huellas.
- IA-T03–05: todos los casos backend de la especificación; `mvnw verify` íntegro.
- IA-T06–07: tipos, lint, formato, tests y build; E2E de acceso/restauración/cierre.
- IA-T08: Docker sin caché; Compose, salud 200/503/recuperación, Swagger y E2E completos.
- IA-T09: auditorías npm/Maven, actionlint, documentación y búsqueda acotada,
  historial intacto y manifiesto por SHA-256, sin confundir pasado con evidencia actual.
- IA-T10: revisión por otro agente disponible, hallazgos clasificados y comprobados;
  aceptación e integración siempre pendientes de la persona responsable.

No se completa una tarea por intención. [Validación](validacion.md) conservará
comandos, resultado observado, evidencia y criterios todavía pendientes.
Máximo dos correcciones por defecto; no reiniciar el contador cambiando de agente.
Al terminar actualizar MEMORY y detenerse. No ejecutar Git.
