# ADR-0008 — Historial de negocio y consulta

**Estado:** Decisiones de alcance aprobadas por AG-014; concreción técnica para007.
**Fuente:** [D-007-01–10](../../especificaciones/007-historial-auditoria/especificacion.md).

## Decisión

Registrar siete cambios duraderos de proveedores/solicitudes desde V7 dentro de
la transacción de negocio. Un fallo de auditoría revierte también efecto y resultado
idempotente. SELECT/INSERT exclusivos para gestion_app, sin UPDATE/DELETE.
Los logs técnicos posteriores al commit no sustituyen esta persistencia.

V5 sigue siendo autoridad única de APROBADA/RECHAZADA. UNION ALL de proyecciones
mínimas une fuentes sin duplicarlas. Clave estable prefijada EVENTO:UUID o
DECISION:UUID; fecha DESC y clave DESC resuelven empates sin atribuir cronología
al UUID. Conteo/elementos coherentes dentro de una lectura; offset no garantiza
snapshot entre páginas frente a nuevas escrituras.

No reconstruir hechos desde fechas o datos actuales: esas columnas no conservan
actor ni estados intermedios. Ausencia creaciónV7 implica aviso de cobertura
anterior desconocida, calculado sin filtros; decisionesV5 previas siguen visibles.
No hay purga: una retención jurídica/operativa definitiva requiere decisión
posterior y preservación de replays. El TTL cliente no decide conservación.

El backend revalida identidad/roles actuales y recurso antes de contar/devolver.
Unión multirrol preserva004/005; supervisor no ve borradores ajenos.
Nombres fotografiados mínimos; resúmenes cerrados; ningún fiscal/contacto,
descripción/conceptos, comentario/motivo, secreto, cuerpo, hash o clave idempotente.
El detalleV5 autorizado conserva comentario/motivo en su contrato original.

## Alternativas rechazadas

| Alternativa | Motivo |
|---|---|
| Backfill desde created/updated, logs o Git | No demuestra hechos ni actores anteriores; inventa historia. |
| Duplicar decisiones V5 | Dos autoridades con riesgo de divergencia y doble conteo. |
| Auditoría afterCommit | Puede confirmar negocio sin evento y rompe atomicidad. |
| Guardar cada HTTP/cuerpo completo | Duplica replays y conserva datos privados innecesarios. |
| Permisos o filtros solo Angular/JWT | Permite acceso directo o rol revocado y conteos ocultos. |
| Solo ordenar por fecha o interpretar UUID como secuencia | Empates inestables o cronología falsa. |
| Purga o plazo legal arbitrario | Falta decisión y puede romper trazabilidad/replay. |
| Kafka/Redis/otra BD/microservicio | Infraestructura innecesaria y dificulta atomicidad requerida. |
| Afirmar inalterabilidad absoluta | Administrador de BD conserva capacidad de alteración. |

## Consecuencias

Crecimiento O(cambios exitosos nuevos) más índices, sin cuerpo completo ni copiaV5.
La medición local debe identificar volumen y límites; no garantiza SLA.
Nombres visibles son datos personales mínimos: acceso, finalidad y conservación
requieren seguimiento. Retención definitiva, archivo y operación multiinstancia
quedan para decisiones posteriores, sin quitar controles a v1.
