# API y rutas de identidad y proveedores

**Estado:** Contratos de identidad AG-010 y proveedores AG-011; comprobaciones respectivas en [validación 003](../../especificaciones/003-proveedores/validacion.md) y
[validación 002](../../especificaciones/002-identidad-acceso/validacion.md).

Frontend y API comparten origen a través de Nginx. Los cuerpos propios usan JSON
y los errores controlados solo incluyen `error`. El backend decide el acceso.
OpenAPI 3.1 en `/v3/api-docs` y Swagger en `/swagger-ui/index.html` son públicos
únicamente bajo local/test. Los endpoints de identidad no son un servidor OAuth.

## Operaciones

| Método y ruta | Acceso y entrada | Resultado |
|---|---|---|
| GET `/api/salud` | Público | 200 `{"estado":"DISPONIBLE"}` o 503 `{"estado":"NO_DISPONIBLE"}`. |
| GET `/api/autenticacion/csrf` | Público | 204; materializa cookie XSRF-TOKEN. |
| POST `/api/autenticacion/iniciar-sesion` | XSRF y `{correo, contrasena}` | 200 con acceso y cookie refresh; 401 genérico. |
| POST `/api/autenticacion/renovar` | XSRF y cookie REFRESH-TOKEN | 200 con nuevo acceso y refresh rotado; 401 y cookie borrada si no es válido. |
| POST `/api/autenticacion/cerrar-sesion` | XSRF y cookie REFRESH-TOKEN cuando exista | 204 idempotente, revocación de sesión y borrado de cookie. |
| GET `/api/identidad/yo` | Authorization: Bearer | 200 con usuario público; 401 si no hay acceso válido. |

La respuesta de login/refresh tiene `accessToken`, `tipoToken` igual a `Bearer`,
`expiraEn` en segundos y `usuario`. Este último, y `/yo`, contienen exclusivamente
`id`, `correo`, `nombreVisible` y `roles`. No se devuelve el refresh en JSON.
El JWT debe conservarse solo en memoria; nunca en URL, logs o almacenamiento web.

## CSRF, errores y caché

Obtener primero CSRF y enviar el valor de `XSRF-TOKEN` como `X-XSRF-TOKEN` en
cada POST/PUT. La cookie XSRF puede leerla Angular; la cookie refresh es HttpOnly.
No enviar Bearer a las operaciones de autenticación: un JWT caducado no debe
interferir con la renovación. Cada uso correcto del refresh lo sustituye.

| HTTP | Cuerpo | Significado |
|---|---|---|
| 401 | `{"error":"CREDENCIALES_INVALIDAS"}` | Login incorrecto, cuenta inexistente, bloqueada o deshabilitada; misma forma. |
| 401 | `{"error":"NO_AUTENTICADO"}` | Credencial de acceso/refresh ausente, inválida, caducada o revocada. |
| 403 | `{"error":"ACCESO_NO_PERMITIDO"}` | CSRF inválido o usuario autenticado sin permiso. |
| 500 | `{"error":"ERROR_INTERNO"}` | Fallo inesperado controlado; sin detalle interno. |

Toda API no autorizada expresamente se deniega por defecto; AG-011 añade las operaciones de proveedores descritas abajo. No existen endpoints artificiales
para probar roles: se usan componentes exclusivos de las pruebas.
Autenticación e identidad envían `Cache-Control: no-store` y `Pragma: no-cache`.
Cierre añade `Clear-Site-Data: "cache"`; no borra indiscriminadamente el origen.

Swagger define el esquema Bearer para `/yo`. Su botón Authorize admite un JWT de
acceso emitido por login; el control del backend y su caducidad siguen vigentes.
No se habilita almacenamiento persistente de autorización. Las operaciones
mutables se prueban con Angular o con clientes que cumplan CSRF.

## Navegación Angular

| Ruta | Comportamiento |
|---|---|
| `/` | Redirige a `/inicio`, conservando 001. |
| `/inicio` | Estado técnico, carga, recuperación y mensajes accesibles. |
| `/acceso` | Formulario con correo, contraseña, estado de carga y mensaje genérico. |
| `/mi-cuenta` | Guard de sesión; identidad pública y cierre. |
| Desconocida | Página no encontrada con enlace de vuelta. |

Al arrancar se obtiene CSRF y se intenta restaurar por refresh. Un fallo deja
al usuario sin sesión y permite utilizar las rutas públicas. El guard protege
la navegación; la API vuelve a validar el Bearer y la sesión en PostgreSQL.
Ante 401 se comparte una única renovación entre peticiones concurrentes y cada
petición solo se reintenta una vez. Logout espera operaciones de autenticación
en vuelo y descarta resultados tardíos mediante el estado de sesión.

