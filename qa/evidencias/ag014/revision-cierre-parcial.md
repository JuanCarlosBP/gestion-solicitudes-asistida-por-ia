# Revisión independiente — cierre parcial AG-014

Revisor: subagente revision_007, rol revisor. Acta transcrita por el coordinador
del resultado emitido el 2026-10-15, Europe/Madrid. Revisión de lectura por
instrucciones, sin afirmar aislamiento técnico. Sin Git, pruebas ni escrituras
por parte del revisor; no constituye aceptación humana.

## Dictamen y alcance

No se identificaron defectos altos o bloqueantes en el código inspeccionado.
007 permanece parcialmente verificada. Las pruebas integradas pendientes impiden
cerrar HA-01 a HA-10 y no se sustituyen por este dictamen.

Se comprobaron 27 huellas frontend, 128 backend y 283 fuentes, además de 1454
archivos protegidos intactos y dependencias sin cambios. Las cifras corresponden
al manifiesto inspeccionado antes de añadir esta acta y el cierre documental.

## Observaciones

- Resuelta, baja, HA-06/08: precisión de fechas y límite de paginación del cliente.
  Corrección inspeccionada, 59 pruebas enfocadas y 476 Angular posteriores PASS.
- Pendiente de cobertura, HA-01/03/09: frontend/e2e/historial.spec.ts solo comprueba
  la decisión anterior con E2E_HISTORIAL_ANTERIOR_DECISION=true. La configuración
  CI predeterminada usa fixture artificial y no activa esa condición. Sus pruebas
  no acreditarán la conservación de decisiones anteriores en navegador. La
  validación local debe usar un recurso del volumen ficticio V6 y activar la
  condición; informe, validación y entorno registran esta limitación.

## Matriz inspeccionada

| ID | Evidencia revisada | Pendiente |
|---|---|---|
| HA-01 | Sin backfill; aviso anterior independiente de filtros. | Evolución real. |
| HA-02 | Transacción, replay y no-op coherentes en código. | Rollback real. |
| HA-03 | Proyección V5 mínima, claves y orden estables. | PostgreSQL y decisión anterior en navegador. |
| HA-04 | DTO mínimo y escape Angular. | Privacidad integrada. |
| HA-05 | Roles vigentes, visibilidad y unión de permisos. | Negativos HTTP. |
| HA-06 | 23 pruebas backend y filtros Angular. | SQL concurrente y mediciones. |
| HA-07 | Agregación autorizada y cliente con dobles. | Datos reales del entorno ficticio. |
| HA-08 | 476 Angular, tipos/lint/formato/build. | Navegador, capturas y contraste. |
| HA-09 | 13 IT escritas y compiladas. | Ejecución PostgreSQL. |
| HA-10 | Evidencias parciales coherentes. | verify, Docker/Compose/API/E2E y CI007. |

## Evidencias leídas y correspondencia

Los logs acreditan 122 unitarias sin fallos, análisis posterior SpotBugs con cero
avisos y empaquetado. package-04 omite pruebas: no se le atribuyen las 122.
Tras las unitarias solo cambiaron exclusiones estrictas SpotBugs, anotaciones
OpenAPI y formato, según aclaración del implementador; package-04 las compila.
El contrato OpenAPI generado en ejecución permanece pendiente.

OSV: cero vulnerabilidades listadas para 132 componentes Maven, 7 npm de
producción y 653 npm completos. No sustituye npm audit.

## Adenda de correspondencia final05

El revisor leyó backend-unitarias-estatico-final-05.log,
backend-resumen-final-05.json y backend-fuentes-final-05.csv. Confirmó 122 pruebas
superadas, cero fallos/errores/omitidas, Spotless PASS, SpotBugs cero avisos y
BUILD SUCCESS, finalizado a 2026-10-15T20:39:30+02:00. El resumen identifica
comando/entorno y ausencia de cambios respecto a las huellas cotejadas; el CSV
contiene 128 rutas únicas con SHA256 válidos.

Queda resuelta la correspondencia posterior a las anotaciones OpenAPI. Sin nueva
objeción. Permanecen pendientes PostgreSQL, 13 IT nuevas, regresión IT, verify
completo y OpenAPI en ejecución. Se mantiene el cierre parcial y la observación
sobre fixture V5. Esta adenda tampoco implicó pruebas, Git ni escrituras del revisor.
