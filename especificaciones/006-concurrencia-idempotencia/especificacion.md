# Especificación — 006 Concurrencia e idempotencia

**Estado:** Aprobada por decisión humana AG-013
**Origen:** Encargo humano del 2026-10-15, D-006-01 a D-006-10.

La autorización expresa sustituye el borrador de AG-012 y comprende especificación,
plan, tareas, ADR e implementación. No acredita pruebas, aceptación o integración.
El [borrador de entrada](../../qa/evidencias/ag013/especificacion006-entrada.txt) se conserva.

## Objetivo y límites

Generalizar concurrencia e idempotencia de003–005 en el monolito modular, sin
sobrescrituras, efectos duplicados ni pérdida de replays. Conservar V1–V5, filas,
huellas y resultados PRESENTAR/APROBAR/RECHAZAR incluso tras reinicio. Sin Redis,
colas, microservicios, segunda base, reglas nuevas de aprobación o historial007.

## D-006-01 — Matriz de operaciones

Toda escritura mantiene identidad, CSRF, validación y autorización del servidor.

| Operación | Método/ruta | Permiso vigente y visibilidad | Versión | Clave | Éxito conservado |
|---|---|---|---|---|---|
| CREAR_PROVEEDOR | POST /api/proveedores | ADMINISTRADOR | Inicial0 | UUID obligatorio | 201/Location/ProveedorPublico |
| DESACTIVAR_PROVEEDOR | POST /api/proveedores/{id}/desactivar | ADMINISTRADOR; recurso visible | Esperada | UUID obligatorio | 200/ProveedorPublico |
| REACTIVAR_PROVEEDOR | POST /api/proveedores/{id}/reactivar | ADMINISTRADOR; recurso visible | Esperada | UUID obligatorio | 200/ProveedorPublico |
| CREAR_BORRADOR | POST /api/solicitudes | SOLICITANTE | Inicial0 | UUID obligatorio | 201/Location/DetalleSolicitud |
| PRESENTAR | POST /api/solicitudes/{id}/presentar | SOLICITANTE autor | Esperada | UUID obligatorio | 200/ResultadoPresentacion |
| APROBAR | POST /api/solicitudes/{id}/aprobar | SUPERVISOR asignado, habilitado, distinto del autor | Esperada | UUID obligatorio | 200/ResultadoDecision |
| RECHAZAR | POST /api/solicitudes/{id}/rechazar | Igual que APROBAR | Esperada | UUID obligatorio | 200/ResultadoDecision |
| Modificar proveedor | PUT /api/proveedores/{id} | Contrato003 | Esperada | Sin obligación nueva | Contrato003 |
| Guardar borrador | PUT /api/solicitudes/{id} | Contrato004 | Esperada | Sin obligación nueva | Contrato004 |

GET, login, refresh, logout, CSRF y salud quedan excluidos; conservan sus garantías.
Repetir estado proveedor con clave nueva y versión vigente conserva no-op003,
sin incrementar fecha/versión/evento. Una decisión nueva sobre estado final conserva
SOLICITUD_NO_DECIDIBLE; no sustituir todos los conflictos por VERSION_OBSOLETA.

## D-006-02 y03 — Identidad y huella

Ámbito global usuario autenticado+UUID Idempotency-Key. Compatible devuelve el
resultado original; operación/recurso/versión/entrada incompatible produce409
CLAVE_IDEMPOTENCIA_REUTILIZADA. La clave no concede permiso ni visibilidad.

SHA-256 de serialización canónica versionada con operación, usuario, recurso
cuando exista, versión esperada y entrada normalizada por servidor. Orden fijo,
UTF-8, null inequívoco y longitudes explícitas. Equivalencias normalizadas producen
misma huella; diferencias de negocio, distinta. No incluir JWT, cookies, CSRF,
cabeceras volátiles, fechas cliente o secretos. Conservar algoritmo y hash de
filas heredadas; el lector discrimina formato sin recalcular datos históricos.

Normalización: dominio003 para proveedor (fiscal NFKC/ROOT/espacios colapsados);
asunto recortado004 para alta; versión para estado/presentación; textos005 para
decisiones, comentario vacío/null equivalentes. No inventar normalización nueva
de correo/teléfono ni eliminar diferencias internas significativas.

## D-006-04 — Éxito y autorización

Persistir solo éxitos confirmados, atómicos con efecto/evento: estado HTTP,
identificador, versión, estado funcional y campos tipados mínimos del DTO original.
No almacenar petición completa, cabeceras ni errores de validación/permisos/dependencia.
Proveedor requiere snapshot de sus campos públicos mutables para replay exacto
tras edición; alta borrador reconstruye constantes a partir de variables originales.
Nunca reconstruir replay desde estado actual. Recuperación no entrega snapshot completo.

Antes de replay/GET revalidar identidad, habilitación, permisos vigentes y
visibilidad. En mutables también CSRF. Roles antiguos del JWT no bastan. Permiso
revocado impide replay; GET no visible devuelve404. Mantener401/403 y ocultación
del recurso de contratos previos. PRESENTAR continúa devolviendo PRESENTADA
aunque después se apruebe/rechace.