## Catálogo de proveedores — contrato AG-011

Bearer válido en todas las rutas siguientes y X-XSRF-TOKEN en POST/PUT.
La validación del incremento conserva la evidencia real, sin alterar la de 002.

| Método/ruta | Permiso/entrada | Resultado |
|---|---|---|
| POST /api/proveedores | ADMINISTRADOR; campos editables | 201, Location y proveedor activo/version=0. |
| GET /api/proveedores/{id} | Cualquier rol aprobado; visibilidad según estado | 200 o 404. |
| GET /api/proveedores | Cualquier rol; filtros/página | 200 página. |
| PUT /api/proveedores/{id} | ADMINISTRADOR; editables y version | 200, versión incrementada. |
| POST /api/proveedores/{id}/desactivar | ADMINISTRADOR; {version} | 200, baja lógica o repetición vigente sin cambios. |
| POST /api/proveedores/{id}/reactivar | ADMINISTRADOR; {version} | 200, reactivación o repetición vigente sin cambios. |

Editables: tipo (PERSONA_JURIDICA/PROFESIONAL), denominacion, paisFiscal,
identificadorFiscal, correoContacto y telefonoContacto. Se rechazan extras e
internos. DTO público añade id/activo/version/creadoEn/actualizadoEn; contactos
opcionales null. No devuelve identificadorFiscalNormalizado. PUT no modifica
activo/id/creadoEn. Límites completos en la especificación 003.

Listado: page=0, size=20 (1–100), sort=denominacion,asc (campos denominacion,
creadoEn/actualizadoEn; asc/desc; desempate id asc). Filtros AND denominacion
(contiene literal hasta 128, mayúsculas indiferentes/acentos significativos),
identificadorFiscal (exacto normalizado), tipo, paisFiscal, activo=true|false|todos.
Predeterminado true; false/todos requieren AUDITOR o ADMINISTRADOR. Devuelve
{elementos,pagina,tamano,totalElementos,totalPaginas}. Página vacía conserva total.

SOLICITANTE/SUPERVISOR ven solo activos; AUDITOR lee ambos estados y no escribe;
ADMINISTRADOR lee/escribe ambos. Unión de roles explícitos; ninguno elude reglas.
404 oculta recursos inexistentes o no visibles. No existe DELETE.
Errores seguros {error:CODIGO}: 400 SOLICITUD_INVALIDA; 401/403 como identidad;
404 PROVEEDOR_NO_ENCONTRADO; 409 PROVEEDOR_DUPLICADO o VERSION_OBSOLETA;
500 ERROR_INTERNO y503 DEPENDENCIA_NO_DISPONIBLE, sin detalles internos.
Respuestas privadas no-store. La autenticación Bearer rota la cookie CSRF;
el servidor materializa su reemplazo en la misma respuesta. El cliente debe
respetar Set-Cookie y usar el valor vigente en cada escritura.

La versión conocida protege PUT y ambos cambios de estado, incluso cuando el
estado deseado ya coincide. Con versión vigente, repetir estado conserva versión
y fecha. La identidad fiscal incluye inactivos. Normalización NFKC, recorte,
Locale.ROOT mayúsculas y colapso de espacio Unicode sin quitar puntuación;
validar longitud antes/después, sin checksum jurídico universal.

Angular: /proveedores, /proveedores/nuevo, /proveedores/:id y
/proveedores/:id/editar. Filtros en query params, navegación directa/recarga y
conflicto con opción de recargar. No publicar URLs completas de búsquedas fiscales
en logs ni evidencias. Swagger documenta operaciones y Bearer; las escrituras
siguen exigiendo CSRF. Los controles de UI no sustituyen autorización REST.

## Solicitudes — contrato AG-012

Bearer obligatorio; CSRF en POST/PUT; respuestas privadas no-store. DTO cerrados,
decimales JSON como cadenas, importes escala2; versión esperada en cada escritura.

| Método/ruta | Entrada y resultado |
|---|---|
| POST /api/solicitudes | SOLICITANTE, {asunto};201/Location y borrador mínimo. |
| GET /api/solicitudes/{id} | Detalle visible con conceptos ordenados;404 inexistente/no visible. |
| GET /api/solicitudes | Página de resúmenes sin descripción/colección, filtros acotados. |
| PUT /api/solicitudes/{id} | Autor con SOLICITANTE y BORRADOR; cabecera/colección completas y version;200 recalculado. |
| POST /api/solicitudes/{id}/presentar | Autor, {version}, Idempotency-Key UUID;200 resultado mínimo persistido. |
| GET /api/identidad/supervisores | Autenticado; página de id/nombreVisible, habilitados SUPERVISOR distintos del actor. |

