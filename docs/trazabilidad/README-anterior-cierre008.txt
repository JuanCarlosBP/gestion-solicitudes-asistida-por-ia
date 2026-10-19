# Gestión de Solicitudes

## Continuación pública de 008 — estado de preparación

Se está preparando el despliegue de la demo aislada. **Todavía no se declara
finalizada 008 ni disponible la URL por el hecho de añadir estos archivos.**
La [guía de uso sencilla](docs/manual-usuario/demo-publica.md) explica los roles
y los clics de la demostración; la [decisión pública](docs/decisiones/ADR-0010-configuracion-publica-controlada.md)
separa lo ya acreditado de las comprobaciones operativas pendientes.

Los datos son ficticios. No hay pagos reales ni una cuenta administradora pública.
El sitio principal del autor no se sustituye: la aplicación usa su propio
subdominio, gestion-empresarial.jcbpsoftware.com.


**Estado del documento:** Aprobada como presentación inicial

Aplicación empresarial prevista para centralizar la creación, revisión,
aprobación y seguimiento de solicitudes internas.
Su finalidad es reunir los datos y las decisiones en un mismo lugar,
con permisos claros y un historial que permita saber qué ocurrió.

## Estado actual

001–007 y la reparación AG-015 están aceptados e integrados por comunicación humana AG-016 del 2026-10-16. Base main `eaa0baec78ed9b99d8039ea7e6256b254be295d3`, árbol `5e5d0a92ed719e74729461ab3f8d63baaa84bcb2`; CI main `38882642418`: backend/frontend/compose PASS según el encargo. 008 está autorizado para diseño, implementación y pruebas locales con revisión independiente; ejecución en curso, sin aceptación ni publicación de008. [Informe AG-016](docs/trazabilidad/AG-016-informe.md).

Los párrafos siguientes conservan los resultados históricos de cada ejecución.

AG-014 autoriza [007 — Historial y auditoría](especificaciones/007-historial-auditoria/especificacion.md)
y las decisiones D-007-01–10: eventos nuevos atómicos, consulta de decisiones V5,
historial por recurso/global y resumen según permisos. Implementación realizada,
verificada localmente; [validación007](especificaciones/007-historial-auditoria/validacion.md)
es la fuente de resultados. La autorización sustituye el límite anterior de borrador007.
El [informe AG-014](docs/trazabilidad/AG-014-informe.md) registra247 pruebas backend,
479 Angular,639 controles API y33 E2E finales, migración y auditorías superadas,
12 capturas y revisión independiente sin hallazgos abiertos.
Aceptación, integración y despliegue permanecen pendientes de decisión humana.
Tras la puerta autorizada se creó únicamente el
[borrador008](especificaciones/008-demo-operacion-entrega/especificacion.md), sin implementación ni publicación.

AG-013 autoriza e implementa [006](especificaciones/006-concurrencia-idempotencia/especificacion.md):
idempotencia transversal, espera acotada y recuperación Angular. SDD y ADR0007
aprobados por encargo humano; CI-01–10 verificados localmente, con revisión sin
hallazgos abiertos. Estado verificable en
[informe AG-013](docs/trazabilidad/AG-013-informe.md) y
[validación006](especificaciones/006-concurrencia-idempotencia/validacion.md).
Aceptación e integración de006 pendientes. El encargo comunica aceptación formal
de gobierno/001/002. Los párrafos siguientes conservan la evolución anterior;
la autorización AG-013 sustituye el límite de borrador006 de AG-012.
Tras verificar006 se creó únicamente la
[especificación007](especificaciones/007-historial-auditoria/especificacion.md),
aprobada posteriormente por AG-014.

AG-012 ejecuta004 por autorización humana integral, con SDD y ADR0005 aprobados.
La corrección heredada de proveedores pasa enfocada y regresión001–003;
[adenda003](especificaciones/003-proveedores/validacion-ag012.md) conserva el fallo remoto.
004 verificada localmente:144 pruebas backend,275 Angular,11 E2E y controles
Compose/API/auditorías. SCI-01–14 y revisión sin hallazgos abiertos; aceptación
e integración pendientes. La puerta005 se cumplió con564 minutos restantes.
005 implementada:180 pruebas backend,346 Angular,14 E2E y425 controles API PASS;
V5 conserva V1–V4 y datos existentes. AP-01–10 verificados localmente, con revisión
independiente sin hallazgos abiertos; aceptación e integración pendientes.
Tras cumplir la puerta de continuación se creó únicamente el
[borrador006, ahora aprobado por AG-013](especificaciones/006-concurrencia-idempotencia/especificacion.md).
Estado detallado en [informe AG-012](docs/trazabilidad/AG-012-informe.md).


