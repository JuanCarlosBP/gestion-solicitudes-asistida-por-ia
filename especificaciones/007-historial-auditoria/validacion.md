# Validación — 007 Historial y auditoría

**Estado:** Corrección AG-015 verificada localmente; publicación y nueva CI pendientes.
Autorización AG-014 y D-007-01–10. Sin aceptación, integración ni despliegue.
Fuentes: [especificación](especificacion.md), [plan](plan.md), [tareas](tareas.md)
e [informe AG-014](../../docs/trazabilidad/AG-014-informe.md).

## Corrección vigente AG-015

La primera CI de007 (run38814632990, job116696095705, revisión5e4024997215c23e24c3f648f0f53d8f68652e65)
falló con32/33 E2E: la carrera AP-05/08 recibió[200,403] en vez de[200,409].
Sus diez recorridos de historial pasaron. Documentación/secretos y sintaxis/actionlint
quedaron omitidos remotamente. No se presentan como controles remotos superados.

El [informe AG-015](../../docs/trazabilidad/AG-015-informe.md) demuestra localmente
la carrera CSRF entre respuestas Bearer y conserva evidencia antes/después.
La corrección mantiene comparación CSRF estricta, permisos y refresh; rota XSRF
en login/logout reales y conserva su valor al validar el Bearer de la misma sesión.
La prueba original no cambia: diez repeticiones PASS, datos aislados y retries0;
Windows33/33 y Linux complementario24/24, incluidas las diez pruebas007.
Backend249 (122unitarias+127IT), Angular479, tipos/lint/formato/build y API636 PASS.
El primer E2E Windows31/33 y su incidente de aislamiento se conservan y explican.

API636=492heredados+144historial usa el fixture sintético del workflow.
AG-014639=492+147 cubre además datos anteriores migrados V6→V7;
esa migración no se repitió en AG-015 ni se equipara a la variante sintética.
La evidencia histórica sigue aplicándose a las migraciones y fuentes sin cambios,
con comprobación de huellas. Linux complementario excluye operaciones.spec.ts
(nueve casos, tres con acceso a Docker): se ejecutaron todos en la suite Windows33.

La revisión final, controles documentales, preservación y manifiesto se enlazan en
el informe AG-015. No se declara007 aceptado o integrado. El resto de este documento
conserva los resultados históricos AG-014 y sus límites, no resultados de la CI actual.

## Trazabilidad

Primer reloj observado2026-10-15T20:09:15+02:00 tras las lecturas iniciales;
límite conservador2026-10-16T04:05:00+02:00, Europe/Madrid.
[Cierre parcial](../../qa/evidencias/ag014/cierre.json) a20:42:08 y reanudación
humana a21:43:51. Los documentos parciales, fallos y evidencias anteriores se conservan.
Docker reparado por el usuario; npm audit autorizado expresamente al registro oficial.
No reparación del socket por el agente, reset, eliminación de recursos ni datos reales.

Rama confirmada leyendo .git/HEAD. Desviación: git status --short al comienzo,
antes de leer la prohibición adjunta, salida vacía. Ningún comando Git posterior
ni escritura Git. No se presenta como una sesión sin ningún comando Git.

## Criterios