## D-006-05 — Concurrencia

Solo una petición válida ejecuta el efecto; duplicados esperan máximo3s. Si termina,
replay; si sigue,409 OPERACION_EN_PROGRESO y Retry-After:1. Sin espera ilimitada.
Rollback no consume clave: reintento permitido. Claves distintas y versiones
concurrentes mantienen agregado coherente y conflictos estables.

## D-006-06 y07 — Persistencia/retención

Crear V6 ampliando la tabla existente, sin editar V4/V5 ni recalcular hashes.
Conservar todas las filas y resultados. Verificar base nueva, evolución V1–V5
y replay después de reinicio. PostgreSQL es autoridad de unicidad y atomicidad.
Sin purga automática v1: borrar claves puede repetir efectos antiguos.
Documentar crecimiento, índices, consulta de tamaño, riesgo y futuro archivo/
tombstone. Retención jurídica/operativa se resolverá en007/008, sin plazo inventado.

## D-006-08 — Angular y recuperación

Servicio transversal: una clave por intento; conservar ante timeout/respuesta
perdida/progreso/dependencia. localStorage admite exclusivamente descriptor
{clave,operacion,recursoId cuando exista,fecha}, TTL24h. Sin cuerpo, token, cookie,
contraseña, fiscal, comentario ni motivo. TTL cliente no elimina registro servidor.

GET /api/operaciones-idempotentes/{clave}, autenticado, solo mismo usuario:
EN_PROGRESO, COMPLETADA con resultado mínimo, o404 si no existe/no es visible.
Revalida permisos/visibilidad.503 si PostgreSQL impide conocer resultado.
Al recuperar éxito Angular limpia descriptor.404 no prueba ausencia definitiva
de una petición de red incierta y no autoriza crear otra clave automáticamente.
Recarga/reapertura/dos pestañas preservan identidad del intento; cuerpo solo memoria.
Estados accesibles: enviando, pendiente, recuperando, completada, conflicto y
dependencia no disponible. Mantener teclado/foco/responsive/diseño existente.

La identidad del intento se conserva también en el formulario abierto: si el POST
ya falló y un GET posterior confirma el éxito, limpiar el descriptor no permite
reenviar ese formulario con otra clave. La asociación usa la UUID efectivamente
reclamada, incluso entre pestañas, y dura hasta abandonar esa intención. Una nueva
navegación de alta puede iniciar otra intención. Los errores definitivos de una
entrada incompatible siguen siendo conflictos aunque la clave tenga otro éxito.
Esta precisión aplica D-006-02/08 a los órdenes de respuesta detectados en revisión;
no añade campos al descriptor persistido ni cambia reglas de negocio.

## D-006-09 — Errores

Mantener409 VERSION_OBSOLETA y CLAVE_IDEMPOTENCIA_REUTILIZADA. Añadir409
OPERACION_EN_PROGRESO/Retry-After:1,404 recuperación inexistente/no visible,
503 DEPENDENCIA_NO_DISPONIBLE. Clave ausente/inválida400 con error controlado
del módulo. Nunca exponer SQL, stack, hash interno o cuerpo almacenado.

## D-006-10 — Criterios aprobados

| ID | Comportamiento observable | Evidencia requerida |
|---|---|---|
| CI-01 | Siete POST con clave; PUT/exclusiones conservados | HTTP/OpenAPI/Angular/regresión |
| CI-02 | Versión evita sobrescritura y mantiene agregado | Carreras PostgreSQL/HTTP |
| CI-03 | Huella determinista, equivalencias y diferencias | Unitarias/replays normalizados |
| CI-04 | Resultado original, incompatible409, un efecto/evento | Persistencia y20 misma clave |
| CI-05 | Permisos vigentes, visibilidad e identidad/CSRF | Revocación/usuarios ajenos/negativos |
| CI-06 | Rollback sin parciales, respuesta perdida y reinicio | PostgreSQL/API/E2E |
| CI-07 | Descriptor mínimo/TTL/recarga/reapertura/dos pestañas | Angular/almacenamiento/E2E |
| CI-08 | V6 conserva V1–V5 y replays004/005, sin purga | Evolución/base nueva/huellas/resultados |
| CI-09 | Espera≤3s, Retry-After, errores seguros y contención | Bloqueo controlado/20 distintas/tiempos |
| CI-10 | Regresión001–005, QA completa y revisión | verify/Angular/Docker/Compose/E2E/auditorías/CI/docs |

Incluir20 peticiones con misma clave y20 distintas, dos versiones, respuesta
perdida después de commit, rollback antes de commit, reinicio, revocación antes
de replay y dos pestañas. PostgreSQL real, API, Angular y E2E. Tiempos observados
son evidencia del entorno, nunca rendimiento productivo ni SLA universal.

Fuentes: [003](../003-proveedores/especificacion.md),
[004](../004-solicitudes-conceptos-importes/especificacion.md),
[005](../005-aprobaciones/especificacion.md), [seguridad](../../docs/seguridad.md).
