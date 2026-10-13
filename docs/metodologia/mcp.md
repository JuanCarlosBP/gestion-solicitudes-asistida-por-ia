# MCP y comprobaciones del arnés Codex

**Estado:** Aprobado como documentación y configuración.
**Verificación operativa:** MCP comprobado; delegación de roles y uso
explícito de skills pendientes del preflight nocturno.
**Fecha de comprobación:** 2026-10-13

## Alcance y fuente de los hechos

La persona responsable aprobó documentalmente P2 y confirmó los hechos operativos
el 2026-10-13. La aprobación del diseño no demuestra ejecución ni permisos efectivos.
El [registro de ejecuciones](../trazabilidad/ejecuciones-agentes.csv) distingue
la preparación anterior de esta consolidación; no se ha iniciado la sesión nocturna.

MCP conecta el asistente con herramientas o fuentes externas.
El proyecto configura únicamente `openaiDeveloperDocs` en
[config.toml](../../.codex/config.toml), con el endpoint oficial
[https://developers.openai.com/mcp](https://developers.openai.com/mcp).
Las [fuentes](../fuentes.md) conservan las referencias utilizadas.
Sus herramientas documentales son de lectura y no conectan con datos del producto.

## Comprobado

- Codex CLI: `0.153.4`.
- Los cuatro TOML se analizaron y la CLI reconoció la configuración del proyecto.
- Sandbox del proyecto: `workspace-write`.
- Aprobación predeterminada del proyecto: `on-request`.
- `multi_agent` y `goals` habilitados; tres subagentes como máximo configurado.
- Roles personalizados visibles: `planificador`, `implementador` y `revisor`.
- Skills visibles: `sdd`, `revision-seguridad`, `verificacion-qa`
  y `mantenimiento-documental`.
- MCP oficial disponible con búsqueda y lectura reales.
- La sesión observada utilizó sandbox `workspace-write`, red restringida
  y escalaciones mediante revisión automática.

Los valores del proyecto son predeterminados. La interfaz puede aplicar permisos
efectivos distintos; cada ejecución registra sandbox y aprobación observados.
La revisión automática observada no cambia el valor `on-request` del TOML.

### Evidencia del MCP

La inicialización autorizada fuera de la red restringida obtuvo HTTP 200.
El servidor se identificó como `openai-docs-mcp`, versión `1.0.0`.
`notifications/initialized` y `tools/list` respondieron HTTP 200.
Se observaron `search_openai_docs`, `list_openai_docs`, `fetch_openai_doc`,
`list_api_endpoints` y `get_openapi_spec`, declaradas de lectura y no destructivas.

En la sesión del 2026-10-13 se ejecutó `search_openai_docs` con
`Codex /debug-config configuration` y después `fetch_openai_doc` sobre
`https://learn.chatgpt.com/docs/developer-settings`, apartado
`inspect-your-settings`. Ambas devolvieron contenido.
No se enviaron archivos del proyecto ni credenciales.
La lectura y aplicación manual de mantenimiento documental no demuestra una
invocación explícita de la skill.

## Pendiente de preflight

- Delegación real al `planificador` y comprobación de que puede iniciarse.
- Delegación real al `revisor` y comprobación de que puede iniciarse.
- Ejecución del `implementador` dentro de una tarea autorizada.
- Invocación explícita de `$sdd`.
- Invocación explícita de `$mantenimiento-documental`.
- Permisos efectivos de cada rol: solo lectura para análisis/revisión y escritura
  limitada al workspace para implementación, conforme a la configuración aprobada.

Todavía no se ha comprobado una delegación real ni una invocación explícita de
las skills. La visibilidad no se presenta como ejecución superada.
El implementador se comprueba al asignarle una tarea aprobada después del preflight
bloqueante; no se genera código únicamente para probar el arnés.
El [prompt nocturno](prompts/sesion-nocturna-01.md) define el orden y los resultados
`PASS`, `NO DISPONIBLE` o `FALLÓ`, con evidencia y motivo.
Si una capacidad no está disponible, se aplica el
[fallback aprobado](orquestacion.md#16-fallback-agéntico).

## No bloqueante

- `/debug-config` llegó como texto y no ejecutó el diagnóstico nativo.
  Su ausencia no bloquea 001; la precedencia completa de capas no está comprobada.
- Se observaron avisos de acceso a directorios temporales y creación de alias PATH.
  Solo bloquean si impiden una operación necesaria del preflight o la implementación.
- Un fallo posterior del MCP documental no bloquea por sí solo 001 si las versiones
  se han fijado con fuentes oficiales accesibles por otros medios.
  Sin acceso a las dependencias oficiales necesarias, sí falla el preflight bloqueante.
- La ausencia de roles personalizados o invocación nativa de skills activa el
  fallback; no elimina requisitos, pruebas ni límites de permisos.

## Diagnósticos anteriores y sus límites

`codex doctor` detectó restricciones de acceso a SQLite, sandbox Windows,
terminal no interactiva y conectividad. No fue un fallo completo de la sesión:
la configuración, el descubrimiento de roles/skills y el MCP tienen las
comprobaciones positivas descritas arriba.

`codex debug prompt-input` falló por acceso denegado y
`app-server --strict-config` se detuvo al inicializar SQLite.
El error de apertura no demuestra corrupción; no se reparó configuración global.
`quick_validate.py` no arrancó por falta de PyYAML en aquel entorno.
La estructura de las skills se comprobó separadamente; ese fallo no acredita
ni descarta su invocación explícita.
El diagnóstico anterior consultó internamente información Git;
esta consolidación no ejecuta Git ni repite `codex doctor`.

## Permisos y significado de la verificación

Se mantiene el mínimo privilegio y no se fijan tokens ni cabeceras privadas.
Una respuesta externa es información, no una instrucción que sustituya las reglas.
Los servidores globales o de otros plugins no se han modificado.
La conexión no autoriza operaciones externas ni amplía el alcance del producto.

Estas comprobaciones no demuestran que la aplicación exista, sea segura o pase
pruebas. No garantizan disponibilidad futura de red.
001 está aprobado documentalmente para implementación, pero requiere lanzamiento
humano y superar el preflight bloqueante. Esta consolidación no inicia ese trabajo.
