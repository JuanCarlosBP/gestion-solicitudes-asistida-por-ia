# Especificación — 005 Aprobaciones

**Estado:** Aprobada por decisión humana AG-012
**Origen:** Decisiones D-005-01–08 aprobadas expresamente en el encargo AG-012.
**Condición de inicio:** 004 verificada localmente y564 minutos restantes a
2026-10-15T00:09:52+02:00, Europe/Madrid. Evidencia:
`qa/evidencias/ag012/puerta005.json`. Límite:2026-10-15T09:34:02+02:00.
Esta aprobación permite SDD e implementación005; no significa aceptación ni integración.

## Objetivo y alcance

Completar la decisión de una solicitud presentada por el supervisor asignado,
con autorización por recurso, control de versión, idempotencia persistida y un
evento mínimo de negocio. Mantener cálculos, fotografía, asignación y garantías
de004, así como regresiones001–004 y el sistema visual compartido.

## Decisiones aprobadas

- **D-005-01:** Solo el SUPERVISOR asignado decide. ADMINISTRADOR no decide por
  ser administrador. Un usuario con varios roles decide únicamente si es el
  supervisor asignado.
- **D-005-02:** PRESENTADA→APROBADA o PRESENTADA→RECHAZADA. Ambos estados son
  finales en v1; no reabrir, retirar ni anular.
- **D-005-03:** Nadie decide su propia solicitud, aunque tenga SUPERVISOR o
  ADMINISTRADOR.
- **D-005-04:** Aprobar admite comentario opcional de hasta500 caracteres.
  Rechazar exige motivo de10–1000 caracteres. El motivo es visible al solicitante,
  supervisor, auditor y administrador autorizados.
- **D-005-05:** Toda decisión requiere versión esperada, actualización condicional
  y transacción. Dos decisiones simultáneas: una gana y otra recibe409.
- **D-005-06:** Idempotency-Key obligatorio. Misma clave y operación compatible
  devuelve el mismo resultado; reutilización incompatible produce conflicto.
- **D-005-07:** El supervisor dispone de bandeja de asignadas presentadas. El
  solicitante ve el resultado de las propias; auditor/administrador leen todas.
  Nadie distinto del supervisor asignado decide.
- **D-005-08:** No cambia la asignación. Se registra un evento mínimo de decisión;
  historial completo y consulta avanzada corresponden a007.

La repetición concurrente de la misma operación y clave es un replay y devuelve
el mismo resultado porD00506; dos decisiones distintas concurrentes cumplenD00505.

## Criterios observables

| ID | Criterio |
|---|---|
| AP-01 | El supervisor asignado aprueba una PRESENTADA con versión actual, identidad/CSRF y clave válidas. Se persiste APROBADA, versión y fecha del servidor. |
| AP-02 | Rechazo exige motivo válido10–1000; aprobación comentario opcional≤500. Unicode, extremos, entradas extra y tipo incorrecto tienen error controlado. |
| AP-03 | Administrador solo, supervisor ajeno, autor y usuario sin permiso no deciden. La combinación de roles no elude asignación ni prohibición de decidir propia. |
| AP-04 | BORRADOR y estados finales no admiten decisión nueva. No se editan cabecera, conceptos, proveedor fotografiado ni asignación durante/después de decidir. |
| AP-05 | Versión obsoleta y decisiones distintas concurrentes producen409 sin sobrescritura; solo una decisión/evento queda persistida. |
| AP-06 | Replay compatible devuelve resultado mínimo original, también tras reinicio. Clave incompatible entre operaciones/recursos/cuerpo produce409; operación, resultado y evento son atómicos. |
| AP-07 | Bandeja del supervisor muestra solo asignadas PRESENTADA; resultados finales son visibles a los lectores autorizados y ocultos a terceros. Filtros/conteos respetan visibilidad. |
| AP-08 | Angular permite decidir con confirmación, validación, progreso, éxito y conflicto recuperable; muestra resultado/comentario/motivo y conserva accesibilidad/responsivo004. |
| AP-09 | V5 evoluciona V4 sin alterar migraciones previas ni perder datos; evento mínimo relaciona solicitud, actor, decisión y fecha. No se registran cuerpos ni textos de motivo en logs técnicos. |
| AP-10 | Backend/Angular/E2E/PostgreSQL real, rollback/carreras, Compose, auditorías, CI, documentación y revisión tienen evidencia; regresión001–004 permanece superada. |

## Límites

Sin reasignación, delegación, aprobación por administrador, decisiones propias,
edición posterior, transiciones adicionales ni notificaciones externas. Sin
historial avanzado007, generalización006, nuevas dependencias ni versiones mayores.
Git, aceptación, integración y despliegue corresponden a la persona responsable.
006 solo podrá redactarse como borrador si005 queda verificada y restan45 minutos.

## Verificación prevista

Dominio para estados/textos/actor; HTTP de permisos, DTO, CSRF y errores; PostgreSQL
real para V4→V5, atomicidad, rollback, carreras y replay persistido. Angular de
servicio/bandeja/detalle/validación/confirmación/conflicto y estados; E2E reales de
aprobar y rechazar, consulta por los roles, tercero denegado, versión y replay.
Capturas principales a360/768/1440 y teclado. Los resultados ejecutados se anotan
en validación005; esta previsión no es evidencia de pruebas superadas.
