# Arquitectura: base técnica, identidad y proveedores

**Estado:** Implementada; documentación pendiente de revisión humana.
**Fecha:** AG-011, 2026-10-14. Resultados de la base en
[validación 001](../../especificaciones/001-base-verificable/validacion.md) y cambios de identidad en
[validación 002](../../especificaciones/002-identidad-acceso/validacion.md); el catálogo y sus controles propios constan en [validación 003](../../especificaciones/003-proveedores/validacion.md).

El backend es un monolito modular Spring Boot 4.0.8 con Java 21.
001 aporta la comprobación técnica y 002 añade el módulo funcional `identidad`.
003 añade el catálogo de proveedores por autorización AG-011. AG-012 incorpora solicitudes, conceptos, importes y presentación; validación004 en curso. No hay CRUD de usuarios ni aprobaciones en004.

## Responsabilidades

| Ruta | Responsabilidad |
|---|---|
| `backend/src/main/java/es/gestionsolicitudes/salud/http` | Entrada GET y DTO público. |
| `salud/aplicacion` | Estado público y puerto de comprobación de la dependencia. |
| `salud/persistencia` | Consulta constante SELECT 1 mediante JDBC y cierre de recursos. |
| `configuracion` | Seguridad, contrato OpenAPI y errores controlados. |
| `identidad/http` | Login, refresh, logout, CSRF, identidad pública y cookies. |
| `identidad/aplicacion` | Contraseñas, JWT y casos transaccionales de sesión. |
| `identidad/dominio` | Correo, roles, intentos, usuarios, sesiones y tokens técnicos. |
| `identidad/persistencia` | Consultas parametrizadas JdbcTemplate, versiones y bloqueos de filas. |
| `identidad/configuracion` | Clock, duraciones, RSA, validación JWT y aprovisionamiento local. |
| `frontend/src/app/inicio` | Servicio HTTP y pantalla con carga, disponibilidad y error. |
| `frontend/src/app/identidad` | Store signals, servicio, guard, interceptor y pantallas de acceso/cuenta. |
| `frontend/src/app/navegacion` | Salida controlada para direcciones desconocidas. |
| `infraestructura` | Compose y preparación administrativa de PostgreSQL. |
| `qa` | Inventario de preliminares, auditoría offline, QA de Compose y evidencias. |

El controlador depende del servicio, que utiliza un puerto implementado por JDBC.
Los detalles SQL, conexiones y mensajes del driver no llegan al DTO HTTP.
Salud conserva su estructura mínima. Identidad incorpora dominio porque sí tiene
reglas de correo, contraseña, intentos, caducidad y estados de sesión.

## Contrato y límites

`GET /api/salud` devuelve exactamente `{"estado":"DISPONIBLE"}` con 200,
o `{"estado":"NO_DISPONIBLE"}` con 503 si PostgreSQL falla.
No recibe un cuerpo de entrada ni acredita funciones de negocio.
Un fallo inesperado se traduce a `{"error":"ERROR_INTERNO"}` con 500.
La falta de autenticación devuelve 401 y `{"error":"NO_AUTENTICADO"}`;
CSRF o permiso insuficiente devuelven 403 y `{"error":"ACCESO_NO_PERMITIDO"}`.
El contrato completo y las rutas están en [API y rutas](api-y-rutas.md).

Hikari limita espera de conexión a 2 s, validación a 1 s y pool a 5 conexiones.
JDBC limita conexión/socket a 3 s y consulta a 2 s. Son límites de operaciones
individuales, no una promesa de latencia máxima universal.
Angular cancela una consulta sin respuesta tras 6 s y muestra un error controlado.
La caída real medida en Compose devolvió 503 en 2016 ms; no es un benchmark.

OpenAPI 3.1 se sirve en `/v3/api-docs`; Swagger en `/swagger-ui/index.html`.
El contrato fija servidor relativo `/` para usar el mismo origen del navegador.
Swagger no carga Petstore ni un validador remoto.

## Seguridad local

Spring Security permite las operaciones públicas de salud y autenticación;
documentación solo en local/test. `/api/identidad/yo` exige Bearer válido y toda
otra API no autorizada se deniega. 003 habilita exclusivamente los seis endpoints de proveedores con permisos explícitos. HTTP Basic y formulario automático de Spring están deshabilitados.
No se usa sesión HTTP/JSESSIONID: la sesión técnica reside en PostgreSQL.
CSRF sigue activo para métodos no seguros, incluso con Bearer; no se abre CORS.
Los errores públicos no exponen excepciones, SQL, host o credenciales.

El acceso JWT RS256 se conserva en memoria Angular. Un refresh opaco en cookie
HttpOnly permite restaurar y renovar; solo su hash de secreto se almacena.
Rotación y revocación bloquean sesión dentro de una transacción; el `sid` se
consulta por petición protegida para invalidar JWT tras el cierre o reutilización.
La familia tiene duración absoluta de ocho horas. La decisión y riesgos están en
[ADR-0003](../decisiones/ADR-0003-identidad-jwt-y-sesiones.md) y
[seguridad técnica](seguridad.md). No hay servidor OAuth completo ni Redis.

