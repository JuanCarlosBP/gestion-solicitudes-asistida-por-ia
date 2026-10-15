# Especificación — 004 Solicitudes, conceptos e importes

**Estado:** Aprobada por decisión humana AG-012
**Origen:** orden humana integral AG-012 recibida el 2026-10-14, D-004-01–11.
**Inicio:** 2026-10-14 23:34:02 +02:00; **límite:** 2026-10-15 09:34:02 +02:00, Europe/Madrid.

## Propósito y autorización

Crear, consultar y listar solicitudes; editar cabecera y conceptos como agregado,
calcular importes exactos, guardar borradores y presentarlos atómicamente.
La orden aprueba expresamente esta especificación, su plan, tareas e implementación.
Sustituye las preguntas pendientes del borrador AG-011. Verificar localmente no
significa aceptar, integrar ni publicar. Git pertenece a la persona responsable.

Fuentes: [002](../002-identidad-acceso/especificacion.md),
[003](../003-proveedores/especificacion.md), [seguridad](../../docs/seguridad.md),
[calidad](../../docs/politicas/calidad.md) y [visión](../../docs/vision-y-alcance.md).

## Decisiones humanas aprobadas

El texto siguiente conserva íntegramente las once decisiones del encargo.
D-004-01 — Cabecera

Una solicitud tiene:

- id UUID;
- numero público generado por backend con formato `SOL-AAAA-NNNNNN`;
- autor obtenido de la identidad autenticada;
- asunto obligatorio, 3–160 caracteres;
- descripcion opcional, máximo 2.000 caracteres;
- proveedor opcional mientras es borrador;
- supervisor opcional mientras es borrador;
- moneda fija EUR;
- estado;
- importe total calculado;
- version;
- creadoEn, actualizadoEn y presentadoEn del servidor.

El número se genera al crear, es único e inmutable.
El cliente nunca decide autor, número, estado, total, versión o fechas.

D-004-02 — Borrador y presentación

Para crear un borrador se exige únicamente un asunto válido.

Un borrador puede estar temporalmente sin proveedor, supervisor o conceptos.

Para presentar se exige:

- proveedor activo;
- supervisor habilitado con rol SUPERVISOR;
- supervisor distinto del autor;
- entre 1 y 100 conceptos;
- todos los conceptos válidos;
- total mayor que 0;
- versión actual;
- clave de idempotencia válida.

D-004-03 — Permisos y visibilidad

SOLICITANTE:
- crea solicitudes propias;
- consulta, lista, modifica y presenta sus propios borradores;
- consulta sus solicitudes presentadas;
- no modifica solicitudes presentadas.

SUPERVISOR:
- consulta solicitudes presentadas que tenga asignadas;
- no modifica borradores;
- las decisiones corresponden a 005.

AUDITOR:
- consulta todas las solicitudes y estados;
- no modifica ni presenta.

ADMINISTRADOR:
- consulta todas las solicitudes;
- no modifica solicitudes ajenas;
- no evita reglas de negocio;
- solo crea y modifica como solicitante si también tiene SOLICITANTE.

Los roles se combinan por unión de permisos explícitos.
El backend aplica siempre acción + recurso + estado.

D-004-04 — Proveedor y fotografía temporal

En borrador se conserva la referencia al proveedor actual.

Si el proveedor se desactiva antes de presentar:

- el borrador continúa existiendo;
- no puede presentarse hasta cambiarlo o reactivarlo.

Al presentar se guarda una fotografía inmutable de:

- denominación;
- país fiscal;
- identificador fiscal;
- tipo de proveedor.

Después de presentar, la solicitud muestra esa fotografía aunque el catálogo cambie.

D-004-05 — Conceptos

Cada concepto tiene:

- id UUID;
- descripcion obligatoria, 1–300 caracteres;
- cantidad decimal mayor que 0, precisión máxima 15 y escala 3;
- unidad cerrada:
  - UNIDAD;
  - HORA;
  - DIA;
  - MES;
  - KILOGRAMO;
  - LITRO;
  - METRO;
  - SERVICIO;
- precioUnitario mayor que 0, precisión 15 y escala 4;
- importeLinea calculado por servidor, escala 2;
- posicion entera positiva y única dentro de la solicitud.

Los conceptos pertenecen exclusivamente a una solicitud.
La edición de borrador reemplaza atómicamente cabecera y colección completa.
No existen líneas huérfanas.

D-004-06 — Cálculos monetarios

Moneda única: EUR.

No se incluyen:

- impuestos;
- descuentos;
- recargos;
- conversión de divisas.

Cálculo:

1. cantidad × precioUnitario;
2. redondeo de cada línea a 2 decimales;
3. modo HALF_UP;
4. total = suma de líneas ya redondeadas.

El servidor recalcula siempre.
No acepta total ni importe de línea como autoridad del cliente.

Límites:

