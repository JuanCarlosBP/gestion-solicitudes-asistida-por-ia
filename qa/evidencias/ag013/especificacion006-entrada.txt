# Especificación — 006 Concurrencia e idempotencia

**Estado:** Borrador pendiente de aprobación humana
**Origen:** Continuación limitada del encargo AG-012.005 quedó verificada
localmente antes de redactar este documento; puerta registrada a
2026-10-15T00:39:11+02:00, con534 minutos restantes, en
`qa/evidencias/ag012/puerta006.json`.

La autorización permite únicamente este borrador. No aprueba sus propuestas ni
autoriza plan, tareas, validación, migración o código006. La persona responsable
debe resolver las preguntas y aprobar la especificación antes de pasar de etapa.

## Objetivo propuesto

Definir un contrato coherente de concurrencia e idempotencia para las operaciones
mutables que se seleccionen expresamente, manteniendo las garantías verificadas
de proveedores, borradores, presentación y decisiones. Una repetición de red no
debe duplicar efectos ni permitir sobrescrituras o decisiones incompatibles.

La generalización debe responder a operaciones concretas y conservar el monolito
modular. Este documento no presupone un servicio independiente ni una abstracción
genérica para todos los módulos.

## Base existente y límites que se deben preservar

- 003 protege actualizaciones de proveedores con versión y restricciones SQL;
  una operación repetida de estado tiene la semántica documentada en003.
- 004 reemplaza atómicamente el borrador con versión. Presentar exige UUID
  Idempotency-Key, identidad/CSRF, autorización por recurso y estado; guarda el
  resultado mínimo original junto con la transición y fotografía del proveedor.
- 005 comparte el espacio usuario/clave para PRESENTAR/APROBAR/RECHAZAR. Revalida
  supervisor asignado, no autor, habilitación y rol vigente antes de devolver
  replay. Decisión, evento y resultado son atómicos. Los estados finales no se reabren.
- La misma clave compatible devuelve el resultado original, incluso después de
  reiniciar; una petición incompatible devuelve409. Dos claves no permiten dos
  transiciones incompatibles. El replay004 sigue siendo PRESENTADA aunque la
  solicitud haya sido decidida después.
- No hay expiración ni purga automática del registro idempotente. Los logs
  técnicos usan identificadores y hash de clave; no cuerpos, tokens ni textos.

Estos comportamientos son la línea de compatibilidad. Cambiarlos requiere una
decisión humana explícita y actualización de sus especificaciones, no una
consecuencia implícita de «generalizar» el mecanismo.

## Alcance candidato, todavía no aprobado

Unificar cómo se documentan la versión esperada, identidad de la operación,
normalización/huella de entrada, resultado recuperable y conflictos; concretar
qué operaciones adicionales necesitan una clave y qué ocurre ante resultado
incierto, reinicio, reintento concurrente o cambio de permisos.

Mantener un contrato observable para clientes: distinguir conflicto de versión,
reutilización incompatible, operación ya finalizada y dependencia no disponible.
La UI deberá poder recuperar el estado y explicar cuándo es seguro reintentar,
sin crear una clave nueva para una operación cuyo resultado todavía se desconoce.

No se proponen nuevas reglas de aprobación, reasignación, reapertura, borrado de
solicitudes, notificaciones, colas, microservicios ni historial avanzado. La
retención/borrado jurídico de datos de negocio debe coordinarse con007/008;
cualquier caducidad de claves requiere una decisión separada y compatible.

## Criterios candidatos para aprobación

| ID | Comportamiento a concretar y verificar |
|---|---|
| CI-01 | Existe una matriz explícita de operaciones incluidas, recursos, permisos, versión y necesidad de clave; las excluidas conservan su contrato. |
| CI-02 | Dos escrituras con la misma versión no se sobrescriben silenciosamente; el perdedor recibe conflicto estable y el agregado mantiene coherencia. |
| CI-03 | La identidad y huella de la petición son deterministas para las entradas admitidas; equivalencias de normalización y diferencias significativas quedan documentadas. |
| CI-04 | Repetir una operación compatible devuelve su resultado original persistido, sin duplicar estado, evento ni otros efectos; incompatible conserva409. |
| CI-05 | Autorización vigente y visibilidad se comprueban antes de replay; conocer una clave nunca concede acceso ni evita CSRF. |
| CI-06 | Fallos antes/durante/después de la transacción y reinicios no dejan efectos parciales; se distingue respuesta perdida de operación no ejecutada. |
| CI-07 | Cliente conserva la identidad de un intento incierto y ofrece recuperación de conflicto; el tratamiento de recarga/cierre de pestaña se define expresamente. |
| CI-08 | Persistencia y eventual evolución conservan registros y replays004/005; no se editan migraciones publicadas ni se purgan claves sin política aprobada. |
| CI-09 | Contención, esperas y errores tienen límites y observabilidad aprobados, sin exponer claves reutilizables, credenciales o cuerpos. |
| CI-10 | La comprobación incluye PostgreSQL real, carreras sincronizadas, rollback/reinicio, API/Angular/E2E y regresión001–005, con evidencia y revisión. |

Estos IDs organizan la discusión; no son criterios aprobados ni pruebas ejecutadas.

## Decisiones abiertas

1. ¿Qué operaciones adicionales entran? Distinguir altas, guardados y cambios de
   estado de proveedores/solicitudes; no extender automáticamente la política a
   autenticación, refresh o logout, que tienen garantías propias.
2. ¿Se conserva el ámbito usuario+clave actual para todas las operaciones elegidas
   o se define otro? ¿Cómo conviviría con claves y resultados ya persistidos?
3. ¿Qué respuestas se conservan? Actualmente se persiste el éxito transaccional;
   definir si algún error determinista se memoriza y cómo afecta un cambio de permisos.
4. ¿Habrá caducidad o purga? Determinar ventana de reintento, garantías después
   del vencimiento, límites de almacenamiento y compatibilidad con retención
   jurídica. No asumir un plazo ni borrar registros por defecto.
5. ¿Cómo se acotan espera de bloqueos, número de intentos y contención? Acordar
   errores HTTP y objetivos medibles con un volumen/carga representativos.
6. ¿Qué debe recuperarse tras recargar o cerrar una pestaña? Elegir duración y
   almacenamiento mínimo de intentos pendientes, considerando privacidad y
   evitando guardar credenciales o cuerpos sensibles sin justificación.
7. ¿Se requiere un contrato transversal nuevo o basta documentar y extender los
   mecanismos locales? La decisión debe sustentarse en las operaciones elegidas.

## Fuentes y estado de salida

[Visión](../../docs/vision-y-alcance.md), [seguridad](../../docs/seguridad.md),
[004](../004-solicitudes-conceptos-importes/especificacion.md),
[005](../005-aprobaciones/especificacion.md),
[ADR-0005](../../docs/decisiones/ADR-0005-solicitudes-importes-presentacion.md) y
[ADR-0006](../../docs/decisiones/ADR-0006-aprobaciones-y-evento-minimo.md).
Resultados de partida en las validaciones004/005 y en el informe AG-012.

Salida de AG-012: únicamente este borrador. Siguiente paso humano: revisar alcance
y decisiones abiertas. No se ha implementado ni validado incremento006.