| ID | Ejecutado y observado | Estado local |
|---|---|---|
| HA-01 — Fuentes reales | Copia ficticia V6→V7: siete tablas/columnas/huellas y checksums anteriores intactos; V7 vacía tras migración. Aviso de historia desconocida y datos V5 originales. Original V6 revalidado sin cambios. | PASS, incluido navegador final. |
| HA-02 — Atomicidad | Siete acciones; fallo de inserción revierte negocio/evento/resultado idempotente. Replay/no-op sin evento extra. Carreras con igual/distinta clave y reintentos. | PASS. |
| HA-03 — Decisiones V5 | Decisiones anteriores/nuevas solo desde V5, una vez, clave prefijada estable y orden común con eventos V7. Replay y privilegios probados. | PASS, incluido navegador final. |
| HA-04 — Privacidad | Proyección/DTO cerrados; respuestas/BD/logs y textos de prueba privados comprobados. No contactos/fiscal, cuerpos, secretos, comentarios ni motivos en historial; detalle V5 autorizado conserva texto. | PASS, cobertura acotada. |
| HA-05 — Permisos | Identidad y roles vigentes, revocación con JWT previo, unión multirrol,404 ajeno/inexistente,403 global,401 anónimo; supervisor sin borradores ajenos, proveedor solo auditor/admin. | PASS. |
| HA-06 — Consulta |23 unitarias de filtros más IT/API: UUID/ISO/rangos, duplicados/desconocidos, page/size/offset, count visible, empates/orden y consulta parametrizada; medición real local. | PASS, sin SLA. |
| HA-07 — Resumen | Contadores contra PostgreSQL por perfil y acciones pendientes propias; UI conectada a datos reales, sin métricas inventadas. | PASS. |
| HA-08 — Angular |479 pruebas; tipos/lint/formato/build;33 E2E finales sin reintentos;12 capturas revisadas,42 muestras de contraste (mínimo5,53:1), teclado y foco3px en360/768/1440. | PASS, accesibilidad acotada. |
| HA-09 — PostgreSQL/negativos |125 IT reales, incluidas13 nuevas: migración, checksums, restricciones, SELECT/INSERT y denegación UPDATE/DELETE, rollback, carreras y reinicio; Compose conserva datos. | PASS. |
| HA-10 — QA/CI/documentos | Verify247, API639, E2E33, auditorías OSV/npm, imágenes sin caché, OpenAPI, controles estáticos/documentales y revisión independiente. | PASS local. CI remota humana pendiente. |

## Evidencias ejecutadas

- [Backend completo](../../qa/evidencias/ag014/reanudacion/backend-resumen-final.json):
  122 unitarias +125 IT =247,22 suites,0 fallos/errores/omitidas, Spotless PASS y SpotBugs0.
  [Detalle y límites](../../qa/evidencias/ag014/reanudacion/backend-resultados-finales.md).
  No se sustituyó PostgreSQL por base en memoria. 13 IT enfocadas también PASS.
- [Angular y E2E](../../qa/evidencias/ag014/reanudacion/frontend):479 pruebas/23 archivos;
  fuentes y reportes separados por intento. Diez recorridos007 integrados en33 totales,
  con retries0. E2E05 final33 PASS/0 omitidas/55,4s. E2E04 pasó, pero se corrigió además un defecto de contraste detectado en la revisión visual. Todos los intentos se conservan.
- [API007](../../qa/evidencias/ag014/reanudacion/api007-01/historial-api.json):147 controles.
  [Regresión001–006](../../qa/evidencias/ag014/reanudacion/api-regresion-01):492 controles
  (sesiones88/proveedores78/solicitudes119/aprobaciones140/concurrencia67), todos PASS.
- [EvoluciónV7](../../qa/evidencias/ag014/reanudacion/evolucion-v7),
  [igualdad de copia](../../qa/evidencias/ag014/reanudacion/restauracion-v6/verificacion-copia.json)
  y [original conservado](../../qa/evidencias/ag014/reanudacion/original-v6-salida/verificacion-original.json).
- [Compose](../../qa/evidencias/ag014/reanudacion/compose-salud-01/compose-persistencia-caida.json):
  persistencia real,503 en2025ms al parar PostgreSQL, recuperación200 y ambos estados en navegador.
- [OpenAPI generado](../../qa/evidencias/ag014/reanudacion/openapi007-control.json):
  versión3.1.0,21 rutas, cuatro nuevos GET; comprobado sobre aplicación arrancada.
- [npm producción](../../qa/evidencias/ag014/reanudacion/frontend/npm-audit-produccion.json)
  y [npm completo](../../qa/evidencias/ag014/reanudacion/frontend/npm-audit-completa.json):
  0 vulnerabilidades notificadas por registry.npmjs.org tras autorización expresa.
