# Gestión de Solicitudes

**Estado del documento:** Aprobada como presentación inicial

Aplicación empresarial prevista para centralizar la creación, revisión,
aprobación y seguimiento de solicitudes internas.
Su finalidad es reunir los datos y las decisiones en un mismo lugar,
con permisos claros y un historial que permita saber qué ocurrió.

## Estado actual

El proyecto está en preparación documental, sin una aplicación ejecutable.
P0 está completada y G01 está publicado en GitHub.
G02-A y G02-B están aprobados; P1 está preparado para cierre Git humano.
P2 está aprobado documentalmente y 001 está aprobado para implementación.
El prompt nocturno está aprobado con preflight y fallback; espera lanzamiento humano
después de la revisión Git y los dos commits/pushes. Esta consolidación no ejecutó Git.

Ya existen:

- visión y alcance, constitución y reglas de trabajo para los agentes;
- política de seguridad, modelo de amenazas y cobertura OWASP;
- política de calidad y conciliación de los 28 hallazgos iniciales de seguridad;
- configuración básica de edición y Git, y un repositorio público en GitHub.

La configuración está reconocida y los roles y skills son visibles.
El MCP documental funciona; la delegación, los permisos reales de roles y el uso
explícito de skills quedan pendientes del preflight, con el
[fallback aprobado](docs/metodologia/orquestacion.md#16-fallback-agéntico).
Todavía no existen backend, frontend ni base de datos ejecutables.
Tampoco hay pruebas de la aplicación, integración continua,
configuración Docker funcional, contrato OpenAPI, Swagger UI ni despliegue.
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

Estas capacidades forman parte del alcance previsto; todavía no están implementadas.
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
Este diseño de referencia no implica que sus componentes ya existan.

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
El servidor será la autoridad final sobre identidad, permisos y datos.
Una funcionalidad necesitará criterios de aceptación y evidencias de sus comprobaciones;
tener políticas escritas no demuestra que los controles funcionen.

El [índice documental](docs/README.md) reúne los documentos existentes y su responsabilidad.
La [constitución](docs/constitucion.md) fija los principios del proyecto.
Las políticas de [seguridad](docs/seguridad.md), [calidad](docs/politicas/calidad.md)
y [documentación](docs/politicas/documentacion.md) desarrollan sus reglas.

## Ejecución

Las instrucciones de ejecución se añadirán cuando exista una aplicación ejecutable
y sus pasos se hayan comprobado.
En el estado actual no hay un procedimiento de arranque del producto.