- cantidad máxima: 999999999999.999;
- precio máximo: 99999999999.9999;
- total máximo: 9999999999999.99;
- desbordamiento o exceso: error controlado.

Ejemplos obligatorios en pruebas:

- 1 × 10.0000 = 10.00;
- 2.500 × 4.1250 = 10.31;
- 3 × 0.3350 = 1.01.

D-004-07 — Estados

004 implementa únicamente:

- BORRADOR;
- PRESENTADA.

Transición permitida:

BORRADOR → PRESENTADA

El borrador del autor es editable.
La solicitud presentada queda inmutable para 004.

No se incluyen todavía:

- retirar;
- reabrir;
- anular;
- borrar físicamente;
- aprobar;
- rechazar.

El cliente no puede escribir libremente el campo estado.

D-004-08 — Supervisor

El autor selecciona supervisor durante el borrador.

Para presentar:

- supervisor obligatorio;
- usuario habilitado;
- rol SUPERVISOR;
- distinto del autor.

Crear un endpoint autenticado de consulta acotada de supervisores para el selector.
No devolver hashes, sesiones ni datos internos.
La asignación queda fijada al presentar.
No se implementa reasignación en 004.

D-004-09 — Concurrencia e idempotencia local

Guardar borrador:

- requiere version esperada;
- actualización condicional por id + version + estado BORRADOR;
- conflicto: HTTP 409 `VERSION_OBSOLETA`.

Presentar:

- requiere cabecera `Idempotency-Key` con UUID;
- primera ejecución válida presenta en una transacción;
- repetir misma clave con misma operación devuelve el mismo resultado;
- misma clave con petición incompatible devuelve HTTP 409;
- dos claves concurrentes no producen dos presentaciones;
- el estado y la versión también protegen la transición.

Crear persistencia mínima de idempotencia para esta operación.
006 generalizará el mecanismo; no dejar 004 sin garantía local.

D-004-10 — Listado

Volumen previsto inicial: hasta 100.000 solicitudes.

Paginación:

- page inicial 0;
- size predeterminado 20;
- máximo 100.

Filtros:

- numero exacto;
- asunto contiene, sin distinguir mayúsculas y con acentos significativos;
- estado;
- proveedor;
- autor, solo para roles con visibilidad global;
- supervisor;
- fechaDesde y fechaHasta.

Orden predeterminado:

- actualizadoEn descendente;
- id ascendente como desempate.

Campos ordenables cerrados:

- numero;
- creadoEn;
- actualizadoEn;
- importeTotal.

La visibilidad se aplica antes de contar y devolver resultados.

D-004-11 — Datos, eventos y retención

Visibilidad:

- solicitante: propias;
- supervisor: asignadas y presentadas;
- auditor/administrador: todas;
- combinación de roles: unión explícita.

Eventos técnicos:

- crear borrador;
- guardar borrador;
- presentar;
- duplicado idempotente;
- conflicto de versión;
- rechazo por proveedor/supervisor/conceptos inválidos.

Registrar solo:

- acción;
- usuario;
- solicitud;
- resultado;
- identificador de petición;
- clave de idempotencia mediante hash o referencia no reutilizable.

No registrar descripciones, conceptos completos, tokens ni datos fiscales completos.

No hay borrado físico.
Retención y borrado jurídico definitivo se decidirán en 007/008.


## Excelencia visual aprobada

La interfaz debe ser profesional, limpia y atractiva, no solo funcional.

Mantener accesibilidad y añadir un sistema visual coherente sin dependencia
externa nueva:

- variables CSS para colores, tipografía, espaciado, radios, sombras y estados;
- jerarquía visual clara;
- cabecera y navegación consistentes;
- tarjetas y paneles con profundidad moderada;
- chips de estado;
- tabla de conceptos clara en escritorio;
- tarjetas o distribución legible en móvil;
- resumen de importes destacado;
- acciones principales y secundarias inequívocas;
- barra de acciones/resumen visible sin dificultar teclado;
- estados de carga, vacío, error, conflicto y éxito diseñados;
- foco visible;
- contraste suficiente;
- movimiento mínimo y respeto a `prefers-reduced-motion`;
- diseño comprobado en aproximadamente 360, 768 y 1440 px;
- capturas de las pantallas principales.

No introducir efectos llamativos impropios de una aplicación empresarial.
No sacrificar claridad por decoración.
Armonizar gradualmente inicio, acceso, cuenta y proveedores con los mismos tokens
cuando pueda hacerse sin reescribir funcionalidad no afectada.

La auditoría visual final completa se realizará en 008.

## Criterios observables SCI-01 a SCI-14

Esta numeración sustituye la tabla candidata del borrador; no son requisitos futuros.

