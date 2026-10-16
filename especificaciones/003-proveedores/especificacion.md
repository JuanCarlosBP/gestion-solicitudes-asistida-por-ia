# Especificación — 003 Proveedores

**Estado:** Borrador pendiente de aprobación humana
**Origen:** trabajo opcional autorizado en AG-010, después de verificar localmente 002.
**Dependencia:** identidad y acceso de 002; su verificación no implica aceptación ni integración.

Todo lo que sigue es una propuesta para decidir y aclarar. No autoriza plan,
tareas, migraciones, implementación ni validación de 003. No se ha creado código.
Parte de [visión y alcance](../../docs/vision-y-alcance.md), de la
[política de seguridad](../../docs/seguridad.md) y de los cuatro roles existentes.

## Propósito y proveedor

Se propone un catálogo de personas jurídicas o profesionales que suministran
bienes o servicios y podrán relacionarse con solicitudes futuras. Un proveedor
es un registro del catálogo, no una cuenta que accede al sistema. El identificador
técnico es estable; su estado activo/inactivo controla su disponibilidad.
La persona responsable debe confirmar si se admiten ambos tipos de proveedor y
qué jurisdicciones deben cubrirse antes de aprobar las reglas fiscales.

El incremento propuesto incluye altas, consulta individual/listado, modificación
y baja lógica. Excluye pagos, datos bancarios, contratos, importes, solicitudes,
integraciones externas, importación masiva y borrado físico. La trazabilidad
funcional y la relación con solicitudes requieren decisiones expresas posteriores.

## Campos mínimos propuestos

| Campo | Propuesta y propósito |
|---|---|
| id | UUID generado por backend, inmutable y público como identificador del recurso. |
| denominacion | Nombre legal o comercial visible, obligatorio, 1–160 caracteres Unicode tras recortar extremos; conservar espacios interiores. |
| paisFiscal | Código ISO 3166-1 alpha-2, obligatorio si se identifica fiscalmente; confirmar países permitidos. |
| identificadorFiscal | Identificador legal, propuesto como obligatorio; reglas de formato, normalización y excepciones pendientes por país. No inventar un validador universal. |
| correoContacto | Opcional, longitud máxima propuesta 254; correo válido, sin usarlo como identificador único. |
| telefonoContacto | Opcional, máximo propuesto 32 caracteres; admitir prefijo internacional y separadores razonables; confirmar reglas locales. |
| activo | Booleano, true al crear; modificación de estado mediante operación autorizada. |
| version | Número del recurso para proponer control de actualización obsoleta; confirmar contrato antes de implementar. |
| creadoEn / actualizadoEn | Instantes del servidor con zona; no aceptados del cliente como autoridad. |

Se propone no almacenar direcciones postales, personas de contacto ni datos
bancarios en este primer catálogo. Si resultan imprescindibles, deben aprobarse
su finalidad, campos y validaciones antes de ampliar el borrador.

## Requisitos propuestos

| ID | Operación y resultado esperado sujeto a aprobación |
|---|---|
| PR-01 | Crear con campos permitidos, validación backend y UUID propio; devolver recurso creado y estado activo. |
| PR-02 | Consultar un proveedor por id; devolver solo el contrato público aprobado. |
| PR-03 | Listar y buscar con filtros/paginación/orden estable; no devolver todos los registros sin límite. |
| PR-04 | Modificar únicamente campos editables; preservar id y creación; actualizar fecha/versión en una operación atómica. |
| PR-05 | Dar de baja lógicamente mediante activo=false; conservar registro e identificador, sin borrar referencias futuras. Repetir la baja no causa efectos adicionales. |
| PR-06 | Impedir duplicados según identidad fiscal normalizada y política de país aprobada, también ante altas simultáneas. |
| PR-07 | Aplicar permisos en backend a todas las operaciones, también llamadas REST directas. |
| PR-08 | Mostrar formulario/listado accesibles, carga, errores comprensibles y navegación directa Angular. |

La reactivación no se incluye automáticamente: confirmar si debe existir,
quién puede ejecutarla y cómo afecta a duplicados. Tampoco se define todavía el
uso de proveedores inactivos por solicitudes, ya que ese módulo no está implementado.

## Permisos propuestos

| Rol de 002 | Consultar activos | Consultar inactivos | Crear/modificar/baja lógica |
|---|---|---|---|
| SOLICITANTE | Sí | No, pendiente de confirmar | No |
| SUPERVISOR | Sí | No, pendiente de confirmar | No |
| AUDITOR | Sí | Sí, pendiente de confirmar | No |
| ADMINISTRADOR | Sí | Sí | Sí, pendiente de aprobación expresa |

Esta matriz no convierte ADMINISTRADOR en permiso universal ni en excepción
a validaciones. Se propone denegación por defecto, identidad obligatoria y la
misma autoridad backend/CSRF de 002. Debe decidirse el ámbito de lectura cuando
un usuario tenga varios roles y si existirá alguna restricción por organización.
No se introduce multiempresa ni multitenencia por suposición.