Nginx sirve Angular y dirige API/documentación al backend. CSP limita recursos
al propio origen; `style-src 'unsafe-inline'` permite estilos de Angular/Swagger.
No hay scripts externos ni interpolación de HTML no fiable. Se revisará CSP
al cambiar estas superficies. HSTS/HTTPS públicos no se acreditan en HTTP local.

Compose solo publica loopback, con 18080 por defecto y `FRONTEND_PUERTO` configurable.
AG-009 comprobó también 18081. PostgreSQL está en red interna sin puertos
publicados; backend tampoco tiene puerto en el host. Usuarios efectivos comprobados:
backend 10001, Nginx 101 y PostgreSQL 999. Se eliminan capacidades Linux y se
activa no-new-privileges; backend/frontend tienen raíz de solo lectura y tmpfs.

El socket Docker solo se necesita para Testcontainers durante QA, nunca en
contenedores de la aplicación. No se usan contenedores privilegiados.

## Datos y permisos

El inicializador administrativo crea roles separados y el esquema `gestion`.
Flyway usa `gestion_migracion`, propietario del esquema; la aplicación usa
`gestion_app` con CONNECT y USAGE, sin DDL, roles ni acceso al historial Flyway.
V1 conserva permisos iniciales. V2 añade usuarios, roles, usuarios_roles,
sesiones_acceso y tokens_refresco con privilegios mínimos explícitos;
[modelo de datos](modelo-de-datos.md) explica claves, restricciones y transacciones.
V3 conserva proveedores; V4 incorpora solicitudes/conceptos e idempotencia local de presentación. Historial funcional completo sigue fuera de004.

El proceso backend recibe ambas credenciales para ejecutar Flyway al arrancar.
La separación de roles no equivale a aislamiento entre procesos de migración
y aplicación. Un ejecutor separado puede evaluarse en el despliegue futuro.
El contenedor PostgreSQL conserva datos en `gestion-solicitudes-001_datos-postgres`.
Los ejemplos son ficticios; `.env` queda excluido del control de versiones.

## Reproducción y verificación

Las imágenes están fijadas por etiqueta exacta y digest. Maven Wrapper verifica
el ZIP mediante SHA-256; el constructor Linux incluye unzip fijado.
El backend Docker construye el artefacto con objetivos Maven de empaquetado;
las pruebas y controles se ejecutan fuera de ese build, en QA/CI.
Construir una imagen no sustituye `verify`: AG-008 completó Spotless y verify,
y AG-009 repitió la verificación local íntegra con éxito.

Se han ejecutado pruebas unitarias/HTTP, Testcontainers, Angular y navegador.
El workflow usa Actions por SHA, permisos contents:read y conserva informes.
La [política de transitivas](../decisiones/ADR-0002-politica-dependencias-transitivas.md)
permite preliminares controladas sin omitir instalación, auditoría ni QA.
La revisión final de AG-006 es de la misma sesión y no es independiente.
La primera revisión independiente [REV-001](../trazabilidad/REV-001-revision-independiente-01.md)
registró R-01 a R-04; [AG-009](../trazabilidad/AG-009-informe.md) documenta su respuesta.
La rama y PR #1 se publicaron por intervención humana. La primera CI pasó frontend
y falló por setup-java y la copia de public; AG-009 corrige ambas sin cambiar arquitectura.
La segunda CI espera el siguiente push humano. 001 no está aceptada ni integrada.

AG-010 añade pruebas de identidad, concurrencia refresh, Angular y recorrido
E2E de login/restauración/cierre. La CI fija además Docker 29.1.3 y Compose 2.40.3,
conserva salidas por job y ejecuta QA de sesiones sobre Compose. Sus resultados
locales se registran en validación 002; no se presentan como una CI remota ejecutada.

## Módulo proveedores — AG-011

[003](../../especificaciones/003-proveedores/especificacion.md) incorpora paquete
proveedores con dominio, aplicación transaccional, persistencia JdbcTemplate y HTTP.
El contrato cerrado reutiliza identidad/CSRF de 002 y Clock del servidor.
V3 agrega catálogo con unique fiscal compuesto y versión optimista; actualización
por id/version y baja lógica/reactivación. No se añade JPA ni una segunda base.

Angular organiza servicio, tipos, lista, detalle y formulario en proveedores,
reutilizando guard/interceptor y tokens solo en memoria. Los cuatro roles leen
activos; AUDITOR/ADMINISTRADOR también inactivos; solo ADMINISTRADOR escribe.
La interfaz presenta permisos para UX y el backend aplica la autoridad final.

El listado usa offset limitado, contiene literal con acentos significativos y
sort de lista cerrada más id como desempate. Los índices B-tree de orden no
acreditan acelerar contiene; 50.000 es volumen previsto, sin medición de carga.
[ADR-0004](../decisiones/ADR-0004-catalogo-proveedores-y-concurrencia.md) explica
alternativas y límites. La [validación 003](../../especificaciones/003-proveedores/validacion.md)
distingue implementación, comprobaciones locales y pendientes humanos.

