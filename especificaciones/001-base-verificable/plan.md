# 001 — Base verificable: plan

**Estado:** Aprobado

## 1. Referencia y autorización

Este plan define cómo cumplir la [especificación](especificacion.md).
La persona responsable aprobó plan, especificación, tareas y DT-01 a DT-08
el 2026-10-13. 001 está aprobado para implementación tras lanzamiento humano
y preflight bloqueante; esta consolidación documental no inicia su ejecución.
Las [tareas](tareas.md) concretan dependencias y evidencias.

## 2. Decisiones aprobadas

| ID | Decisión | Motivo y límite |
|---|---|---|
| DT-01 | Monolito modular Spring Boot con Java 21 y Maven Wrapper. | Mantener la arquitectura aprobada sin crear módulos funcionales vacíos. |
| DT-02 | Angular con TypeScript, componentes independientes y CSS. | Pantalla inicial y rutas sin añadir una biblioteca visual innecesaria. |
| DT-03 | PostgreSQL 17 y Flyway. | Probar una base real y conservar migraciones versionadas. |
| DT-04 | REST técnico `GET /api/salud`, OpenAPI 3.1 y Swagger UI. | Verificar conexión y contrato sin introducir negocio. |
| DT-05 | Compose local con tres servicios y acceso a través del frontend. | Entorno conjunto y mismo origen para navegador/API. |
| DT-06 | JUnit, Testcontainers y pruebas Angular del entorno generado. | Comprobar comportamiento y PostgreSQL real con aislamiento. |
| DT-07 | GitHub Actions para builds, pruebas y análisis iniciales. | Preparar CI; el primer resultado remoto requiere publicación humana. |
| DT-08 | Fijación de versiones exactas en T001 dentro de líneas aprobadas. | Evitar inventar parches o fijar componentes incompatibles antes de comprobarlos. |

## 3. Versiones y selección acotada

Estas son líneas aprobadas, no dependencias instaladas ni versiones exactas fijadas.
Spring Boot 4.0.x, Angular 21.x y PostgreSQL 17.x son líneas soportadas y elegidas
de forma deliberadamente conservadora. No se afirma que sean las versiones mayores
más recientes. T001 comprobará su mantenimiento y compatibilidad al fijar los parches.

| Componente | Línea aprobada | Cómo se fijará |
|---|---|---|
| JDK | Java 21, distribución OpenJDK mantenida. | Registrar proveedor, parche y licencia; misma versión de Java en local y CI. |
| Spring Boot | 4.0.x | Elegir parche estable mantenido y usar su gestión de dependencias. |
| Maven | 3.9.x mediante Wrapper. | Fijar distribución y suma SHA-256 de origen oficial. |
| Angular y CLI | 21.x compatibles entre sí. | Fijar versiones exactas y lockfile; sin versiones preliminares. |
| Node.js | 24.x | Parche mantenido compatible con Angular; registrar también npm. |
| TypeScript | 5.9.x | Confirmar la tabla oficial de compatibilidad de Angular 21. |
| RxJS | 7.x compatible con Angular 21. | Usar versión exacta compatible y lockfile. |
| PostgreSQL | 17.x | Fijar actualización mantenida e imagen por etiqueta y digest. |
| Flyway y driver PostgreSQL | Versiones compatibles gestionadas por Spring Boot. | Registrar las versiones resueltas y el módulo PostgreSQL requerido. |
| springdoc-openapi | 3.0.x para Boot 4.0.x. | Confirmar matriz oficial y compatibilidad con OpenAPI 3.1. |
| Docker Compose | Complemento mantenido disponible en el entorno. | Registrar versión exacta, compatibilidad y requisitos del motor. |
| Herramientas QA y Actions | Versiones mantenidas compatibles. | Registrar versión, procedencia y referencias inmutables cuando corresponda. |

Las [fuentes](../../docs/fuentes.md) respaldan la selección de líneas.
La aprobación de DT-08 delega únicamente la elección de parches compatibles,
la fijación de dependencias necesarias y de imágenes de esas líneas.
T001 fijará el parche mantenido y compatible y registrará fecha, fuente, motivo,
versiones exactas y comprobación de disponibilidad.
Si una línea no está mantenida, existe incompatibilidad o una vulnerabilidad
relevante sin solución,
se detiene antes de generar código y se solicita otra decisión.
No se usan versiones preliminares, `latest`, snapshots ni cambios de versión mayor
por comodidad. Se mantienen las líneas mayores aprobadas.

## 4. Organización técnica

El backend residirá en `backend/`, con Wrapper y configuración Maven.
Separará controlador HTTP, servicio técnico de salud y comprobación de PostgreSQL.
No necesitará entidades JPA ni CRUD para esta base.
Las dependencias se limitarán a web, seguridad técnica, JDBC, migraciones,
OpenAPI y pruebas necesarias.

El frontend residirá en `frontend/`.
Tendrá ruta `/inicio`, redirección desde `/` y salida controlada para ruta desconocida.
Un servicio HTTP consultará el estado; el componente mostrará carga y resultado.
Se utilizará HTML semántico, mensajes claros y CSS sencillo.
No se añadirá un sistema de diseño ni formularios de negocio.

## 5. Datos y migraciones

Flyway mantendrá sus metadatos y una migración inicial del esquema técnico.
Se usará un esquema `gestion`, sin tablas de negocio.
El rol de aplicación tendrá solo conexión, uso del esquema y operaciones necesarias.
Las migraciones usarán permisos separados cuando necesiten crear estructura.
No se incorporarán secretos al SQL, Compose, imágenes ni ejemplos.