Contrato preciso y nulabilidad en [plan004](../../especificaciones/004-solicitudes-conceptos-importes/plan.md).
Filtros: numero exacto, asunto contiene literal sin distinguir mayúsculas y con
acentos significativos, estado/proveedor/supervisor, autor solo lectura global,
fechaDesde/fechaHasta díasUTC inclusivos sobre creadoEn. page0/size20 máximo100;
sort actualizadoEn,desc, campos cerrados numero/creadoEn/actualizadoEn/importeTotal,
desempate id asc. Visibilidad antes de count. Selector nombre máximo128 y mismo
límite de página. Parámetros desconocidos/duplicados400.

SOLICITANTE lee propias y escribe borradores propios; SUPERVISOR lee asignadas
presentadas; AUDITOR/ADMINISTRADOR leen todas. Roles suman permisos explícitos;
administrador solo crea/edita como solicitante si también tiene SOLICITANTE.
Presentada no se edita. Proveedor visible es snapshot tras presentar; estado activo
null en snapshot. Borrador mantiene referencia a proveedor que quede inactivo,
pero no muestra catálogo inactivo a quien003 no permita consultarlo.

400 SOLICITUD_INVALIDA;401/403 generales;404 SOLICITUD_NO_ENCONTRADA;
409 VERSION_OBSOLETA, SOLICITUD_NO_EDITABLE, PROVEEDOR_INACTIVO,
SUPERVISOR_INVALIDO, CLAVE_IDEMPOTENCIA_REUTILIZADA;500/503 controlados.
Repetición con misma clave/usuario/operación/solicitud/versión devuelve resultado
original; distinta petición409. La clave nunca sustituye autorización.

Angular: /solicitudes, /solicitudes/nueva, /solicitudes/:id y /solicitudes/:id/editar.
Estimación decimal antes de guardar y total confirmado después; presentar requiere
confirmación, referencias válidas,1–100 conceptos y total positivo. Ejemplos:
1×10.0000=10.00;2.500×4.1250=10.31;3×0.3350=1.01; suma21.32EUR.

## Decisiones — ampliación005 de AG-012

Contrato aprobado en [plan005](../../especificaciones/005-aprobaciones/plan.md),
con implementación y pruebas locales superadas. POST `/api/solicitudes/{id}/aprobar`
recibe versión y comentario opcional/null hasta500 puntos Unicode. POST
`/api/solicitudes/{id}/rechazar` recibe versión y motivo de10–1000 puntos Unicode.
Ambos exigen Bearer, CSRF e Idempotency-Key UUID; cuerpo cerrado y no-store.

Solo SUPERVISOR asignado distinto del autor decide; rol/habilitación se revalidan
antes de replay. Resultado200 mínimo: id,numero,estado,version,actualizadoEn,
decididoEn. Estados finales APROBADA/RECHAZADA.409 SOLICITUD_NO_DECIDIBLE para
borrador/final, VERSION_OBSOLETA para presentada con versión distinta y
CLAVE_IDEMPOTENCIA_REUTILIZADA si cambia la petición.401/403/404 conservan las
reglas de identidad/permiso/visibilidad; sin rolSUPERVISOR se deniega403 antes del
recurso, mientras un supervisor sin visibilidad recibe404.

El resumen añade decididoEn nullable, sin comentario/motivo. El detalle añade
decision nullable con tipo APROBAR/RECHAZAR, actor{id,nombreVisible}, comentario,
motivo y decididoEn. BORRADOR/PRESENTADA no tienen decisión. Los lectores
autorizados ven el texto; el supervisor conserva lectura de finales asignadas.
El replay004 después de decidir mantiene su resultado original PRESENTADA.

Angular incorpora `/aprobaciones`, accesible aSUPERVISOR, con filtros forzados
de asignación propia y estadoPRESENTADA incluso para roles globales. El detalle
de solicitudes contiene confirmación/formularios y resultado; no hay reasignación
ni consulta de historial avanzado. OpenAPI declara éxitos y errores con esquema
explícito; las siete operaciones de solicitudes y las16 rutas totales se comprueban.
Resultados en [validación005](../../especificaciones/005-aprobaciones/validacion.md).
