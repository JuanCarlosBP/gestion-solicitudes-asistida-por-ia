# Especificación — 003 Proveedores

**Estado:** Aprobada por decisión humana AG-011
**Origen:** orden integral AG-011, 2026-10-14; decisiones D-003-01 a D-003-08.
**Dependencia:** 001 y 002 verificados localmente; aceptación e integración pendientes.

La orden aprueba especificación, plan, tareas e implementación sin nueva aprobación.
Sustituye las preguntas del borrador AG-010. Verificar no equivale a aceptar o integrar.
Inicio: 2026-10-14 01:29:00 +02:00; límite 11:29:00 +02:00, Europe/Madrid.

## Propósito y límites

Proveedor es un registro del catálogo de personas jurídicas o profesionales que
suministran bienes o servicios, nunca una cuenta de acceso. Incluye alta, consulta,
listado, búsqueda, filtros, paginación, modificación, baja lógica y reactivación.
No hay borrado físico. UUID estable y estado activo/inactivo.

Se excluyen solicitudes, conceptos, importes, aprobaciones, pagos, cuentas bancarias,
contratos, notas libres, dirección postal, persona de contacto, importación masiva,
integraciones, multiempresa y multitenencia. Historial funcional corresponde a 007;
concurrencia/idempotencia transversal a 006. Solo datos ficticios, sin Git ni cambios
a AG-003–AG-010, REV-001, ADR-0001–0003 o documentos cerrados de 001/002.

## Campos y normalización — D-003-01/02/03

| Campo | Regla |
|---|---|
| id | UUID generado por backend e inmutable. |
| tipo | PERSONA_JURIDICA o PROFESIONAL. |
| denominacion | Obligatoria, 1–160 caracteres Unicode tras recortar extremos; conserva espacios interiores. |
| paisFiscal | Obligatorio, ISO 3166-1 alpha-2 válido en mayúsculas; no limitado a ES. |
| identificadorFiscal | Obligatorio, 3–64 caracteres; sin checksum ni validación jurídica universal. |
| correoContacto | Opcional, correo válido de máximo 254; no identifica de forma única. |
| telefonoContacto | Opcional, máximo 32; sin inventar formatos nacionales. |
| activo | true al crear; cambia solo por operación de estado. |
| version | Entero no negativo, 0 al crear; versión conocida en escrituras posteriores. |
| creadoEn / actualizadoEn | Instantes del servidor; no editables. |

Normalización fiscal, en orden: Unicode NFKC, recortar extremos, mayúsculas
Locale.ROOT y colapsar secuencias internas de espacio Unicode a un espacio.
Conservar puntuación y restantes caracteres. Validar también longitud normalizada
3–64, sin truncar expansiones Unicode. Unicidad por
`(paisFiscal, identificadorFiscalNormalizado)`, incluidos inactivos.
La forma normalizada es interna. Países distintos pueden compartir identificador.
Denominaciones coincidentes no se fusionan ni bloquean; contactos no son únicos.
Rechazar campos desconocidos o controlados por servidor sin reflejar valores.

## Permisos — D-003-04

| Rol | Activos | Inactivos | Crear/modificar/desactivar/reactivar |
|---|---|---|---|
| SOLICITANTE | Sí | No | No |
| SUPERVISOR | Sí | No | No |
| AUDITOR | Sí | Sí | No |
| ADMINISTRADOR | Sí | Sí | Sí |

Múltiples roles suman permisos explícitos. Ningún rol evita reglas, validaciones
ni concurrencia. Backend decide permisos por operación/recurso; Angular ayuda a UX.
Inexistente o no visible devuelve 404. Consultar inactivos exige permiso también en REST.

## Búsqueda y paginación — D-003-06

Volumen previsto hasta 50.000; no es un benchmark. Offset con page inicial 0,
size predeterminado 20 y máximo 100. Filtros combinados AND:

- denominacion: contiene literal, máximo 128, sin distinguir mayúsculas y con
  acentos significativos; %, _ y escape se tratan como texto.
- identificadorFiscal: exacto tras normalización.
- tipo y paisFiscal: valores válidos de dominio.
- activo: true predeterminado, false o todos. Los últimos exigen AUDITOR o
  ADMINISTRADOR; todos permite listar ambos estados.
- sort: denominacion,asc predeterminado; campos cerrados denominacion, creadoEn,
  actualizadoEn; asc/desc; siempre id asc como desempate.

No SQL, columnas arbitrarias ni patrones ejecutables. Filtros inválidos, página
negativa, size fuera de 1–100 u orden no permitido: 400. Página fuera de resultados:
elementos vacíos y totales coherentes. Respuesta:
`{elementos,pagina,tamano,totalElementos,totalPaginas}`.

## Contrato HTTP — D-003-05/07

Base `/api/proveedores`. Bearer obligatorio y CSRF en escrituras.

| Método/ruta | Entrada y permiso | Resultado |
|---|---|---|
| POST base | ADMINISTRADOR; campos editables | 201, Location y proveedor público activo/version=0. |
| GET /{id} | Cuatro roles aprobados; visibilidad | 200 o 404. |
| GET base | Cuatro roles; filtros aprobados | 200 página pública. |
| PUT /{id} | ADMINISTRADOR; campos editables más version | 200, versión incrementada. |
| POST /{id}/desactivar | ADMINISTRADOR; `{version:n}` | 200, activo=false. |
| POST /{id}/reactivar | ADMINISTRADOR; `{version:n}` | 200, activo=true. |

