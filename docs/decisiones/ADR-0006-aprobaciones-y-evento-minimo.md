# ADR-0006 — Aprobaciones y evento mínimo

**Estado:** Aprobado por decisión humana AG-012
**Origen:** D-005-01–08 y condición de continuación cumplida.

La decisión es una transición final del agregado solicitud. Solo el supervisor
asignado, habilitado y con rol vigente, distinto del autor, puede ejecutarla.
La autorización se repite antes del replay; un resultado persistido no concede
permiso. Se usa la función mínima V4 para bloquear/revalidar usuario y rol, sin
ampliar permisos generales de identidad ni modificar su autenticación.

Estado/version/fecha, un evento mínimo inmutable y resultado idempotente se
persisten en una transacción. El evento por solicitud guarda actor/nombre visible,
tipo, comentario o motivo, fecha y versiones; se consulta únicamente dentro del
detalle autorizado. La bandeja es un filtro forzado de asignadas PRESENTADA.
El supervisor conserva lectura de sus asignadas finales.

V5 amplía estados y la tabla de idempotencia local existente; conserva filas y
huella PRESENTAR de004. La misma clave de un usuario no puede reutilizarse entre
presentación, aprobación, rechazo o recursos incompatibles. El lector discrimina
operación y devuelve el resultado original específico. Generalización/purga006
y consulta de historial007 permanecen fuera de este cambio.

Alternativas descartadas: decidir por rol ADMINISTRADOR, autorización soloJWT,
reescribir cabecera/colección, guardar evento después del commit, reconstruir
replay desde estado actual, crear almacenes de idempotencia separados y añadir
un historial avanzado. Introducen permisos indebidos, efectos parciales o rompen
garantías aprobadas. El contrato y pruebas están en el
[plan005](../../especificaciones/005-aprobaciones/plan.md).