AG-011 implementa [003 — Proveedores](especificaciones/003-proveedores/especificacion.md)
por autorización humana integral: catálogo, permisos, baja/reactivación y versión
optimista. Especificación, plan, tareas y ADR-0004 aprobados. Pasan 98 pruebas backend,
130 Angular, 9 E2E y las comprobaciones de Docker/Compose, seguridad y auditorías.
La revisión independiente concluye sin hallazgos abiertos. Los resultados propios se registran en
[validación 003](especificaciones/003-proveedores/validacion.md).
CI remota, aceptación e integración pendientes de actuación humana.

AG-010 ha implementado [002 — Identidad y acceso](especificaciones/002-identidad-acceso/especificacion.md),
con especificación, plan y tareas aprobados expresamente por la persona responsable.
Las comprobaciones locales pasan: 55 pruebas backend, 56 Angular, 8 E2E,
Docker sin caché, Compose con caída/recuperación reales y auditorías finales.
El [informe AG-010](docs/trazabilidad/AG-010-informe.md) y la
[validación 002](especificaciones/002-identidad-acceso/validacion.md) separan resultados
reales de pendientes. 002 no está aceptada ni integrada.

### Base de entrada conservada

AG-008 completó la verificación local de la base implementada en AG-006:
Spotless y `mvnw verify` pasaron, con 13 pruebas backend, 11 Angular y 5 E2E
acreditadas. PostgreSQL/Flyway, persistencia, caída 503 y recuperación pasaron.

La persona responsable publicó `feature/001-base-verificable` y la PR borrador #1.
La primera CI remota se ejecutó: frontend pasó; backend falló por la notación
de versión Java de setup-java y Compose por `COPY public` sobre una carpeta vacía.
[REV-001](docs/trazabilidad/REV-001-revision-independiente-01.md) registró R-01 a R-04.
[AG-009](docs/trazabilidad/AG-009-informe.md) aplica las correcciones y repite la QA local.
**La segunda CI remota está pendiente del siguiente push humano; 001 no está
aceptada ni integrada.** AG-009 no ejecuta operaciones Git.

La [validación](especificaciones/001-base-verificable/validacion.md) conserva los
resultados actuales y la historia anterior. [Versiones](docs/documentaciondev/versiones.md)
conserva AG-004/005 y la selección de AG-006. La política autorizada de
[ADR-0002](docs/decisiones/ADR-0002-politica-dependencias-transitivas.md) permite
las transitivas preliminares verificadas; las directas siguen estables y exactas.
El [informe AG-006](docs/trazabilidad/AG-006-informe.md) conserva los resultados
históricos; el informe AG-009 reúne las correcciones, evidencias y pendientes actuales.

Ya existen:

- visión y alcance, constitución y reglas de trabajo para los agentes;
- política de seguridad, modelo de amenazas y cobertura OWASP;
- política de calidad y conciliación de los 28 hallazgos iniciales de seguridad;
- configuración básica de edición y Git, y un repositorio público en GitHub.