Campos editables: tipo, denominacion, paisFiscal, identificadorFiscal,
correoContacto, telefonoContacto. Público: esos seis más id, activo, version,
creadoEn y actualizadoEn; opcionales ausentes se representan null.
PUT no cambia id, creadoEn ni activo. Actualización SQL exige id y version.
Versión no coincidente: 409 VERSION_OBSOLETA sin sobrescribir. Repetir estado con
versión vigente devuelve recurso sin incrementar versión/fecha ni emitir segunda
modificación. Con versión obsoleta sigue siendo 409 aunque el estado coincida.
Dos altas iguales simultáneas: una persiste. Dos ediciones con igual versión:
una gana y otra recibe conflicto. Garantías finales también en PostgreSQL.

Errores `{error:CODIGO}` como 002: 400 SOLICITUD_INVALIDA; 401 NO_AUTENTICADO;
403 ACCESO_NO_PERMITIDO; 404 PROVEEDOR_NO_ENCONTRADO; 409 PROVEEDOR_DUPLICADO
o VERSION_OBSOLETA; 500 ERROR_INTERNO; 503 DEPENDENCIA_NO_DISPONIBLE.
No stack, SQL, configuración, HTML ejecutable, entrada reflejada ni datos ajenos.
Respuestas privadas sin caché compartida. Actualizar OpenAPI y Swagger.

## Privacidad y eventos — D-003-08

Eventos técnicos: crear, modificar, desactivar, reactivar, rechazo por duplicado,
conflicto de versión. Como máximo acción, id usuario, id proveedor, resultado e
identificador de petición si existe. Nunca fiscal, correo, teléfono ni cuerpos.
No sustituyen historial funcional de 007. Contacto solo para gestión de proveedores.
Retención y eliminación jurídica definitiva pendientes de decisión posterior.

## Requisitos y criterios observables

| ID | Criterio de aceptación |
|---|---|
| PR-01 | Crear válido con UUID/fechas propios, activo=true/version=0, 201 y Location; inválido no persiste. |
| PR-02 | Consultar UUID con DTO público; inexistente/no visible 404 sin filtración. |
| PR-03 | Búsqueda literal, filtros AND, acentos, offset/límites y orden estable. |
| PR-04 | Editar campos permitidos incrementa versión/fecha y preserva campos de servidor. |
| PR-05 | Baja conserva fila; repetición vigente sin efecto; desaparece para roles sin permiso. |
| PR-06 | Reactivación solo ADMINISTRADOR; repetición vigente sin efecto. |
| PR-07 | Unicidad compuesta incluye inactivos y resiste altas simultáneas PostgreSQL. |
| PR-08 | Matriz y unión de roles backend, CSRF y denegación por defecto. |
| PR-09 | Versión obsoleta 409; dos escrituras reales no se sobrescriben. |
| PR-10 | Angular accesible con rutas, lista/formulario/detalle/estados, conflicto recargable, filtros URL y responsive. |
| PR-11 | Validaciones/errores/eventos seguros, SQL parametrizado y campos internos protegidos. |
| PR-12 | V3, pruebas/regresión, CI, auditorías, documentación y evidencias propias. |

Rutas Angular: /proveedores, /proveedores/nuevo, /proveedores/:id,
/proveedores/:id/editar. Navegación directa/recarga, carga/vacío/error,
mensaje de conflicto y recargar. Conservar filtros en query params.
Teclado/foco/etiquetas/mensajes accesibles, sin depender solo del color.
Sin nuevos tokens ni datos sensibles en almacenamiento web; sin librería visual nueva.

## Comprobaciones obligatorias

Unitarias: normalización, ISO, límites, estados, versión, permisos y errores.
HTTP: todas operaciones/roles, CSRF, activos/inactivos, filtros/páginas/orden,
campos protegidos y errores controlados. PostgreSQL/Testcontainers: base nueva,
después de V1/V2, segundo arranque, unique, dos altas simultáneas, dos ediciones
con misma versión, baja/reactivación, roles de aplicación, páginas y sin DELETE.
Angular: servicio, listado/filtros/páginas, formulario/validación, detalle, permisos,
vacío/errores, transiciones, conflicto y rutas.
E2E Compose: admin crea, detalle/lista, modifica, conflicto visible, desactiva;
solicitante/supervisor no ven inactivo; auditor sí sin modificar; admin reactiva;
duplicado comprensible; búsqueda/filtros/páginas; recarga; teclado/foco.

Regresión obligatoria: mvnw verify sin omisiones, Spotless/SpotBugs y PostgreSQL
real; frontend typecheck/lint/format:check/tests/build; Docker sin caché,
Compose/salud 200/503/Swagger/login/refresh/logout/mi-cuenta/persistencia/E2E,
auditorías, actionlint, documentación y búsqueda acotada de secretos.
CI remota pendiente del push humano. No se afirma OWASP completo, aceptación ni integración.
