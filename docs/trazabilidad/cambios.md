# Registro de cambios y decisiones documentales

**Versión:** 1.0
**Estado:** Aprobada

Este documento registra cambios importantes de requisitos,
políticas y decisiones documentales.

Git mostrará qué cambió en los archivos.

Este documento explica además por qué se tomó una decisión
cuando esa explicación sea importante.

## CAM-001 — Revisión inicial de seguridad

**Origen:** revisión inicial de `docs/seguridad.md`.

**Estado de CAM-001:** Cerrado
**Cierre versionado en:** G01 — `4f7eac858fa21b77d0f1184828fb4f2da2f072f7`

**Ruta histórica del informe original, eliminado antes de G01:**
`docs/evidencias/001-revision-seguridad/informe.md`

El informe encontró aspectos que debían añadirse,
completarse o decidirse.

Aquí registramos qué hacemos con cada uno.

| ID | Tema detectado | Decisión | Dónde se resolverá |
|---|---|---|---|
| SEG-001 | Permisos por acción y recurso | Incorporar | Seguridad + especificaciones + QA |
| SEG-002 | Duración y finalización de acceso | Incorporar cuando decidamos autenticación | ADR + documentación técnica |
| SEG-003 | Protección de sesión o tokens | Incorporar cuando decidamos autenticación | ADR + seguridad técnica + QA |
| SEG-004 | Seguridad de la demo | Incorporar | Modelo de amenazas + spec demo |
| SEG-005 | CSRF y CORS | Incorporar según la arquitectura elegida | Seguridad + OWASP + ADR |
| SEG-006 | SQL Injection | Incorporar | Seguridad + OWASP + QA |
| SEG-007 | XSS | Incorporar | Seguridad + OWASP + QA |
| SEG-008 | Reglas de aprobación | Incorporar | Especificaciones de solicitudes y aprobaciones |
| SEG-009 | Cambios simultáneos | Incorporar | Seguridad + especificaciones + concurrencia |
| SEG-010 | Repetición de operaciones | Incorporar | Especificaciones + idempotencia + QA |
| SEG-011 | Exactitud de importes | Incorporar | Especificaciones + modelo de datos + QA |
| SEG-012 | Fallar de forma segura | Incorporar | Seguridad + calidad + OWASP |
| SEG-013 | Control de datos recibidos | Incorporar | Especificaciones + OpenAPI + QA |
| SEG-014 | Abuso de recursos | Incorporar | Seguridad + amenazas + QA |
| SEG-015 | Gestión y recuperación de cuentas | Decidir cuando exista esa función | Spec de identidad |
| SEG-016 | Contraseñas | Incorporar | Seguridad |
| SEG-017 | HTTPS completo | Incorporar | Seguridad + despliegue |
| SEG-018 | Gestión de secretos | Incorporar | Seguridad + operación |
| SEG-019 | Permisos mínimos | Incorporar | Seguridad + infraestructura |
| SEG-020 | Herramientas técnicas expuestas | Incorporar | Seguridad + demo |
| SEG-021 | Dependencias | Incorporar | Seguridad + calidad |
| SEG-022 | Integridad de publicación | Incorporar | CI/CD + calidad + OWASP |
| SEG-023 | Historial de negocio | Incorporar | Spec historial + auditoría |
| SEG-024 | Logs de seguridad | Incorporar | Seguridad + QA |
| SEG-025 | Alertas | Incorporar con un alcance adecuado al proyecto | Operación + OWASP |
| SEG-026 | Recuperación | Incorporar | Seguridad + calidad + operación |
| SEG-027 | Conservación y caché de datos | Incorporar | Amenazas + seguridad técnica |
| SEG-028 | ASVS y MFA | Incorporar donde corresponda | OWASP + QA; MFA queda pendiente de decisión |

## Decisiones que salen de esta revisión

- Cada regla tendrá un documento principal donde se defina.
- Evitaremos copiar la misma regla completa en muchos archivos.
- La forma concreta de autenticación se decidirá mediante un ADR antes de programarla.
- No supondremos que existe recuperación de contraseña mientras no se apruebe esa función.
- No diremos que existe MFA mientras no se haya diseñado, implementado y probado.
- Aplicaremos únicamente los controles ASVS que realmente correspondan.
- Una prueba no ejecutada nunca se marcará como superada.

## Retirada del informe original

El informe original fue una evidencia temporal de trabajo utilizada antes
de establecer la primera línea base Git.

Sus 28 observaciones fueron revisadas y sus resultados se trasladaron a
documentación permanente. La política de seguridad, el modelo de amenazas,
la cobertura OWASP, la política de calidad y esta conciliación fueron aprobados.

El informe temporal se eliminó del árbol del proyecto antes del primer commit.
Esta conciliación conserva las decisiones y los destinos de sus 28 observaciones.

## Cierre de CAM-001

Se cumplieron las condiciones de cierre documental:

- política de seguridad, modelo de amenazas y cobertura OWASP aprobados;
- política de calidad aprobada;
- los 28 puntos SEG tienen una decisión y un destino;
- informe temporal retirado antes de G01, con su retirada documentada;
- conciliación incluida en el cierre versionado indicado arriba.

El cierre documental no significa que los controles estén implementados
ni que se hayan ejecutado sus pruebas. Eso se comprobará en cada incremento.

## CAM-002 — Proyecto único y eliminación de la fase comparativa

**Estado de CAM-002:** Decisión aprobada por instrucción humana.
**Fecha de la decisión registrada:** 2026-10-13.
**Versionado de esta actualización:** Pendiente de las operaciones Git del usuario.

Se concentra todo el alcance en un único producto y repositorio.
P0–P6 pasan a ser las fases definitivas del proyecto.
Se retira la antigua fase comparativa y se conserva aquí la decisión de eliminarla.

No se reduce ninguna funcionalidad, prueba, documentación o control.
Solo se elimina el desarrollo comparativo que se había previsto.
La decisión afecta al mapa, al índice, a la memoria y a las referencias al proceso.
G02-A y G02-B siguen siendo subdivisiones operativas de G02 dentro de P1.