Los diagnósticos previos de configuración y MCP permanecen en la trazabilidad.
AG-006 leyó y aplicó las cuatro skills locales pertinentes y utilizó el
[fallback aprobado](docs/metodologia/orquestacion.md#16-fallback-agéntico)
de nivel 3, sin delegación. No volvió a probar MCP ni permisos de roles delegados.
Existen aplicación local, pruebas y configuración de CI. No existe despliegue público.
La integración continua es la automatización de comprobaciones de los cambios.

## Actores previstos

| Actor | Responsabilidad prevista |
|---|---|
| Solicitante | Crear y gestionar las solicitudes que tenga permitidas. |
| Supervisor | Revisar solicitudes y aprobarlas o rechazarlas cuando esté autorizado. |
| Auditor | Consultar información e historial autorizados, sin permisos de modificación por ese rol. |
| Administrador | Gestionar funciones administrativas definidas expresamente. |

Un supervisor no podrá aprobar su propia solicitud.
Ser administrador no permitirá saltarse las reglas de negocio.

## Funcionalidades previstas

La primera versión deberá permitir:

- identificar a los usuarios y comprobar sus permisos;
- gestionar proveedores, solicitudes y los conceptos de cada solicitud;
- calcular o validar importes en el servidor;
- guardar borradores y presentar solicitudes para revisión;
- aprobar o rechazar mediante cambios de estado permitidos;
- consultar listados, filtros, paginación e historial autorizado;
- detectar cambios simultáneos incompatibles sin sobrescribir datos en silencio;
- evitar efectos duplicados cuando una operación se repita y así lo requiera;
- abrir las pantallas principales mediante rutas directas de Angular;
- ofrecer endpoints REST independientes para operaciones CRUD y de negocio;
- documentar la API con OpenAPI y Swagger UI;
- ofrecer una demo pública validada con datos ficticios.

CRUD significa crear, consultar, modificar y eliminar.
Un endpoint es una dirección de la API para una operación concreta.

Están implementadas la base técnica001, la identidad002 (acceso, cuenta, sesiones
y roles), el catálogo003, las solicitudes con conceptos e importes004, las
aprobaciones005 y la concurrencia e idempotencia transversal006. Incluyen versiones
optimistas, recuperación de operaciones, registro de presentación y evento mínimo
de decisión.
El historial funcional ampliado007 está implementado y verificado localmente por AG-014;
la demo pública continúa prevista.
No se incluyen pagos reales, operaciones bancarias ni datos reales de clientes.
La [visión y alcance](docs/vision-y-alcance.md) define los límites completos.

## Tecnologías y arquitectura previstas

| Parte | Tecnología prevista y función |
|---|---|
| Servidor o backend | Java 21 y Spring para las reglas y operaciones del sistema. |
| Interfaz o frontend | HTML define la estructura y CSS la presentación; Angular con TypeScript organiza el comportamiento. |
| Datos | PostgreSQL para guardar la información. |
| Entorno de ejecución | Docker para preparar los servicios en contenedores, con sus dependencias y configuración. |
| Comunicación | API REST, una interfaz HTTP para intercambiar datos y solicitar operaciones. |
| Contrato y consulta de la API | OpenAPI para describirla y Swagger UI para consultar e interactuar con esa descripción. |

TypeScript se convierte en JavaScript para ejecutarse en el navegador.
Las rutas Angular permitirán abrir directamente una pantalla; los endpoints REST
permitirán llamar a operaciones de la API con sus propios permisos y validaciones.
La demo pública está prevista; todavía no existe un despliegue validado.

La arquitectura prevista es un monolito modular: una aplicación de servidor
organizada en módulos con responsabilidades claras.
Separará la entrada HTTP, los casos de uso, las reglas de negocio y la persistencia.
Persistencia significa cómo se guarda y recupera la información.
Angular se organizará por funcionalidades.
La [arquitectura actual](docs/documentaciondev/arquitectura.md) describe la base
existente sin atribuirle módulos funcionales futuros.

## Forma de trabajo

Se utiliza SDD spec-anchored: desarrollo guiado por especificaciones que se
mantienen como referencia durante toda la evolución del sistema.
Primero se define qué debe cumplirse; después se planifica, se divide en tareas,
se implementa lo autorizado y se comprueba el resultado.
Los cambios de requisitos se reflejan primero en su especificación.

El desarrollo agéntico supervisado consiste en utilizar agentes de IA con
funciones delimitadas: proponer, implementar o revisar.
La persona responsable del proyecto conserva la decisión y aprobación entre fases.
Las reglas de actuación están en [AGENTS.md](AGENTS.md).

## Seguridad, calidad y documentación

La seguridad y la calidad son requisitos desde el diseño.
El servidor es la autoridad final sobre identidad y permisos; las reglas de datos
de los módulos futuros se definirán en sus respectivos incrementos.
Una funcionalidad necesitará criterios de aceptación y evidencias de sus comprobaciones;
tener políticas escritas no demuestra que los controles funcionen.

El [índice documental](docs/README.md) reúne los documentos existentes y su responsabilidad.
La [constitución](docs/constitucion.md) fija los principios del proyecto.
Las políticas de [seguridad](docs/seguridad.md), [calidad](docs/politicas/calidad.md)
y [documentación](docs/politicas/documentacion.md) desarrollan sus reglas.

## Ejecución

Desde la raíz, con Docker disponible y solo si no existe una configuración local:

```powershell
Copy-Item infraestructura/.env.example infraestructura/.env
docker compose --env-file infraestructura/.env -f infraestructura/compose.yaml up -d --build --wait --wait-timeout 120
```

Abrir [inicio](http://127.0.0.1:18080/inicio) o
[Swagger](http://127.0.0.1:18080/swagger-ui/index.html). El ejemplo usa valores ficticios.
PostgreSQL no publica puertos. Para detener sin borrar datos:

```powershell
docker compose --env-file infraestructura/.env -f infraestructura/compose.yaml stop
```

La [guía de entorno](docs/documentaciondev/entorno.md) detalla requisitos,
construcción, pruebas, arranque, parada, errores comprobados y límites pendientes.
