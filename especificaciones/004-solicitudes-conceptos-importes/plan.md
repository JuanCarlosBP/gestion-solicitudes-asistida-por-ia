# Plan — 004 Solicitudes, conceptos e importes

**Estado:** Aprobado por decisión humana AG-012
**Origen:** orden integral AG-012; contrato conciliado antes de implementar.

## Arquitectura y responsabilidades

Monolito modular, paquete solicitudes con dominio, aplicación, persistencia JDBC
y HTTP. Reutilizar identidad/CSRF, Clock y transacciones existentes, sin nueva
dependencia. Angular organiza solicitudes por funcionalidad. El coordinador
consolida documentación/QA/CI; implementadores son escritores exclusivos de
backend y frontend respectivamente. Revisor separado solo lee.

## Contrato compartido cerrado

UUID canónico, fechas Instant ISO, decimales JSON como cadenas ordinarias sin
exponente (cantidad escala3, precio escala4, importes escala2 en respuestas).
Longitudes por puntos de código Unicode tras recorte exterior de textos.
Rechazar campos desconocidos, incluidos los de conceptos. Versión entero no
negativo del servidor; la entrada solo aporta versión esperada.

POST /api/solicitudes recibe {asunto}; devuelve201/Location y DetalleSolicitud.
GET /api/solicitudes/{id} devuelve DetalleSolicitud.
PUT recibe {asunto,descripcion,proveedorId,supervisorId,version,conceptos}.
descripcion/proveedorId/supervisorId son null cuando no existen; conceptos array.
Cada entrada de concepto: {id,descripcion,cantidad,unidad,precioUnitario,posicion}.
id null crea UUID servidor; id existente debe pertenecer al agregado, no repetido.
Posiciones positivas únicas, sin exigir contigüidad. Omitir una línea la retira.
PUT devuelve200 con detalle actualizado. Borrador permite colección vacía.

DetalleSolicitud:

```typescript
{
  id: string; numero: string;
  autor: {id: string; nombreVisible: string};
  asunto: string; descripcion: string | null;
  proveedorId: string | null;
  proveedor: {id: string; tipo: 'PERSONA_JURIDICA' | 'PROFESIONAL';
    denominacion: string; paisFiscal: string; identificadorFiscal: string;
    activo: boolean | null} | null;
  supervisorId: string | null;
  supervisor: {id: string; nombreVisible: string} | null;
  moneda: 'EUR'; estado: 'BORRADOR' | 'PRESENTADA'; importeTotal: string;
  version: number; creadoEn: string; actualizadoEn: string;
  presentadoEn: string | null;
  conceptos: {id: string; descripcion: string; cantidad: string; unidad: string;
    precioUnitario: string; importeLinea: string; posicion: number}[];
}
```

ResumenSolicitud es DetalleSolicitud sin descripcion ni conceptos. Lista devuelve
{elementos:ResumenSolicitud[],pagina,tamano,totalElementos,totalPaginas}.
Filtros numero exacto, asunto contiene literal hasta160, estado, proveedor/autor/
supervisor UUID, fechaDesde/fechaHasta YYYY-MM-DD sobre creadoEn (días inclusivos
UTC; rango invertido400), page0, size20 máximo100, sort actualizadoEn,desc.
Ordenes numero/creadoEn/actualizadoEn/importeTotal, asc/desc, desempate id asc.
Parámetros duplicados/desconocidos400; autor sin visibilidad global403.
SQL aplica filtros AND y unión de visibilidad antes de COUNT/LIMIT.

POST /api/solicitudes/{id}/presentar recibe {version}, Idempotency-Key UUID y CSRF.
Devuelve200 y persiste ResultadoPresentacion exacto:
{id,numero,estado:'PRESENTADA',version,actualizadoEn,presentadoEn,moneda:'EUR',importeTotal}.
La UI consulta después el detalle. Repetición devuelve ese resultado persistido,
incluso tras futura005, nunca una reconstrucción desde un estado posterior.

GET /api/identidad/supervisores autenticado: nombre contiene literal máximo128,
page0/size20 máximo100. Página estándar de {id,nombreVisible}; solo habilitados
con SUPERVISOR distintos del actor; orden nombreVisible asc/id asc. Sin correo,
roles internos, sesiones ni hashes.

