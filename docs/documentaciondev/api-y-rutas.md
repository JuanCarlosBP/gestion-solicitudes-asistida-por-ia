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
