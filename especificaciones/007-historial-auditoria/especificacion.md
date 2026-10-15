# Especificación — 007 Historial y auditoría

**Estado:** Borrador pendiente de aprobación humana
**Origen:** Continuación documental autorizada por AG-013, después de verificar006.
**Puerta:** 2026-10-15T13:23:37+02:00, Europe/Madrid; 537,298 minutos restantes,
superiores a los 45 exigidos. [Evidencia](../../qa/evidencias/ag013/puerta007.json).

Este documento propone requisitos para decidir el alcance de007. No aprueba
decisiones ni autoriza plan, tareas, ADR, migración o código. No se han ejecutado
pruebas de007. Los criterios siguientes son propuestos, no resultados observados.

## Objetivo y fuentes

Permitir a una persona autorizada comprender la evolución de una solicitud:
quién actuó, cuándo, sobre qué recurso, qué acción confirmó y qué cambió, sin
exponer información fuera de sus permisos ni confundir una consulta con una nueva
acción. Dar continuidad a la [visión](../../docs/vision-y-alcance.md), a
[004](../004-solicitudes-conceptos-importes/especificacion.md),
[005](../005-aprobaciones/especificacion.md),
[006](../006-concurrencia-idempotencia/especificacion.md) y la
[política de seguridad](../../docs/seguridad.md).

Se distinguirán tres finalidades: historial funcional, registros técnicos y
eventos de seguridad. El registro de resultados idempotentes protege el replay;
no equivale por sí solo a un historial completo ni sustituye una política de auditoría.

## Base existente que se debe preservar

- 004 conserva la presentación en la solicitud y su resultado idempotente.
- V5 incorpora decisiones_solicitud: actor y nombre fotografiado, decisión,
  fecha, versiones y texto de negocio autorizado. La cuenta de aplicación dispone
  de SELECT/INSERT; no tiene UPDATE/DELETE sobre esos eventos de decisión.
- 006 generaliza los resultados persistidos para siete POST, conserva hashes y
  replays de004/005, permite recuperación mínima y no realiza purga automática.
- Las consultas siguen permisos por recurso: el solicitante consulta propias,
  el supervisor las asignadas, y auditor/administrador tienen la lectura definida
  en004/005. Ninguna nueva vista concede permisos para modificar o decidir.

No existe todavía un historial general aprobado de todos los cambios. La
preservación de una fecha o un resultado no acredita que se conozcan todos los
valores anteriores ni cada edición intermedia.

## Alcance propuesto para aprobación

Priorizar la consulta del historial de una solicitud desde su detalle y una ruta
directa Angular. Presentar una secuencia legible, ordenada de forma estable y con
fecha del servidor, tipo de acción, actor autorizado y resumen mínimo del resultado.
Mostrar explícitamente los límites de la información histórica disponible.

Proponer consulta REST autenticada por solicitud, documentada en OpenAPI. La ruta
tentativa es GET /api/solicitudes/{id}/historial; su contrato exacto, DTO, filtros,
orden y límites de paginación se decidirán tras aclarar las preguntas de este
borrador. Los filtros y conteos deben aplicar primero la visibilidad del recurso.

Para eventos nuevos, proponer una lista cerrada de campos permitidos: identificador
de evento/recurso/actor, tipo, fecha del servidor, resultado y versiones cuando
existan. Registrar cambios de negocio solo con el detalle expresamente aprobado;
evitar cuerpos completos o copiar indiscriminadamente cabeceras, conceptos o datos
de proveedor. La clave idempotente completa, hashes internos, credenciales y
datos de sesión no formarán parte de la respuesta del historial.

La selección de acciones que generarán nuevos eventos requiere decisión humana.
La propuesta inicial es distinguir creación, guardado de borrador, presentación
y decisión. Historial de proveedores y auditoría global transversal se mantienen
como opciones por aclarar, sin ampliar automáticamente este incremento.

## Reglas propuestas de integridad y seguridad

1. El backend revalida identidad, permisos actuales y visibilidad en cada consulta.
   Una revocación impide acceder también a eventos anteriores. Conocer un ID,
   número de solicitud o clave de operación no concede acceso.
2. El historial no modifica estados ni permite eludir las restricciones de005.
   No admite editar o borrar eventos desde la interfaz ni desde endpoints públicos.
   La protección se verificará con la cuenta de aplicación; no se afirmará que un
   administrador de base de datos carece de capacidad de alteración.
3. Un efecto confirmado y su evento nuevo se guardarán atómicamente. Rollback no
   dejará eventos de éxito. Replay, consulta, errores y conflictos no producirán
   un segundo evento de negocio. Los no-op necesitan una decisión explícita.
4. Conservar eventos y resultados existentes sin modificar V1–V6 ni reconstruir
   cambios desconocidos. Cualquier dato derivado o importado se identificará como
   tal, conservará su procedencia y se limitará a hechos comprobables. No atribuir
   retrospectivamente un actor o un valor anterior que no se haya conservado.
