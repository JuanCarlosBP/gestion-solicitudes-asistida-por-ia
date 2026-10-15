# Especificación — 007 Historial y auditoría

**Estado:** Aprobada por decisión humana AG-014.
**Origen:** Encargo humano de 15 de octubre de 2026; D-007-01–10 y ejecución007 autorizada.
**Base:** Borrador AG-013 conservado en [evidencia de entrada](../../qa/evidencias/ag014/especificacion-borrador-entrada.txt).
La aprobación del alcance y de su ejecución no equivale a aceptación, integración
ni despliegue. Los resultados se registran en [validación](validacion.md).

## Objetivo y continuidad

Historial empresarial consultable, PostgreSQL, transacciones, permisos vigentes,
Angular, OpenAPI y QA. Separar historia de negocio, logs técnicos mínimos y
registros de seguridad. Idempotencia protege replay y no acredita por sí sola
un hecho histórico. Preservar contratos de [004](../004-solicitudes-conceptos-importes/especificacion.md),
[005](../005-aprobaciones/especificacion.md) y [006](../006-concurrencia-idempotencia/especificacion.md),
ADR-0005–0007 y [seguridad](../../docs/seguridad.md). V1–V6, hashes, resultados
idempotentes y evidencias AG-003–013 son inmutables para esta ejecución.

## D-007-01 — Hechos registrados

Desde V7: PROVEEDOR_CREADO, PROVEEDOR_MODIFICADO, PROVEEDOR_DESACTIVADO,
PROVEEDOR_REACTIVADO, BORRADOR_CREADO, BORRADOR_GUARDADO y SOLICITUD_PRESENTADA.
APROBADA y RECHAZADA se proyectan únicamente de gestion.decisiones_solicitud V5.
No hay segunda inserción de decisiones en V7. Lecturas, replay y reintentos no
crean hechos. Un estado repetido de proveedor conserva versión/fecha y no genera
evento. Un PUT autorizado que incrementa versión según003/004 acredita guardado,
aunque los valores coincidan; no se inventan diferencias de campos. Fallos y
rechazos conservan los registros técnicos mínimos existentes, sin eventos de éxito.

## D-007-02 — Historia anterior

No reconstruir altas, cambios ni presentaciones anteriores con fechas, estado
actual, Git o logs. Las decisiones V5 sí son hechos durables con autor, fecha y
transición. La ausencia de evento de creación V7 de un recurso existente se
informa como historia anterior desconocida, incluso si hay decisiones V5 o
cambios posteriores. Este indicador se calcula antes de filtrar eventos.
El global explica siempre la cobertura limitada anterior a V7. No hay backfill.

## D-007-03 — Persistencia

Una única migración nueva V7 crea eventos append-only: UUID, tipo_recurso cerrado,
recurso_id UUID, accion cerrada, actor_id UUID, nombre visible fotografiado y
acotado, versiones y estados anterior/resultante cuando aplican, ocurrido_en
TIMESTAMPTZ del servidor, petición UUID cuando existe y datos mínimos de
presentación. No guardar cuerpos ni claves idempotentes completas. La cuenta
gestion_app recibe solo SELECT/INSERT; no UPDATE/DELETE. La inserción ocurre
dentro de la misma transacción que el efecto y resultado idempotente: cualquier
fallo de evento revierte el conjunto. No insertar después del commit.
El administrador de BD puede alterar datos; no se promete inalterabilidad
criptográfica. No hay endpoint de escritura, edición, borrado ni purga del historial.

## D-007-04 — Privacidad

Nunca persistir ni devolver en eventos JWT, refresh, cookies, CSRF, contraseñas,
claves, IP completa, fiscal completo, correo/teléfono de proveedor, descripción
larga, conceptos, cuerpo/cabeceras HTTP ni stacks. No incluir comentario/motivo de
decisión en la proyección, ni global ni por recurso. El detalle autorizado V5 de
la solicitud mantiene su texto original conforme005. Resúmenes cerrados por acción,
sin interpolar entradas privadas. Nombre visible fotografiado autorizado, acotado
y mostrado como texto; no sincronizarlo después con cambios de identidad.

## D-007-05 — Autorización

Cada GET consulta habilitación e identidad/roles actuales en backend; un JWT antiguo
no conserva roles revocados. La unión explícita de roles se aplica antes del conteo.

| Consulta | Visibilidad |
|---|---|
| Historial solicitud | SOLICITANTE propias; SUPERVISOR asignadas PRESENTADA/APROBADA/RECHAZADA; AUDITOR/ADMINISTRADOR todas. |
| Historial proveedor | Solo AUDITOR/ADMINISTRADOR, incluidos inactivos. |
| Global | Solo AUDITOR/ADMINISTRADOR. |
| Resumen | Unión de visibilidad anterior sobre solicitudes. |

No se concede acceso a borradores ajenos por asignación de supervisor. No se amplían
permisos de modificación, presentación o decisión; nadie decide su solicitud.
Recurso inexistente/no visible:404 controlado indistinguible; global sin rol:403;
sin identidad válida:401. Conocer ID, número o clave no concede permisos.

## D-007-06/07/08 — Contrato HTTP

GET autenticados /api/solicitudes/{id}/historial, /api/proveedores/{id}/historial,
/api/historial y /api/resumen. Sin nuevos endpoints mutables. OpenAPI describe
campos, filtros, estados de error, seguridad, límites y fuentes.

