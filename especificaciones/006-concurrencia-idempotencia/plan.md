# Plan — 006 Concurrencia e idempotencia

**Estado:** Aprobado por decisión humana AG-013
**Fuente:** Encargo AG-013/D-006-01–10 y [especificación](especificacion.md).

## Secuencia y escritores

Precondición≤20min → contrato/SDD/ADR → backend y Angular en paralelo → pruebas
enfocadas → regresión/Compose/E2E/CI → revisión solo lectura → cierre.
Coordinador: SDD/ADR/docs/MEMORY/índices/CI/qa/infraestructura.
Backend: backend/** salvo V1–V5. Frontend: frontend/** incluyendo E2E.
Evidencias nuevas AG-013 separadas por escritor. HistóricosAG003–012/REV001/ADR1–6
inmutables. Sin comandos Git; máximo tres subagentes, sin escritores solapados.

## Backend y datos

Paquete operaciones: dominio/aplicación/JDBC/HTTP. Reutilizar Clock, transacciones
y SHA-256; sin nuevas dependencias. Cada módulo aporta normalización/autorización.
V6 amplía gestion.operaciones_idempotentes_solicitud sin renombrar: misma PK,
columnas/filas/hash heredados; discriminador huella1 legacy/2 canónica, recurso
proveedor/solicitud, estado HTTP y snapshot tipado. Constraints por operación y
SELECT/INSERT, sin purga ni modificación de éxitos.

Canónica2: UTF-8, campos en orden fijo y marca null/longitud en bytes. Secuencia
operación, usuarioUUID, recursoUUID/null, versión decimal/null, campos normalizados
del dominio. Documentar codificación concreta en ADR antes de validar. SHA-256
hex minúscula. Legacy PRESENTAR usa PRESENTAR:id:version; decisiones conservan
textoParaHuella N o S<longitudUTF16>:texto. No reescribir hashes ni resultados.

Proveedor conserva solo variables tipadas necesarias ProveedorPublico; borrador
solo variables originales y constantes reconstruidas. Guardar resultado/efecto/
evento en una transacción. GET devuelve proyección mínima, nunca snapshot interno.
Consultar permisos actuales DB antes de replay/GET. Fallo PG en autenticación
no debe ocultarse como401 cuando impide conocer resultado:503 controlado.

## Coordinación

PostgreSQL advisory lock transaccional usuario+clave, espacio heredado, adquisición
no bloqueante y plazo monotónico único≤3s. Liberar conexión entre intentos de
espera; pool existente5 no debe quedar ocupado por20 duplicados. Timeout409 y
Retry-After1. Versiones/constraints resuelven competencia con claves diferentes.
Registro local mínimo por usuario+clave, titular único, metadatos operación/recurso/
señal, sin cuerpos; notificar/retirar entrada propia tras commit/rollback.
Duplicado no reemplaza titular. Memoria informa progreso, PG acredita éxito.

Topología actual Compose: una instancia. EN_PROGRESO se observa en esa instancia;
réplicas futuras requieren otro diseño de metadatos/afinidad y prueba. Reinicio
pierde solo progreso efímero y libera transacción; éxitos siguen en PG.
GET lee resultado persistido, luego progreso autorizado y relee resultado antes404
para cerrar ventana commit/retirada. Alta en curso requiere permiso creación y
actor propio, sin exigir recurso todavía no confirmado.

## Contrato compartido

GET /api/operaciones-idempotentes/{clave},200 no-store:

```typescript
type Recuperacion =
  | {estado: 'EN_PROGRESO'; operacion: string; recursoId?: string | null}
  | {estado: 'COMPLETADA'; operacion: string; recursoId: string;
     resultado: {estadoHttp: 200 | 201; id: string; version: number;
                 estado: string; numero?: string | null}};
```

Proveedor estado ACTIVO/INACTIVO; solicitud estado funcional original.
400 UUID inválido,401 identidad inválida,404 inexistente/no visible,503 dependencia.
POST conserva DTO,201/Location o200. Nombres de operación son los de especificación.

## Angular

Servicio común, UUID único, descriptor mínimo24h. Web Locks coordina reclamación
breve entre pestañas y libera antes del HTTP; navegador sin esa capacidad puede
recuperar pero no iniciar nuevas mutaciones protegidas, con mensaje accesible.
Cuerpo/version solo memoria. Recarga consulta resultado, limpia descriptor al
confirmar y abre recurso autorizado.404/error no inicia otra alta ni genera clave.
Contenido persistido exactamente cuatro campos permitidos. El nombre de la clave
de almacenamiento usa un ámbito opaco SHA-256 del identificador del usuario, sin
persistir identidad clara ni credenciales en el descriptor. Permite reautenticación
de la misma cuenta y separa cuentas; no es una credencial ni barrera de autorización.
Mantener PUT, foco, teclado y responsive.

Asociar cada formulario con la clave realmente reclamada, no solo con el tipo de
operación. La confirmación es monotónica y bloquea reenviar la intención anterior
aunque el POST haya fallado antes del GET o desaparezca el descriptor del panel.
La desaparición de localStorage exige consulta autorizada; no acredita éxito.
Conservar conflictos definitivos y permitir una nueva intención al abrir otra alta.
Verificar ambos órdenes POST/GET, dos entradas distintas, detalle no disponible y
confirmación en otra pestaña sin ampliar los campos persistidos.

## Verificación y cierre

Unitarias UUID/canónica/equivalencia/incompatibilidad/errores/permisos/resultados.
IT PostgreSQL nueva yV1–V5→V6; filas/hash/replays;20 mismas/20 distintas/versiones/
rollback/reinicio/espera/revocación. HTTP siete POST y400/401/403/404/409/503/GET.
Angular descriptor/TTL/timeout/recarga/pestañas; E2E respuesta perdida/proveedor/
solicitud/decisión/progreso/revocación/reinicio. Ningún reintento oculta defectos.
verify con Spotless/SpotBugs; typecheck/lint/format/tests/build; Docker sin caché,
Compose200/503, identidad/proveedores/solicitudes/aprobaciones, Swagger, auditorías
autorizadas de metadatos, actionlint, docs/secretos acotados/revisión independiente.
Dos correcciones fallidas bloquean criterio afectado; duplicación no mitigada,
pérdida V4/V5 o imposibilidad de construir bloquean globalmente según encargo.
Horarios Europe/Madrid, huellas, manifiesto sugerido y pendientes.007 solo borrador
si006 completamente verificada y quedan45min del límite de diez horas.