- [OSV Maven](../../qa/evidencias/ag014/maven-osv-actualizado.log):132 componentes;
  [OSV npm](../../qa/evidencias/ag014/npm-osv-actualizado.log):7 producción/653 completos,
  sin avisos listados. Bases públicas actualizadas y huellas guardadas. Dependencias sin cambios.
- [Actionlint y sintaxis](../../qa/evidencias/ag014/reanudacion/estatico-final-01.json):PASS.

Las fuentes backend finales tienen130 huellas; las ocho adaptaciones del ciclo de
vida de IT conservan aserciones (inversión factory/import8/8 idéntica). Once
contenedores de pruebas con sus volúmenes se retienen detenidos. Cada frontend
anterior también se conserva. No se atribuye al proyecto una nueva arquitectura de BD.

La decisión anterior de navegador procede del volumen ficticio V6, no de un fixture
inventado, con E2E_HISTORIAL_ANTERIOR_DECISION=true. La ejecución05 final completa acredita
ese caso. La variante sintética
predeterminada de CI no acredita por sí sola HA-01/03 sobre decisiones anteriores.

## Incidencias y límites

El [informe](../../docs/trazabilidad/AG-014-informe.md) documenta las causas y soluciones:
Maven/caché, Mockito/pipe, exclusiones SpotBugs estrictas, Docker externo/sandbox,
permiso npm, helper Testcontainers, etiquetas/selectores/restablecer, foco/CSP y contraste.
No se rebajaron aserciones ni controles de seguridad para hacer pasar las pruebas.

Medición IT251 eventos/311296bytes/página20 en10–11ms; Compose10 eventosV7,
68 decisionesV5,106496bytes,20 GET locales size100 entre5,34–13,68ms, media7,44ms.
No son SLA ni carga representativa de producción. Accesibilidad y privacidad
comprobadas de forma acotada, sin certificación integral WCAG/OWASP/ASVS.

Retención definitiva, purga, claves y operación pública requieren decisión posterior.
CI heredada PR4/PR5 verde solo acredita001–006 publicados. CI007 remota, aceptación,
integración y despliegue permanecen pendientes de la persona responsable.

## Comprobaciones finales de integración

[E2E05](../../qa/evidencias/ag014/reanudacion/frontend/e2e-05/ejecucion.json)
corresponde a ui06 y fuentes-corregidas-06:33 huellas frontend idénticas.
[Capturas/contraste](../../qa/evidencias/ag014/reanudacion/frontend/e2e-05/capturas)
y [revisión visual](../../qa/evidencias/ag014/reanudacion/frontend/revision-visual-final.md)
confirman las cuatro pantallas en tres anchos, incluidas etiquetas y controles del resumen.

[Salud/persistencia final](../../qa/evidencias/ag014/reanudacion/compose-final-01/resultado.json):
nueve tablas conservadas al reiniciar la imagen final,503 en2001ms por caída real
PostgreSQL y200 al recuperar, con comprobación de ambos estados en navegador.
[Conservación final](../../qa/evidencias/ag014/reanudacion/conservacion-final.json):
30 contenedores detenidos,17 volúmenes y20 imágenes. Permanecen todos los11
contenedores,4 volúmenes y13 imágenes previos; cero eliminaciones.

[Dictamen independiente](../../qa/evidencias/ag014/reanudacion/revision-final.md):
sin hallazgos materiales abiertos en007; precisiones del borrador008 corregidas
y comprobadas por nueva lectura. [Cierre final](../../qa/evidencias/ag014/reanudacion/cierre-final/)
contiene horario, fuentes, manifestación precisa de Git, controles documentales,
integridad y propuesta de commits para ejecución humana. La puerta permite solo
el borrador008; no constituye aprobación de implementación ni aceptación007.
