# Plan — 005 Aprobaciones

**Estado:** Aprobado por decisión humana AG-012
Decisiones D-005-01–08 y puerta005 cumplida a00:09:52+02:00,564 minutos restantes.
El planificador solo leyó fuentes y propuso el contrato; la autoridad de aprobación
es el encargo humano. Se redacta antes de implementar005.

## Contrato HTTP cerrado

Bearer y CSRF obligatorios; `Idempotency-Key` UUID canónico; respuestas no-store.
Entradas estrictas, sin campos extra y con versión entera no negativa.

| Ruta | Entrada | Resultado200 |
|---|---|---|
| POST /api/solicitudes/{id}/aprobar | {version,comentario?:string\|null} | ResultadoDecision, estadoAPROBADA |
| POST /api/solicitudes/{id}/rechazar | {version,motivo:string} | ResultadoDecision, estadoRECHAZADA |

Comentario recortado Unicode, vacío→null y máximo500 puntos de código; motivo
recortado de10–1000. Rechazar UTF-16 incompleto y tipos incorrectos. La versión
es la esperada; estado, actor y fechas siguen siendo autoridad del servidor.

```typescript
interface ResultadoDecision {
  id: string;
  numero: string;
  estado: 'APROBADA' | 'RECHAZADA';
  version: number;
  actualizadoEn: string;
  decididoEn: string;
}
interface DecisionSolicitud {
  tipo: 'APROBAR' | 'RECHAZAR';
  actor: { id: string; nombreVisible: string };
  comentario: string | null;
  motivo: string | null;
  decididoEn: string;
}
```

ResumenSolicitud conserva004 y añade `decididoEn:string|null`, sin texto de
decisión. DetalleSolicitud añade `decision:DecisionSolicitud|null`. BORRADOR y
PRESENTADA tienen ambos null. Aprobar devuelve motivo null; rechazar comentario
null. Nombre visible del actor fotografiado al decidir. Decimales/fechas y resto
del contrato004 se conservan. ResultadoPresentacion y sus replays NO cambian.

400 SOLICITUD_INVALIDA;401/403 existentes;404 SOLICITUD_NO_ENCONTRADA cuando no
exista o no sea visible.409 VERSION_OBSOLETA para PRESENTADA con versión distinta,
SOLICITUD_NO_DECIDIBLE para BORRADOR/final, CLAVE_IDEMPOTENCIA_REUTILIZADA para
clave incompatible.500/503 controlados. Estado se comprueba antes de versión para
una nueva decisión; replay compatible autorizado precede a ambos.

## Autorización y transacción

Actor con SUPERVISOR, asignado y distinto del autor. La autenticación existente
comprueba sesión/habilitación, pero los roles proceden del JWT. La decisión
revalida y bloquea usuario/rol vigente con la función V4 existente; no cambia la
autenticación global. Retirada del rol invalida también replay con JWT vigente.
Deshabilitado antes del filtro401; autorización revocada dentro del servicio403.
La visibilidad se comprueba antes de devolver datos o resultados idempotentes.

Orden: bloqueo usuario/clave → bloqueo solicitud → visibilidad/asignación/noautor
y supervisor vigente → lectura de idempotencia → replay o conflicto de huella →
estado/versión → UPDATE condicional PRESENTADA → evento → resultado → commit.
Una excepción revierte las tres escrituras. La misma clave compatible concurrente
reproduce el resultado; decisiones distintas concurrentes dan un éxito y un409.
Se mantiene el orden de bloqueos de004 y se prueban carreras con retirada de rol.

No revalidar proveedor activo al decidir: la fotografía está fijada. No cambiar
cabecera, conceptos, importes, presentadoEn, proveedor ni supervisor. Lectura del
supervisor asignado abarca PRESENTADA/APROBADA/RECHAZADA, nunca borradores ajenos;
se aplica en dominio y SQL antes del conteo. Roles globales y unión004 se conservan.

## Migración V5 e idempotencia compartida

V1–V4 quedan intactas. V5 amplía CHECK de estados y condiciones de presentación
a todo estado distinto deBORRADOR, preservando fotografía/referencias/total.

Tabla `decisiones_solicitud`: UUID, solicitud_id UNIQUE/FK, actor_id FK,
actor_nombre_visible varchar(120), tipo APROBAR/RECHAZAR, comentario nullable500,
motivo nullable1000, decidido_en, version_anterior/version_resultante e identificador
de peticiónUUID. Checks de tipo/texto y versión resultante=anterior+1. Un evento
por solicitud. `gestion_app`: SELECT/INSERT, sin UPDATE/DELETE ni DDL. La fecha
decididoEn se obtiene del evento mediante JOIN; no se duplica en solicitudes.

Idempotencia conserva PK(usuario_id,clave), columnas/filas y huella heredada
`PRESENTAR:<id>:<version>`. V5 admite APROBAR/RECHAZAR y añade resultado_decidido_en
nullable, con checks coherentes entre operación, estado y fechas del resultado.
El lector discrimina tipo antes de materializar respuesta. Resultado público de
decisión omite campos exclusivos de presentación aunque existan campos comunes
en la fila. Representación inequívoca de operación/id/versión/texto normalizado
para SHA-256; null y cadenas se codifican sin ambigüedad. Misma clave incompatible
entre operaciones o recursos409. No caducidad/purga automática nueva.

El evento es el mínimo de negocio solicitado, no historial007. Texto solo en
detalle autorizado; logs técnicos contienen acción/actor/solicitud/resultado/
petición/hash no reutilizable, nunca comentario, motivo, tokens o cuerpos.

## Angular y experiencia

Ruta `/aprobaciones` con guard SUPERVISOR y navegación de pendientes. Reutiliza
GETsolicitudes con supervisor=actor y estado=PRESENTADA forzados, incluso con rol
global; filtros del usuario no pueden ampliar esa bandeja. El listado general
admite los cuatro estados. Detalle conserva lectura final para roles autorizados.

Solo supervisor asignado no autor ve acciones en PRESENTADA. Formularios de
comentario/motivo, confirmación explícita y botones distinguibles; validación,
carga, éxito, conflicto recuperable y foco. Tras resultado200 y GET fallido no
permitir otra decisión hasta recuperar el detalle. En respuesta incierta se
conservan clave y petición originales para repetir; no generar otra clave de forma
silenciosa. Tokens, paneles, chips y accesibilidad004; capturas360/768/1440.

## Verificación y orden

Aplicar los IDs AP-01–10 de especificación005 (AP08 interfaz; AP09 datos/eventos).
Dominio/textos/estados; HTTP por rol/actor/CSRF; PostgreSQL real para V4→V5,
base nueva, segundo arranque, privilegios, rollback forzado y carreras sincronizadas
aprobar/aprobar, rechazar/rechazar y aprobar/rechazar, misma/distinta clave y rol.
Comprobar replay004 después de decisión y replay005 después de reinicio/revocación.

Angular cubre servicio, bandeja forzada, finales, confirmación, reintento, conflicto
y accesibilidad. E2E real aprueba/rechaza y consulta por roles, impide tercero,
comprueba versión/replay y móvil/teclado/recarga. No se reducen pruebas001–004:
los negativos de estado inválido se adaptan a un estado realmente no admitido.

Builds limpios finales, Compose200/503, auditorías vigentes sin nuevas dependencias,
actionlint, documentación/secretos, manifiestos y revisión independiente. Un
escritor por archivo. Máximo dos correcciones fallidas por defecto. Todo PASS
local se apoya en evidencia; aceptación y Git siguen siendo humanos.
