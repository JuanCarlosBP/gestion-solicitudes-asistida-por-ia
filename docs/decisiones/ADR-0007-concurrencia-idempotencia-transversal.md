# ADR-0007 — Concurrencia e idempotencia transversal

**Estado:** Aprobado
**Origen:** Decisión humana AG-013,D-006-01–10,2026-10-15.
**Contrato:** [Especificación006](../../especificaciones/006-concurrencia-idempotencia/especificacion.md)
y [plan](../../especificaciones/006-concurrencia-idempotencia/plan.md).

## Decisión

Versión optimista evita sobrescribir; idempotencia identifica intento y reproduce
resultado sin repetir efecto. Altas proveedor/borrador, baja/reactivación,
presentación/aprobación/rechazo exigen UUID. PUT conserva versión; GET/identidad/
CSRF/salud conservan garantías específicas. Ámbito global usuario+clave en PG.
SHA-256 canónica2 de operación/actor/recurso/versión/entrada normalizada; codificación
UTF-8 con null y longitudes explícitas. Algoritmo1 legacy se mantiene para filas
004/005 sin recalcular hash.

Canónica2 comienza por ASCII `CI2;`; campos en orden: operación.name, usuarioUUID
minúscula, recursoUUID/null, versión decimal/null y entrada normalizada. Cada null
es `N;`; cada texto es `S` + longitud decimal en bytesUTF8 + `:` + contenido + `;`.
SHA-256 de todos los bytesUTF8, hexadecimal minúscula. Entrada CREAR_PROVEEDOR:
tipo,denominación recortada,país,fiscal normalizado,correo,teléfono; CREAR_BORRADOR:
asunto recortado; estados/PRESENTAR: sin campos extra; APROBAR: comentario nullable;
RECHAZAR: motivo. Legacy conserva texto `N` o `S<longitudUTF16>:texto` de005.

Efecto/evento/resultado exitoso en una transacción. Snapshot tipado estrictamente
necesario para DTO original, nunca petición/cabeceras/errores. Proveedor exige
campos públicos originales porque podrían editarse después; borrador reconstruye
constantes. Recuperación devuelve solo estadoHTTP/id/versión/estado/número opcional,
sin fiscal/contacto/textos/snapshot. Permisos actuales y visibilidad preceden replay;
JWT antiguo o clave conocida no conceden acceso. CSRF se mantiene. PG caído503.

Advisory lock transaccionalPG serializa usuario+clave con plazo único≤3s y sin
retener conexiones entre intentos. Timeout409 OPERACION_EN_PROGRESO/Retry-After1.
Rollback deja reintentar. Mapa efímero mínimo informa progreso en la instancia
actual; nunca acredita éxito. Réplicas requieren revisar metadatos/afinidad y probar.
V6 amplía tabla existente: evita trasladar filas/duplicar lectores y conserva
PK/columnas/huellas/resultados. Constraints por operación y privilegios mínimos.

Angular conserva solo clave/operación/recurso/fecha24h; cuerpo solo memoria.
Timeout no genera nueva clave. GET recupera y limpia tras éxito.404 no demuestra
ausencia definitiva. Coordinar pestañas/cuenta sin persistir credenciales.

La confirmación recuperada no retrocede ante respuestas tardías. El formulario
mantiene en memoria la asociación con la UUID efectiva para impedir otra alta
del mismo intento después de limpiar el descriptor, también cuando el POST falló
antes del GET. Una nueva navegación inicia otra intención; el éxito de una clave
no convierte en éxito una entrada incompatible. La eliminación del descriptor en
otra pestaña provoca consulta autorizada y nunca sustituye esa consulta.

## Retención y operación

Sin purga automática v1. Crecimiento O(éxitos con clave nueva), incluidos no-op,
más índices. Tamaño depende del DTO y se medirá; PK usuario+clave permite replay
e índice de recurso facilita trazabilidad. Consulta prevista para comprobar en QA:

```sql
SELECT pg_size_pretty(pg_total_relation_size('gestion.operaciones_idempotentes_solicitud'));
```

Riesgo residual: crecimiento ilimitado; vigilar capacidad.007/008 acordará retención
jurídica/operativa y archivo/tombstone que impida repetir efectos antiguos. Sin plazo
legal inventado. TTL cliente no purga servidor. Medición local no equivale a SLA.

## Alternativas rechazadas

| Alternativa | Motivo |
|---|---|
| Clave como permiso | Evita revocación y facilita acceso indebido. |
| Guardar cuerpos completos de petición | Persistencia innecesaria y acoplamiento al transporte. |
| Cachear errores | Impide reintento tras corregir dependencia/permisos/validación. |
| Clave nueva tras timeout | Puede duplicar efecto confirmado. |
| Espera ilimitada | Agota recursos y bloquea recuperación. |
| Editar V4/V5 | Rompe checksums y trazabilidad existente. |
| Replay desde recurso actual | Cambia el resultado histórico. |
| Redis o microservicio | Complejidad sin necesidad aprobada. |
| Purga con plazo inventado | Repite efectos y presupone política legal. |

Verificar migración/carreras/permisos/rollback/reinicio y navegador sobre fuentes
finales. Aceptación/integración corresponden a la persona responsable.