## Solicitudes — AG-012

004 añade paquete solicitudes con dominio, aplicación, persistencia JdbcTemplate
y HTTP. Solicitud/conceptos forman un agregado, reemplazado atómicamente con
versión y estado. BigDecimal calcula líneas HALF_UP y suma importes redondeados.
JSON conserva decimales como texto. Proveedor pasa de referencia actual en
borrador a fotografía inmutable al presentar; supervisor se fija en esa transición.

Idempotencia local persistida y bloqueo transaccional por usuario/clave devuelven
el resultado original sin duplicar efectos. SQL aplica visibilidad por unión de
roles antes de contar. Consultas de detalle/listado coherentes con lectura repetible.
Una función SQL mínima bloquea usuario/rol supervisor sin conceder actualización
general de roles; ver [ADR0005](../decisiones/ADR-0005-solicitudes-importes-presentacion.md).

Angular ofrece listado, detalle y editor con selectores, cálculo previo estimado,
conflicto recuperable y confirmación de presentación. Tokens CSS compartidos y
adaptación360/768/1440 se comprueban con navegador; resultados reales y pendientes
en [validación004](../../especificaciones/004-solicitudes-conceptos-importes/validacion.md).
Implementación no implica aceptación.005 y controles transversales posteriores
conservan las puertas expresas de AG-012.

## Decisiones de solicitudes — AG-012, incremento 005

005 amplía el módulo solicitudes: el supervisor asignado puede aprobar o rechazar
una presentada. La aplicación vuelve a comprobar usuario habilitado y rol vigente
en PostgreSQL, incluidos los replays, y excluye al autor. El orden de bloqueo es
clave de idempotencia, solicitud y autorización vigente; decisión, evento mínimo
y resultado persistido se confirman en la misma transacción.

V5 incorpora el evento único por solicitud y amplía el registro idempotente de V4.
La presentación conserva su huella y resultado originales. Las lecturas admiten
estados finales y proyectan la decisión, sin alterar conceptos ni fotografía del
proveedor. No se introduce un motor genérico de flujos o historial avanzado.

Angular añade `/aprobaciones`, cuya consulta fuerza supervisor actual y PRESENTADA,
también para usuarios con visibilidad global. El detalle confirma la operación y
conserva clave/cuerpo ante resultado incierto. Si el POST termina y falla la lectura,
bloquea otra decisión hasta recuperar el detalle. Contrato y alternativas en
[ADR-0006](../decisiones/ADR-0006-aprobaciones-y-evento-minimo.md); resultados en
[validación 005](../../especificaciones/005-aprobaciones/validacion.md).

## Operaciones transversales006 — AG-013

Paquete operaciones separa dominio/aplicación/JDBC/HTTP y centraliza huella,
coordinación, éxito persistido y recuperación. Módulos conservan reglas de negocio.
PostgreSQL serializa usuario+clave y confirma resultado con efecto/evento; mapa
mínimo efímero informa progreso en una instancia y libera esperantes tras finalizar.
Duplicados no retienen conexiones mientras esperan; plazo3s y error recuperable.
Réplicas futuras requieren revisar visibilidad del progreso; no se acreditan aquí.

Angular integra OperacionesSeguras y panel accesible. Descriptor4campos24h con
ámbito opaco hash de usuario en nombre de almacenamiento; contenido sin cuerpos
ni credenciales. Web Locks coordina reclamación entre pestañas. Navegador sin esa
capacidad puede recuperar pero no iniciar nuevas mutaciones protegidas. Una clave
conocida no otorga permisos; el servidor revalida siempre. Diseño/retención en
[ADR0007](../decisiones/ADR-0007-concurrencia-idempotencia-transversal.md).

Cada formulario de alta conserva en memoria la UUID efectivamente reclamada.
Confirmar después de un error bloquea el formulario antiguo aunque se limpie el
descriptor o cambie la tarjeta del panel. Una navegación interna a una nueva alta
crea otra intención; no se añaden cuerpos ni campos al almacenamiento persistido.
Los conflictos definitivos de una entrada distinta conservan su semántica.

## Historial empresarial007 — AG-014

El módulo historial separa dominio, aplicación, JdbcTemplate y HTTP; no incorpora
infraestructura nueva. Los servicios de proveedores/solicitudes insertan el hecho
antes del commit de negocio. Sus logs técnicos afterCommit permanecen separados.
El repositorio proyecta V7 y decisionesV5 sin duplicarlas ni seleccionar sus textos.
La lectura repetible mantiene coherentes identidad vigente, permisos, página y
conteo; el resumen agrega solicitudes visibles sin cargar conceptos ni N+1.

Angular incorpora cliente/modelo/timeline, rutas autorizadas y resumen real.
Filtro/página se conservan en URL, con estados diferenciados y aviso de cobertura
histórica. No hay funciones de edición/borrado del historial.
Contrato/alternativas en [ADR0008](../decisiones/ADR-0008-historial-de-negocio-y-consulta.md);
pruebas y límites en [validación007](../../especificaciones/007-historial-auditoria/validacion.md).
