# Especificación — 004 Solicitudes, conceptos e importes

**Estado:** Borrador pendiente de aprobación humana
**Origen:** Trabajo opcional autorizado en AG-011 después de verificar localmente003.
**Fecha:** 2026-10-14. No autoriza plan, tareas ni implementación.

## Propósito y fuentes

Preparar una porción vertical para crear y consultar solicitudes, gestionar sus
conceptos, calcular importes en el servidor, guardar borradores y presentarlos
para revisión. Este documento distingue el alcance general ya aprobado de las
reglas específicas que todavía debe decidir la persona responsable.

Fuentes: [visión y alcance](../../docs/vision-y-alcance.md),
[seguridad](../../docs/seguridad.md), [calidad](../../docs/politicas/calidad.md),
[002 identidad](../002-identidad-acceso/especificacion.md) y
[003 proveedores](../003-proveedores/especificacion.md).
La verificación local de003 no equivale a su aceptación o integración.

La condición temporal para redactar este borrador está registrada en
[AG-011](../../qa/evidencias/ag011/condicion-borrador004.json).
No existen plan, tareas, validación, migraciones ni código004 por este encargo.

## Alcance general disponible

La visión aprobada incluye solicitudes con conceptos e importes, borradores y
presentación; consultas/listados/filtros, permisos por acción/recurso, concurrencia
sin sobrescritura y atomicidad. El backend es autoridad sobre cálculos, estados
y autorización. Los actores generales son solicitante, supervisor, auditor y
administrador; el nombre del rol no concede permisos aún no definidos.

El ciclo de referencia contempla Borrador, Presentada, Aprobada y Rechazada.
Las transiciones y condiciones exactas siguen pendientes. Se propone que004
abarque Borrador y Presentada; aprobación/rechazo corresponderían a005.
La prohibición de aprobar una solicitud propia sigue vigente para ese incremento.

## Propuesta para clarificación

Las siguientes reglas son propuestas revisables, no decisiones aprobadas:

- Una solicitud reúne cabecera, autor, proveedor del catálogo, conceptos, importe
  calculado, estado, versión e instantes del servidor.
- Los conceptos pertenecen a una sola solicitud y se modifican junto a ella de
  forma coherente; no son un catálogo independiente salvo decisión posterior.
- El borrador admite edición autorizada. Presentar es una operación de negocio
  explícita, no un cambio libre del campo estado enviado por el cliente.
- La presentación valida íntegramente cabecera, conceptos, importes y proveedor
  y se aplica en una sola transacción. Un error conserva el borrador anterior.
- Los importes se representan con decimales exactos. El cliente puede mostrar
  una previsualización, pero el servidor vuelve a calcular y decide el resultado.
- Una versión conocida de la solicitud protege la edición de cabecera/conceptos
  y presentación; no se aceptan sobrescrituras silenciosas.
- La interfaz ofrece lista, detalle y formulario, estados de carga/vacío/error,
  conflictos comprensibles, navegación directa, recarga y uso por teclado.

No se fijan todavía campos obligatorios, longitudes, moneda, escala, redondeo,
permisos, rutas HTTP, estados editables ni operaciones de eliminación. Las
preguntas siguientes deben resolverse antes de convertir propuestas en contrato.

## Decisiones humanas necesarias

| ID | Decisión pendiente | Efecto en requisitos y pruebas |
|---|---|---|
| D-004-01 | ¿Qué campos de cabecera se requieren para guardar borrador y para presentar? ¿Número público, asunto, descripción u otros? | Definir límites, búsqueda, DTO y datos sensibles; no copiar automáticamente los del proveedor. |
| D-004-02 | ¿El borrador puede carecer de proveedor o conceptos? ¿Cuál es el mínimo al presentar y el máximo de conceptos? | Distinguir incompleto permitido de dato inválido y acotar tamaño de petición. |
| D-004-03 | ¿Qué puede consultar/crear/editar/presentar cada rol y sobre qué solicitudes: propias, asignadas o todas? ¿Cómo se combinan roles? | Matriz por acción/recurso; auditor no adquiere escritura por su función de consulta y administrador no evita reglas. |
| D-004-04 | ¿Se elige siempre proveedor activo? ¿Qué ocurre si queda inactivo mientras se edita/presenta? ¿Se conserva referencia actual o instantánea de datos? | Integridad temporal, privacidad, concurrencia con003 y contenido visible después de presentar. |
| D-004-05 | ¿Qué campos tiene cada concepto: descripción, cantidad, unidad, precio, posición? ¿Qué límites y valores cero/negativos se permiten? | Modelo de línea, validaciones y casos de frontera; no inventar unidades ni reglas fiscales. |
| D-004-06 | ¿Moneda única o varias? ¿Qué monedas, precisión de cantidad/precio/total, modo y punto de redondeo? ¿Se admiten impuestos/descuentos? | Fórmula aprobada con ejemplos exactos, desbordamientos y reconciliación línea/total; ningún cálculo aprobado todavía. |
| D-004-07 | ¿Qué estados puede editarse y qué ocurre al presentar? ¿Cabe retirar, reabrir, anular o eliminar un borrador? | Transiciones cerradas, retención y permisos; borrar físicamente no se presume permitido. |
| D-004-08 | ¿Cómo se selecciona el revisor/supervisor para la futura005? ¿La presentación ya exige asignación? | Definir frontera004/005 sin implementar aprobaciones ni reglas de asignación inventadas. |
| D-004-09 | ¿Qué exige repetir guardar/presentar y cómo se distingue de una versión obsoleta? | Definir efectos únicos y códigos;006 ampliará idempotencia transversal, sin dejar indefinida la operación local. |
| D-004-10 | ¿Qué búsquedas, filtros, orden y tamaño/volumen previsto necesita el listado? | Contrato acotado y pruebas de permisos/páginas; no copiar automáticamente defaults003. |
| D-004-11 | ¿Qué contenido puede mostrarse por rol y registrarse técnicamente? ¿Retención de borradores y solicitudes presentadas? | Minimización de datos, visibilidad por recurso, eventos sin cuerpos y frontera con historial007. |