Proveedor del borrador refleja catálogo actual. Si queda inactivo, se conserva
proveedorId; proveedor=null para actores sin permiso de leer inactivos en003.
Presentada muestra fotografía a lectores autorizados, activo=null para evitar
afirmar vigencia del catálogo. Selector de proveedores usa API003 de activos.

## Persistencia V4 y transacciones

Secuencia PostgreSQL no cíclica 1–999999, sin reinicio anual; número SOL-AAAA-NNNNNN
con año del Clock en Europe/Madrid. Huecos permitidos; agotamiento controlado503.
Solicitudes con UUID/FKs/versión, cabecera, estado cerrado, EUR, total numeric(15,2),
fechas y snapshot. Conceptos con FK, posición unique por solicitud, cantidad
numeric(15,3), precio numeric(15,4), importe numeric(15,2), unidad y límites.
FK y restricciones sin líneas huérfanas. Privilegios mínimos: no DELETE solicitudes
ni idempotencia; DELETE solo conceptos para reemplazo del agregado, no API de borrado.
Índices de número, visibilidad/estado/orden y referencias. Offset acotado para
previsión100000, sin prometer latencia ni aceleración de contiene mediante B-tree.

Guardar bloquea agregado y mantiene UPDATE id+version+BORRADOR, valida colección
y reemplaza atómicamente. Fallo revierte cabecera y líneas. Lecturas consistentes
con transacción repeatable-read. Clock truncado a microsegundos y fecha creciente.
Presentar bloquea solicitud y referencias proveedor/usuario/rol actual durante
validación. Revalidar habilitación/rol; proteger carreras con baja/cambio.
El bloqueo de la relación de rol usa función SQL SECURITY DEFINER mínima,
propiedad del migrador, search_path fijo pg_catalog,gestion, PUBLIC revocado y
EXECUTE solo para gestion_app. Devuelve solo id/nombre/habilitado y no permite
mutar roles. Evita conceder UPDATE general de usuarios_roles a la aplicación;
privilegios y ausencia de datos internos deben comprobarse en PostgreSQL real.

Idempotencia unique(usuario,clave); huella SHA-256 de operación+solicitud+versión.
Comprobar actor/recurso, luego repetición antes de validar estado/versión actual.
Serializar clave también entre solicitudes; una incompatibilidad devuelve409.
Guardar resultado mínimo y transición en la misma transacción. expira_en nullable,
sin caducidad ni purga automática004; decisión de retención pendiente006/007/008.
La clave no concede permisos. Eventos tras commit y rechazos fuera de rollback;
solo acción/usuario/solicitud/resultado/petición/hash de clave, nunca cuerpos.

## Cálculo e interfaz

BigDecimal multiplica exactamente y HALF_UP por línea; suma redondeadas. Validar
producto/total antes de almacenar. Una línea positiva puede redondearse a0.00;
es válida, pero presentación exige total>0. Frontend usa cálculo decimal exacto
para estimación, claramente separado del total confirmado; nunca autoridad.
Tokens CSS compartidos sin dependencia, navegación/paneles/chips, editor en tabla
y móvil legible, resumen y acciones visibles, estados completos, foco/contraste
y reduced-motion. Conservar entrada en409; recarga explícita. Confirmar presentar.

## Verificación, riesgos y entrega

Matriz completa SCI en especificación/tareas. Unitarias de límites y cálculos;
HTTP de permisos/errores/filtros; PostgreSQL real de migración/privilegios/rollback
y carreras sincronizadas (no solo mocks). Angular servicio/páginas/editor/rutas,
E2E13 pasos y capturas360/768/1440. Regresión001–003 previa al desarrollo sustancial.
Luego verify/Spotless/SpotBugs, todos los controles Angular, Docker/Compose/Swagger,
auditorías/actionlint/documentación/secretos y revisión independiente.
Contador máximo dos correcciones por defecto. Mantener evidencia de cada fallo.
No Git, versiones mayores, aceptación o integración automática. ADR0005 explica
alternativas. CI remota y decisiones de aceptación quedan humanas.
