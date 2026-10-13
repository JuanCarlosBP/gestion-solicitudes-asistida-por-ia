# Fuentes públicas del proyecto

**Estado:** Aprobado
**Fecha de consulta:** 2026-10-13

Este registro recoge fuentes primarias consultadas para preparar los documentos.
Las decisiones aprobadas están en su documento principal; una recomendación
externa no autoriza por sí sola un cambio.
Ninguna fuente de esta lista demuestra que nuestra implementación funcione.

## Codex y herramientas de agentes

- [Configuración Codex](https://learn.chatgpt.com/docs/config-file/config-reference):
  referencia consultada para las claves de agentes, permisos y funciones.
  Contraste local: Codex CLI 0.153.4; no supone que todo su diagnóstico pase.
- [Subagentes](https://learn.chatgpt.com/docs/agent-configuration/subagents):
  apoya los tres roles locales y sus archivos TOML independientes.
  El comportamiento efectivo deberá respetar también los permisos de la sesión.
- [MCP de documentación OpenAI](https://developers.openai.com/learn/docs-mcp):
  fuente del endpoint oficial de documentación, sin credenciales en el proyecto.
- [Objetivos en Codex](https://developers.openai.com/cookbook/examples/codex/using_goals_in_codex):
  orienta el uso de objetivos; activarlos no inicia trabajo ni concede aprobación.
- [Inspección de configuración](https://learn.chatgpt.com/docs/developer-settings#inspect-your-settings):
  página leída mediante el MCP el 2026-10-13 tras una búsqueda real.
  Describe `/debug-config`; en esta sesión llegó como texto y no ejecutó el diagnóstico nativo.

## Seguridad

- [OWASP Top 10:2025](https://top10.owasp.org/2025/):
  organiza las diez familias de riesgos usadas en la cobertura del proyecto.
  Edición 2025; no es una certificación de seguridad.
- [OWASP ASVS](https://owasp.org/projects/asvs):
  versión de referencia 5.0.0, para elegir controles aplicables y verificables.
  Cada control seleccionado deberá llevar versión, requisito y evidencia propios.

## Backend y construcción

- [Java SE 21](https://docs.oracle.com/en/java/javase/21/):
  documentación de lenguaje, API y herramientas para el Java 21 aprobado.
  No elige automáticamente una distribución, licencia o actualización del JDK.
- [Requisitos de Spring Boot](https://docs.spring.io/spring-boot/4.0/system-requirements.html):
  orienta la compatibilidad de Spring con Java y Maven para el plan 001.
  La línea 4.0.x está aprobada; T001 fijará el parche antes de generar código.
- [Maven Wrapper](https://maven.apache.org/tools/wrapper/):
  apoya una construcción con versión de Maven e integridad de descarga fijadas.
  Su existencia futura no demostrará por sí sola un build correcto.

## Navegador y datos

- [Compatibilidad de Angular](https://angular.dev/reference/versions):
  relaciona Angular con Node.js, TypeScript y RxJS.
  Apoya las líneas aprobadas Angular 21.x y Node.js 24.x; falta la fijación exacta en T001.
- [Versiones de PostgreSQL](https://www.postgresql.org/support/versioning/):
  orienta la selección de una línea mantenida y sus actualizaciones.
  PostgreSQL 17.x está aprobado para 001; la imagen concreta se fijará con evidencia.

## Entorno y contrato HTTP

- [Docker Compose](https://docs.docker.com/compose/):
  explica la definición y ejecución conjunta de servicios.
  Apoya el entorno local reproducible previsto; no acredita un despliegue.
- [OpenAPI 3.1.1](https://spec.openapis.org/oas/v3.1.1.html):
  referencia del formato elegido para describir el contrato HTTP de 001.
- [springdoc-openapi](https://springdoc.org/):
  documentación primaria de la biblioteca elegida para generar OpenAPI y Swagger UI.
  Su matriz de compatibilidad se comprobará al fijar la versión para Spring Boot 4.0.

## Apoyos del plan 001

- [Distribuciones Maven](https://maven.apache.org/download.cgi): comprobar versiones e integridad.
- [Testcontainers PostgreSQL](https://java.testcontainers.org/modules/databases/postgres/):
  sustenta el diseño aprobado de integración con una base real aislada.
- [Flyway](https://documentation.red-gate.com/flyway): referencia para migraciones versionadas.
- [Workflows de GitHub Actions](https://docs.github.com/en/actions/concepts/workflows-and-actions/workflows):
  orienta la CI prevista; no demuestra una ejecución remota del proyecto.

## Líneas aprobadas para 001

Spring Boot 4.0.x, Angular 21.x y PostgreSQL 17.x son líneas soportadas elegidas
de forma deliberadamente conservadora. No se afirma que sean las versiones mayores
más recientes. La aprobación humana del 2026-10-13 mantiene esas líneas mayores.

T001 fijará el parche mantenido y compatible y registrará fecha, fuente y motivo
de la selección, además de mantenimiento, compatibilidad e integridad comprobados.
Si existe incompatibilidad, fin de mantenimiento o una vulnerabilidad relevante
sin solución, se detendrá antes de generar código y solicitará decisión humana.
No se usarán versiones preliminares ni `latest`.

## Uso y mantenimiento

La fecha de consulta no convierte una página cambiante en una versión fija.
Antes de implementar se contrastarán mantenimiento, compatibilidad y vulnerabilidades.
El plan distingue las líneas aprobadas de las versiones exactas aún por fijar.
Los parches y las imágenes elegidos quedarán registrados con su procedencia.

No se copian manuales completos ni se incorporan apuntes privados.
Al reutilizar contenido o componentes se respetará su licencia.
Las fuentes nuevas se registrarán cuando apoyen una decisión concreta.
Las pruebas del proyecto seguirán siendo la evidencia de su comportamiento.
