# ADR-0001 — Dependencia transitiva Rolldown en Angular 21

**Estado:** Aprobado
**Fecha:** 2026-10-13
**Origen:** decisión humana expresa recibida para reanudar T001 en AG-005.
**Ámbito:** exclusivamente 001-base-verificable; no modifica requisitos funcionales.

## Contexto y problema

El constructor oficial estable `@angular/build@21.2.26` fija
`rolldown@1.0.0-rc.4`. Rolldown es una dependencia directa del constructor y
transitiva de la aplicación: es una herramienta de construcción, no una
dependencia funcional que la aplicación deba importar directamente.

AG-004 comprobó que las 40 versiones estables de `@angular/build` 21.x
consultadas declaraban dependencias preliminares. La prohibición general
del plan bloqueó correctamente esa selección antes de generar código.
El [informe de versiones](../documentaciondev/versiones.md) conserva la evidencia.

## Opciones consideradas

| Opción | Decisión y motivo |
|---|---|
| Abandonar Angular 21 | Rechazada: cambia la solución aprobada. |
| Cambiar de versión mayor | Rechazada: queda fuera de la línea autorizada. |
| Forzar otra versión de Rolldown mediante override | Rechazada: sustituye la combinación fijada por Angular por otra no comprobada. |
| Aceptar de forma limitada la cadena oficial fijada por Angular | Aprobada expresamente con los controles y límites siguientes. |

## Decisión exacta

Se autoriza únicamente `@angular/build@21.2.26 → rolldown@1.0.0-rc.4`.
También se permiten los subpaquetes oficiales `@rolldown/*` o bindings de
plataforma que Rolldown 1.0.0-rc.4 requiera automáticamente, pertenezcan a su
misma familia de publicación y no se añadan manualmente al proyecto.

No se autoriza añadir Rolldown directamente a `package.json`, importarlo como
dependencia funcional, usar `overrides` o `resolutions`, elegir otras versiones
alpha/beta/rc/next/snapshot/canary ni admitir otra dependencia preliminar ajena
a esta cadena. Cualquier otra excepción requiere nueva aprobación humana.
Se mantiene Angular 21, Node 24.13.0, TypeScript 5.9 compatible y las demás
líneas aprobadas; una incompatibilidad real se documentará antes de decidir.

## Motivo

Se mantiene la línea aprobada y la cadena publicada por sus autores, sin
inventar una sustitución interna de Angular. La excepción es concreta y
transitiva; no convierte en general la autorización de versiones preliminares.

## Controles obligatorios

- Consultar versión, dependencia, integridad, licencia y repositorio en npm oficial antes de instalar.
- Elegir dependencias directas estables y exactas; conservar `package-lock.json` e integridades.
- Comprobar procedencia y que Rolldown llega exclusivamente por la cadena autorizada con `npm explain rolldown` y `npm ls @angular/build rolldown --all`.
- Examinar todas las versiones preliminares del lockfile, incluidos bindings y paquetes opcionales.
- Ejecutar `npm audit --audit-level=high` y registrar todos los hallazgos, también medios y bajos.
- Comprobar build, pruebas y reproducción de instalación con `npm ci`.
- No usar `--force`, `--legacy-peer-deps`, `latest`, desactivación de integridad, `overrides`, `resolutions` ni `npm audit fix --force`.

No se ha dado por superado ningún control por aprobar este ADR. La ejecución
y sus resultados se registrarán en versiones, validación cuando corresponda
y el [CSV de ejecuciones](../trazabilidad/ejecuciones-agentes.csv).

## Riesgo restante y parada

Una etiqueta rc implica menor garantía de estabilidad semántica que una
versión final, aunque forme parte de una publicación Angular estable.
La procedencia oficial no sustituye auditorías ni pruebas.

Se detendrá ante vulnerabilidad alta o crítica aplicable a esta cadena,
integridad incorrecta, incompatibilidad, necesidad de override, fallo
reproducible de build/pruebas causado por la dependencia, imposibilidad de
reproducir con `npm ci` u otra dependencia preliminar no autorizada.
Los demás controles obligatorios y reglas de parada del encargo permanecen
vigentes: no se ocultan fallos ni se amplían permisos o alcance para evitarlos.

## Revisión futura

Revisar esta decisión cuando se actualice la línea Angular aprobada.
La excepción no se extiende automáticamente a otra versión del constructor
ni de Rolldown. Su eliminación o sustitución requerirá evidencia y decisión.

El [plan de 001](../../especificaciones/001-base-verificable/plan.md) incorpora
esta excepción. AG-005 conserva el límite original de cierre del 13 de octubre
de 2026 a las 12:30:55, hora de Madrid; la reanudación no añade diez horas.

## Continuidad AG-006

El contenido anterior se conserva como decisión e historia de AG-005.
La instrucción humana de AG-006 aprueba la política general de
[ADR-0002](ADR-0002-politica-dependencias-transitivas.md), que sustituye la
prohibición de otras transitivas preliminares y sus reglas de parada.
Se mantienen las directas estables, la cadena oficial y todos los controles.
AG-006 tiene una nueva ventana propia: 10:16:08–20:16:08 +02:00 del 2026-10-13.