Estas preguntas no piden nuevas decisiones para003 y no alteran su catálogo.

## Requisitos candidatos y criterios observables

IDs estables propuestos para revisar tras las decisiones anteriores. Ninguno se
marca aprobado, implementado o probado en AG-011.

| ID | Capacidad candidata | Criterio observable que deberá concretarse |
|---|---|---|
| SCI-01 | Crear borrador | Usuario autorizado obtiene identificador/autor/tiempos del servidor; entrada ajena o inválida no persiste. |
| SCI-02 | Consultar detalle | Solo se muestran solicitudes y campos autorizados; inexistente/no visible usa respuesta controlada. |
| SCI-03 | Listar y buscar | Filtros/orden/páginas cerrados, límites explícitos y visibilidad aplicados por backend. |
| SCI-04 | Editar cabecera | Solo campos y estados aprobados, preservando identificador/autor/fechas de servidor. |
| SCI-05 | Gestionar conceptos | Alta/edición/reordenación/retirada según reglas aprobadas; ninguna línea queda huérfana ni modifica otra solicitud. |
| SCI-06 | Calcular importes | Resultado exacto conforme a fórmula/moneda/redondeo aprobados; no confiar en total enviado por cliente. |
| SCI-07 | Presentar | Validación integral y transición explícita atómica; ningún estado parcial después de un fallo. |
| SCI-08 | Aplicar permisos | Matriz por rol/acción/recurso y combinación aprobada, comprobada llamando directamente a REST. |
| SCI-09 | Evitar conflictos | Dos escrituras incompatibles no se sobrescriben; repetición de presentación tiene resultado definido. |
| SCI-10 | Gestionar proveedor | Comportamiento aprobado frente a proveedor inexistente/inactivo/cambiado durante la operación. |
| SCI-11 | Interfaz accesible | Rutas directas/recarga, formularios/errores asociados, teclado/foco, móvil y conflicto recuperable. |
| SCI-12 | Contrato y evidencias | OpenAPI, migración y documentación coherentes; regresión001–003 y pruebas propias sin omisiones. |

## Seguridad, datos y contratos por concretar

Identidad proviene de002, nunca de un autor o rol enviado libremente en JSON.
Cada operación debe validar acción y recurso, incluidos identificadores de líneas.
Las operaciones mutables conservarán CSRF y la autoridad backend. Los errores
no expondrán datos de otra solicitud, SQL, configuración o cuerpos sensibles.

La relación con proveedores debe resolverse mediante reglas explícitas; no se
duplicarán proveedores ni se reutilizará su baja lógica para cambiar solicitudes.
Las garantías de atomicidad, unicidad o concurrencia que se aprueben deben
depender también de PostgreSQL. No se decide aquí una tabla ni migración concreta.

Tras clarificar, el contrato deberá enumerar por operación: método/ruta, campos
editables/servidor, visibilidad, validaciones, respuesta, errores estables, versión
y comportamiento ante repetición. Una ruta propuesta no constituye API disponible.

## Escenarios de aceptación que faltará concretar y ejecutar

Se prepararán ejemplos numéricos con resultados aprobados antes de implementar:
fracciones, límites, redondeo en línea/total, cero/negativos y valores fuera de rango.
Se comprobarán manipulación de totales, autor/estado/campos internos, líneas de
otra solicitud, roles sin permiso y lectura de recursos no visibles.

PostgreSQL real deberá acreditar rollback sin estados parciales y carreras entre
edición/edición, edición/presentación y cambio del proveedor según D-004-04.
La repetición de presentación se verificará según D-004-09, sin simular garantías
de base de datos. Las migraciones futuras deberán preservar001–003.

El recorrido E2E se fijará con usuarios ficticios: crear borrador, añadir conceptos,
comprobar total, editar, gestionar conflicto y presentar; validar lectura por roles
y reglas elegidas. Incluirá rutas directas/recarga, errores y teclado/foco/móvil.
Se mantendrán verify backend, controles Angular, Compose, auditorías, CI y
evidencias exclusivas de la ejecución futura. **No se ejecutó ninguna prueba004.**

## Exclusiones y puerta siguiente

No se incluyen aprobación/rechazo005, infraestructura transversal006, historial
funcional007, publicación008, pagos/bancos, multiempresa, integraciones externas,
datos reales ni reglas fiscales jurídicas inventadas. Cualquier ampliación exige
actualizar primero la especificación y obtener decisión humana.

Siguiente paso: responder D-004-01–11, conciliar requisitos/criterios y aprobar
expresamente la especificación. Solo después corresponde un plan y tareas;
implementación requiere su autorización. Este borrador no concede ninguna de
esas aprobaciones y no altera el estado pendiente de aceptación/integración de003.