| ID | Criterio y evidencia exigida |
|---|---|
| SCI-01 | Crear solo como SOLICITANTE; asunto 3–160; 201/Location; identidad, número, fechas y versión0 del servidor; inválidos sin persistencia. |
| SCI-02 | Detalle coherente y conceptos ordenados; referencia actual en borrador y fotografía presentada; inexistente/no visible404. |
| SCI-03 | Todos los filtros AND y orden cerrado; acentos significativos/comodines literales; paginación limitada; visibilidad antes de conteo. |
| SCI-04 | Reemplazo atómico de cabecera y colección de 0–100 conceptos en borrador; IDs exclusivos, posiciones positivas únicas; rollback. |
| SCI-05 | Cálculo servidor HALF_UP por línea; ejemplos10.00/10.31/1.01; precisión/escala/límites y desbordamiento controlados; total cliente rechazado. |
| SCI-06 | Proveedor opcional en borrador; inactividad conserva referencia y bloquea presentación; fotografía inmutable bajo concurrencia. |
| SCI-07 | Selector mínimo acotado; presentación revalida supervisor habilitado con rol y distinto del autor. |
| SCI-08 | Solo BORRADOR→PRESENTADA, 1–100 líneas válidas y total positivo; fecha, versión, fotografía y resultado en una transacción. |
| SCI-09 | Matriz por acción/recurso/estado y unión de roles; ninguna escritura ajena; supervisor solo asignadas presentadas. |
| SCI-10 | Versión obsoleta409 y carreras edición/edición/edición-presentación; UI conserva entrada y permite recargar. |
| SCI-11 | Clave UUID obligatoria, mismo resultado al repetir, reuso incompatible409, misma clave y claves distintas concurrentes sin duplicación. |
| SCI-12 | Cuatro rutas, query params, estados completos, estimación/total confirmado, selectores/confirmación; teclado/foco y360/768/1440px. |
| SCI-13 | Bearer/CSRF/default deny/no-store; DTO cerrado/SQL parametrizado; errores seguros y eventos mínimos sin datos sensibles. |
| SCI-14 | V4, OpenAPI, pruebas completas/regresión001–003, Compose/CI/auditorías y documentación/evidencias propias preservando históricos. |

## Contrato y límites técnicos

Contrato exacto en [plan](plan.md), que fija representaciones y no añade reglas de negocio.
POST /api/solicitudes; GET /api/solicitudes/{id}; GET /api/solicitudes;
PUT /api/solicitudes/{id}; POST /api/solicitudes/{id}/presentar;
GET /api/identidad/supervisores. Bearer en todos, CSRF en escrituras.
Errores {error:CODIGO}:400 SOLICITUD_INVALIDA;401 NO_AUTENTICADO;
403 ACCESO_NO_PERMITIDO;404 SOLICITUD_NO_ENCONTRADA;
409 VERSION_OBSOLETA/SOLICITUD_NO_EDITABLE/PROVEEDOR_INACTIVO/
SUPERVISOR_INVALIDO/CLAVE_IDEMPOTENCIA_REUTILIZADA;
500 ERROR_INTERNO;503 DEPENDENCIA_NO_DISPONIBLE. No se introduce422.
Rutas Angular: /solicitudes, /solicitudes/nueva, /solicitudes/:id,
/solicitudes/:id/editar. Backend Java21/JdbcTemplate/BigDecimal/Clock/PostgreSQL real.

## Verificación obligatoria

Dominio: ejemplos, fronteras, escalas, precisión y desbordamientos. HTTP: permisos,
visibilidad, filtros, proveedor, supervisor, versión, entrada cerrada y CSRF.
PostgreSQL real: migración nueva/evolución/segundo arranque, restricciones,
rollback y carreras de guardado/presentación/repetición/referencias.
Angular: servicio, listado/filtros/páginas, formulario/editor/importes, permisos,
errores/conflicto/presentación/rutas/accesibilidad. E2E: crear, conceptos, total,
guardar/recargar, conflicto/corregir, referencias, presentar/repetir, supervisor,
auditor, ajeno, móvil/teclado/rutas. Capturas de pantallas principales.
Backend mvnw verify, Spotless y SpotBugs; frontend tipos/lint/formato/tests/build;
Docker limpio, Compose, salud200/503, Swagger, identidad/proveedores/solicitudes,
auditorías, actionlint, documentación y búsqueda acotada de secretos.
CI remota queda pendiente de push humano. Resultados en [validación](validacion.md).

## Exclusiones y condiciones siguientes

Sin impuestos, descuentos, divisas, pagos, borrar solicitudes, retirar, reabrir,
anular, reasignar, historial funcional completo ni aprobación/rechazo en004.
Retención y borrado jurídico pendientes007/008. Sin datos reales, Git ni cambios
mayores. AG-003–AG-011, REV-001, ADR0001–0004 y validaciones anteriores intactos.
La corrección heredada se registra en adenda nueva de003, sin reescribir su historia.
005 solo después de004 completamente verificada y al menos120min disponibles;
con60–119min solo SDD005; menos60min no crear005.006 solo borrador tras005
verificada y al menos45min. Cierre y aceptación siempre humanos.