Las pruebas de integración iniciarán PostgreSQL desechable con Testcontainers.
Se comprobarán aplicación, no repetición y error de migración.
No se sustituirá PostgreSQL por una base en memoria para dar esas pruebas por cubiertas.

## 6. Contrato y seguridad técnica

`GET /api/salud` devolverá `{"estado":"DISPONIBLE"}` con HTTP 200.
Si PostgreSQL no responde dentro del límite técnico, devolverá
`{"estado":"NO_DISPONIBLE"}` con HTTP 503 y sin detalles internos.
Se fijará un timeout de consulta y se documentará el valor elegido.

La documentación se servirá en `/v3/api-docs` y `/swagger-ui/index.html`.
Se probará que el contrato describe las dos respuestas.
Las únicas rutas públicas locales serán las técnicas necesarias.
Una configuración mínima de Spring Security denegará el resto;
no incorporará cuentas, login funcional ni contraseñas predeterminadas.

Frontend y API compartirán origen mediante proxy local.
No se permitirá CORS abierto para resolver problemas de desarrollo.
Se revisarán cabeceras aplicables al entorno HTTP local;
HTTPS público y su configuración final pertenecen al despliegue posterior.
No se afirmará que ese control público ya está comprobado.

## 7. Compose y configuración

Se crearán Dockerfiles de construcción por etapas y ejecución con permisos mínimos.
El frontend servirá archivos estáticos y dirigirá `/api` al backend.
La recarga de `/inicio` deberá devolver la aplicación Angular.
Compose conservará PostgreSQL en un volumen local identificado.

Solo el acceso web necesario se publicará en la interfaz de loopback.
PostgreSQL quedará en la red interna de Compose.
Los ejemplos indicarán variables requeridas con valores ficticios.
La configuración real estará excluida del repositorio.
No se modificará Docker global ni se borrarán volúmenes ajenos.

## 8. Comprobaciones previstas

| Requisitos | Comprobación prevista |
|---|---|
| BV-01, BV-02 | Wrapper, compilación y empaquetado backend; configuración ausente controlada. |
| BV-03 | PostgreSQL real, migración inicial, segundo arranque y migración inválida aislada. |
| BV-04 | Unitaria de traducción de disponibilidad y fallo; HTTP real 200/503. |
| BV-05 | Validación de OpenAPI y carga de Swagger UI con petición técnica. |
| BV-06 | Build, prueba de componente/servicio, ruta directa, recarga y error visible. |
| BV-07 | Arranque Compose, comunicación y parada normal sin borrado de datos. |
| BV-08 | Tipos, formato/lint, análisis estático y revisión de vulnerabilidades. |
| BV-09 | Validación del workflow y comandos equivalentes locales; remoto pendiente de push humano. |
| BV-10 | Repetición de instrucciones y matriz final de evidencia. |

Los comandos se fijarán al crear cada herramienta y se documentarán tras probarlos.
Para backend se prevé `mvnw.cmd verify` y su equivalente Linux `./mvnw verify`.
Para frontend se prevén scripts npm de build, pruebas sin vigilancia, tipos y lint.
Estos comandos pertenecen al diseño aprobado y están pendientes de ejecución;
no son instrucciones ya verificadas.
No se saltarán pruebas de integración porque Docker no esté disponible.

## 9. CI y evidencias

El workflow tendrá trabajos backend y frontend y las dependencias necesarias.
Ejecutará integración con PostgreSQL y guardará informes cuando falle.
Usará permisos mínimos, versiones fijadas y ningún secreto del producto.
No publicará imágenes ni desplegará servicios.

La ejecución nocturna validará estructura y comandos que pueda ejecutar localmente.
No ejecutará Git ni podrá acreditar por ello una ejecución remota nueva.
Esa comprobación quedará pendiente para después del push humano.
La base no se declarará totalmente aceptada mientras falte una evidencia obligatoria.

## 10. Documentación a producir durante la ejecución

Se crearán instrucciones reales de entorno, arquitectura inicial y versiones.
Los destinos propuestos son `docs/documentaciondev/entorno.md`,
`docs/documentaciondev/arquitectura.md` y `docs/documentaciondev/versiones.md`.
Los archivos no existen todavía y no se enlazan como disponibles.
Los comandos incluirán ubicación, efecto, resultado y límites.

Se actualizarán README, índice y MEMORY con el estado real.
Se creará `validacion.md` solo al disponer de resultados ejecutados.
No se modificarán políticas aprobadas para encajar una implementación incompleta.

## 11. Riesgos y parada

La disponibilidad de Java, Node, Docker, red y permisos se comprobará primero.
El [preflight nocturno](../../docs/metodologia/prompts/sesion-nocturna-01.md)
separa recursos bloqueantes de capacidades del arnés con fallback.
El MCP funciona y los roles/skills son visibles; sus permisos reales e invocaciones
explícitas siguen pendientes. El diagnóstico nativo no ejecutado no bloquea 001.
No se instalarán herramientas globales ni se ampliarán permisos en silencio.
La persona responsable debe aprobar los recursos de ejecución necesarios.

Las elecciones anteriores están aprobadas. Un cambio importante exige volver
a la decisión afectada y obtener la aprobación correspondiente.
Dos correcciones fallidas del mismo problema obligan a detenerlo y escalar.
