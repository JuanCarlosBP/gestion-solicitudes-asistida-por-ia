# ADR-0005 — Solicitudes, importes y presentación

**Estado:** Aprobado por decisión humana AG-012
**Origen:** D-004-01–11 y autorización integral de004.

## Decisión

Solicitud y sus conceptos constituyen un agregado. Guardar reemplaza cabecera y
colección en una transacción, protegida por versión esperada y estado BORRADOR.
Retirar conceptos edita el agregado; no existe borrado físico de solicitudes.
UUID, número, autor, estado, fechas e importes los decide el servidor.

BigDecimal evita aproximación binaria. Cantidad15,3 y precio15,4 se multiplican
exactamente, HALF_UP por línea a2 decimales; total suma líneas redondeadas y se
limita antes de persistir. JSON transporta decimales como texto para preservar
precisión en JavaScript. El cálculo previo Angular es una estimación.

Proveedor es referencia viva en borrador y fotografía inmutable al presentar,
sin duplicar catálogo ni alterar su visibilidad. Supervisor se selecciona entre
usuarios habilitados con rol, se revalida al presentar y debe ser distinto del
autor. Asignación fija después. Los bloqueos de referencias serializan cambios
concurrentes con la presentación.
Una función SECURITY DEFINER de consulta/bloqueo mínimo protege la relación de
rol actual; propietario migrador, search_path fijo y PUBLIC sin EXECUTE. Solo
gestion_app puede invocarla; no se concede UPDATE general de usuarios_roles.
No usa SQL dinámico ni devuelve hashes. Privilegios se verifican en integración.

Versión optimista y UPDATE condicional previenen sobrescritura. El bloqueo del
agregado hace coherente reemplazo/presentación. Idempotencia local persistida,
unique(usuario,clave), huella de operación/solicitud/versión y resultado mínimo
exacto comparte transacción con la transición. Replay autorizado precede al
control de versión actual. No caduca ni purga automáticamente en004; expira_en
nullable documenta la decisión pendiente de retención, sin inventar plazo.

Secuencia segura no cíclica y año Europe/Madrid producen SOL-AAAA-NNNNNN;
huecos permitidos, sin reinicio anual, agotamiento controlado. Listado offset
acotado y visibilidad en SQL antes del conteo;100000 es previsión, no benchmark.
Ver contrato exacto en [plan004](../../especificaciones/004-solicitudes-conceptos-importes/plan.md).

## Alternativas rechazadas

| Alternativa | Motivo |
|---|---|
| Totales o estados enviados libremente por cliente | Permitiría alterar reglas, permisos e importes. |
| double/float o redondear solo el total | Pérdida de precisión e incumplimiento de los ejemplos aprobados. |
| CRUD independiente de conceptos | Complica atomicidad y permite líneas/cabecera descoordinadas. |
| Referencia viva después de presentar | Un cambio de catálogo reescribiría el significado histórico de la solicitud. |
| Última escritura gana | Oculta cambios concurrentes. |
| Idempotencia solo en memoria o pospuesta a006 | No garantiza efecto único ante concurrencia/reinicio en004. |
| Unique por solicitud y clave | No detecta reutilización incompatible entre recursos del mismo usuario. |
| Replay construido desde estado actual | Cambiaría el resultado original después de005. |
| Permisos solo en Angular | REST permitiría eludirlos. |

## Consecuencias y límites

Más filas y bloqueos transaccionales a cambio de integridad verificable.
DELETE de conceptos se limita a esa tabla y a la edición del agregado; sin DELETE
en solicitudes/idempotencia. No se generaliza infraestructura006 ni se crean
aprobaciones/historial completo. Eventos técnicos mínimos no son historial007.
Retención/eliminación legal, carga100000, WCAG y OWASP completos siguen pendientes.