## Búsqueda, filtros y paginación

Propuesta: búsqueda por denominación y por identidad fiscal, con término máximo
128 caracteres; comparación de nombre sin distinguir mayúsculas, conservando
el valor mostrado. Debe decidirse si se ignoran acentos y si fiscal es coincidencia
exacta o parcial. No enviar expresiones SQL ni patrones de ejecución desde cliente.

Listado predeterminado de activos. Filtro de inactivos sujeto a permisos.
Página inicial 0, tamaño predeterminado 20 y máximo 100 como propuesta.
Orden por denominación ascendente más id como desempate estable; lista cerrada
de campos ordenables a confirmar. Respuesta propuesta: elementos, página,
tamaño y total. Definir cómo se muestra una página vacía y conservar filtros
durante la navegación. La elección entre offset/cursor requiere volumen esperado.

## Validaciones y duplicados

El backend valida obligatoriedad, longitudes, tipos, códigos y campos editables;
la validación Angular ayuda al usuario y no sustituye esos controles. Se admiten
nombres Unicode; no se ejecuta HTML del proveedor. Rechazar campos desconocidos
o controlados por el servidor según el contrato que se apruebe.

Propuesta de unicidad: pareja paisFiscal/identificadorFiscal normalizada,
incluidos registros inactivos, para evitar crear una segunda identidad por baja.
La normalización no debe eliminar caracteres significativos sin regla legal.
Denominaciones coincidentes pueden advertirse, pero no se fusionan ni bloquean
automáticamente sin decisión humana. El correo de contacto no identifica al proveedor.
La garantía final de unicidad debe resistir peticiones concurrentes; este borrador
no implementa concurrencia funcional ni elige aún su mecanismo.

## Contrato y errores propuestos

Se propone una API de catálogo bajo `/api/proveedores`: creación, consulta,
listado, modificación y baja lógica. Los verbos/rutas de baja y el contrato de
versionado deben aclararse antes de redactar el plan y OpenAPI definitivo.

| Situación | Respuesta propuesta |
|---|---|
| Sin identidad válida | 401, conforme a 002. |
| Identidad sin permiso o CSRF incorrecto | 403, sin detalles internos. |
| Cuerpo o filtros inválidos | 400 con errores de campo controlados, sin reflejar datos peligrosos. |
| Identificador inexistente o no visible según política aprobada | 404; confirmar política de ocultación de recursos. |
| Duplicado fiscal | 409 con código estable y mensaje comprensible, sin exponer datos no autorizados. |
| Modificación sobre versión antigua | Propuesta 409 y solicitud de recargar; decidir version/ETag y comportamiento UX. |
| Fallo interno o dependencia indisponible | Mensaje genérico; distinguir 500/503 conforme al contrato que se apruebe. |

El listado debe explicar resultados vacíos; los formularios deben conservar
entrada segura ante errores, enfocar el mensaje pertinente y permitir corrección
mediante teclado. Confirmar avisos y reversibilidad de la baja lógica.

## Criterios propuestos para una futura aprobación

- Un usuario autorizado crea y consulta un proveedor válido; un rol sin permiso
  recibe rechazo del backend aunque llame directamente a la API.
- Campos inválidos no crean ni modifican datos; duplicados se rechazan de forma
  consistente, incluidas peticiones simultáneas y proveedores inactivos.
- La baja conserva el registro, desaparece de activos y no permite acceso a
  inactivos a roles que carezcan de ese permiso.
- Búsqueda/paginación mantienen límites y orden estable; no filtran registros
  fuera del ámbito autorizado.
- Una edición obsoleta no sobrescribe silenciosamente cambios ajenos si se aprueba
  ese criterio y su contrato; regresión de identidad y base técnica continúa pasando.

Estos criterios no son pruebas ejecutadas ni tareas autorizadas.

## Preguntas abiertas que bloquean la aprobación

1. ¿Personas jurídicas, profesionales o ambos? ¿Qué países y formatos fiscales?
2. ¿Identificador fiscal siempre obligatorio? ¿Cómo se manejan extranjeros o excepciones?
3. ¿Se confirma la matriz de permisos y la consulta de inactivos? ¿Existe ámbito por organización?
4. ¿Se necesitan realmente correo/teléfono, dirección o personas de contacto?
5. ¿Se permite reactivar? ¿Quién lo hace y qué ocurre con duplicados y futuras solicitudes?
6. ¿Qué normalización fiscal y tratamiento de acentos/búsquedas se esperan?
7. ¿Cuántos proveedores se prevén y qué total/orden/paginación necesita la interfaz?
8. ¿Se aprueba control de edición obsoleta? ¿Version en cuerpo o ETag/If-Match?
9. ¿Qué eventos de historial funcional se requieren y en qué incremento se implementarán?
10. ¿Qué retención, finalidad y reglas de privacidad aplican a los datos de contacto?

La siguiente etapa es revisión humana de este borrador y clarificación. No se
ha creado plan, tareas, validación ni código de 003.