Página: elementos, pagina, tamano, totalElementos, totalPaginas,
historiaAnteriorDesconocida. Evento: id estable prefijado EVENTO:UUID o DECISION:UUID,
tipoRecurso SOLICITUD/PROVEEDOR, recursoId, accion, actor {id,nombreVisible},
ocurridoEn, versionAnterior nullable, versionResultante, estadoAnterior nullable,
estadoResultante, resumen cerrado, origen EVENTO_V7/DECISION_V5.
Proveedor usa ACTIVO/INACTIVO; creación no tiene versión ni estado anterior.
Decisión usa PRESENTADA→APROBADA/RECHAZADA y versiones/actor/fecha originales.
UUID no es secuencia cronológica; el prefijo evita colisiones entre fuentes.

Filtros comunes: page>=0, size20 por defecto y1–100, accion cerrada, actor UUID,
desde/hasta instantes ISO con offset válidos e inclusivos, desde<=hasta.
Global añade tipoRecurso cerrado y recursoId UUID opcional. El desplazamiento
page×size no supera100000, conservando el límite de consulta heredado. Desconocidos,
duplicados, valores vacíos/malformados y periodos incoherentes:400 controlado.
Orden fijo ocurridoEn DESC y clave estable de evento DESC. SQL parametrizado,
sin entrada de orden libre, páginas acotadas y sin consultas N+1.
Permisos y filtros preceden totalElementos. Elementos/conteo comparten lectura
coherente; offset puede desplazarse entre peticiones concurrentes. No se promete
snapshot multipágina ni SLA. Se medirá un volumen local y se publicará su límite.

Resumen: solicitudes {BORRADOR,PRESENTADA,APROBADA,RECHAZADA,total} visibles;
accionesPendientes {borradoresPropios,presentadasAsignadas}. Borradores propios
requiere rol SOLICITANTE; presentadas asignadas requiere SUPERVISOR vigente,
asignación propia y autor distinto. Auditor/admin sin estos roles no adquieren
acciones pendientes de otros usuarios. Sin métricas ficticias.

## D-007-09 — Angular

Timeline paginado en detalle de solicitud; proveedor solo auditor/admin; vista
global autorizada y resumen real. Rutas directas, filtros y páginas en URL,
recarga y navegación. Estados cargando, vacío, fallo, sin acceso y límites
históricos explícitos. Zona temporal visible; texto escapado por Angular.
Reutilizar sistema visual004–006, sin nuevas dependencias. Verificar etiquetas,
teclado, foco, contraste acotado y anchos360/768/1440. No editar/borrar eventos.

## D-007-10 — Retención y verificación

Sin purga física ni plazo jurídico inventado. Retención definitiva, responsables
jurídicos y procedimiento posterior requieren decisión humana; TTL cliente24h
no borra servidor ni sustituye esa decisión. Documentar crecimiento por cambios,
índices, medición real y riesgo residual de datos personales mínimos.
Pruebas reales de rollback evento/efecto, replay, carreras, privacidad, revocación,
multirrol, recursos ajenos, datos anteriores y decisiones V5. PostgreSQL real,
regresión001–006, QA/CI y auditorías. CI remota nueva pendiente del push humano.

## Conciliación del borrador

Q-007-01–06 quedan resueltas por D-007-01–09. D-007-10 difiere expresamente el
plazo jurídico Q-007-07, sin impedir v1 sin purga. La antigua exclusión de global
queda sustituida por su autorización D-007-05/06. Los HA se renumeran conforme
encargo AG-014 manteniendo todos los controles del borrador. Nombre visible y
comentario se resuelven como fotografía mínima y detalle V5 separado.
Se conservan exclusiones: firma con validez jurídica, certificación de
inalterabilidad, exportación masiva, SIEM, notificaciones, Redis, colas, segunda BD,
microservicios, multiinstancia, cambios de aprobaciones y despliegue público.

## Criterios de aceptación

| ID | Evidencia exigida |
|---|---|
| HA-01 | Fuentes reales y aviso de historia desconocida; cero hechos reconstruidos. |
| HA-02 | Siete acciones nuevas atómicas; rollback completo si falla auditoría; no-op sin evento. |
| HA-03 | V5 proyectada con identidad estable, orden común y sin duplicación nueva/antigua. |
| HA-04 | Proyección y almacenamiento mínimos; sin datos privados, secretos ni texto ejecutable. |
| HA-05 | Identidad vigente, permisos por recurso, unión multirrol, revocación y404 sin fuga. |
| HA-06 | Filtros cerrados, ISO, límites, conteo autorizado, empates y paginación estable. |
| HA-07 | Resumen real por perfil y acciones propias sin ampliar permisos. |
| HA-08 | Angular/rutas/estados/filtros/páginas, teclado/foco/contraste y360/768/1440. |
| HA-09 | PostgreSQL, migración preservadora, carreras, replay, restricciones y pruebas negativas. |
| HA-10 | Regresión001–006, QA, análisis/auditorías, CI local, documentación y revisión independiente. |

La aceptación es humana. El [plan](plan.md), [tareas](tareas.md) y
[ADR-0008](../../docs/decisiones/ADR-0008-historial-de-negocio-y-consulta.md)
concretan la ejecución ya autorizada por AG-014.