5. Los textos de usuario se mostrarán como texto, sin HTML ejecutable. Se decidirá
   si comentario/motivo aparecen en historial o solo mediante el detalle ya
   autorizado; no se duplicarán en logs técnicos ni almacenamiento del navegador.
6. Fechas con zona/offset inequívocos y desempate estable entre eventos simultáneos.
   La pantalla explicará la zona de visualización. La paginación no permitirá
   mezclar filas autorizadas con conteos de recursos ocultos.
7. Errores controlados: identidad ausente, acceso denegado/no visible, filtros
   inválidos y dependencia no disponible; sin SQL, stacks, cuerpos almacenados,
   hashes ni confirmación de existencia de recursos no visibles. Los códigos
   exactos se conciliarán con los contratos vigentes antes del plan.

## Conservación y límites

D-006-07 continúa vigente: sin purga automática de resultados idempotentes.
El TTL cliente de24h no es un plazo de retención del servidor ni del historial.
007 debe identificar finalidad, responsables, obligaciones aplicables, acceso y
crecimiento; la persona responsable decidirá retención y posible archivo/tombstone
para007/008. No se propone un plazo jurídico ni borrado automático en este borrador.
Una estrategia futura deberá preservar replay y evitar que desaparezca la
protección frente a repetir efectos antiguos.

No se incluyen firma electrónica con validez jurídica, certificación de
inalterabilidad, exportación masiva, auditoría global, SIEM, notificaciones,
Redis, colas, otra base, multiinstancia ni cambios de reglas de aprobación.
No se afirma rendimiento productivo ni cobertura completa de seguridad.

## Aclaraciones pendientes de decisión humana

| ID | Decisión necesaria antes de planificar |
|---|---|
| Q-007-01 | Confirmar si007 consulta solo solicitudes o también incluye proveedores y una vista global de auditor. |
| Q-007-02 | Aprobar catálogo de eventos nuevos y tratamiento de no-op, guardados sin cambios y operaciones fallidas; separar eventos de seguridad. |
| Q-007-03 | Aprobar campos visibles y detalle de diferencias por evento; resolver comentario/motivo, nombre fotografiado y cambios posteriores de identidad. |
| Q-007-04 | Confirmar matriz exacta de consulta por rol/recurso, combinación de roles y comportamiento ante revocación. Conservar permisos existentes mientras no cambie el requisito aprobado. |
| Q-007-05 | Elegir presentación de datos anteriores: solo hechos existentes, procedencia y aviso de historia incompleta; decidir si hace falta importación limitada. |
| Q-007-06 | Aprobar filtros, orden, tamaño máximo de página, volumen objetivo y tiempos medibles; sin fijar un SLA sin carga acordada. |
| Q-007-07 | Determinar responsable y política de retención/archivo/tombstone, sin eliminar protección idempotente ni inventar plazos legales. |

## Criterios propuestos de aceptación

| ID | Comportamiento que deberá demostrarse tras aprobar y ejecutar007 |
|---|---|
| HA-01 | La vista por solicitud muestra únicamente hechos conservados o eventos nuevos aprobados, con actor, acción, fecha y resultado comprensibles. |
| HA-02 | API, ruta directa, filtros y conteos respetan permisos actuales; actor ajeno y permisos revocados no obtienen datos históricos ocultos. |
| HA-03 | Evento y efecto se confirman juntos; fallo antes de commit revierte ambos; replay/reinicio/carrera no duplican eventos. |
| HA-04 | Los datos anteriores, versiones, hashes y replays de001–006 se preservan; no aparecen actores ni cambios históricos inventados. |
| HA-05 | La cuenta de aplicación no puede actualizar/borrar eventos protegidos; los lectores no obtienen permisos mutables por consultar el historial. |
| HA-06 | Respuesta y logs omiten secretos, claves reutilizables, hashes internos y cuerpos completos; textos se presentan sin ejecutar contenido. |
| HA-07 | Orden estable, zona temporal, filtros y paginación funcionan con empates y escrituras concurrentes según el contrato aprobado. |
| HA-08 | Angular diferencia carga, vacío, historia incompleta, error y acceso perdido; teclado, foco y anchos360/768/1440 conservan legibilidad. |
| HA-09 | Se documentan tamaño, crecimiento y política decidida; ninguna retención reintroduce duplicación de efectos ni cambia D-006-07 sin aprobación. |
| HA-10 | Pruebas unitarias, HTTP, PostgreSQL real, Angular, E2E, regresión001–006, auditorías, revisión y documentación aportan evidencias propias de007. |

La verificación propuesta incluirá negativos de permisos, datos ficticios,
fallos transaccionales, consultas paginadas y recuperación después de reinicio.
No hay resultados007 que reportar. El siguiente paso es aclarar y aprobar esta
especificación; las fases posteriores requieren su autorización correspondiente.
