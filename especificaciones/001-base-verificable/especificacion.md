# 001 — Base verificable: especificación

**Estado:** Aprobada

## Propósito

Crear una base técnica pequeña que pueda construirse, arrancarse y comprobarse.
Debe permitir añadir después funcionalidades completas sin comenzar
con un entorno desconocido o sin pruebas.
Este documento describe resultados exigidos; el estado implementado y las
comprobaciones se mantienen en [validación](validacion.md).

## Alcance y actores

La persona que desarrolla necesita preparar y comprobar el entorno.
La persona responsable necesita evidencia para aceptar la base.
La pantalla inicial permite comprobar la comunicación técnica con la API.

Se incluyen Java 21, Spring, Maven Wrapper, Angular con TypeScript,
HTML y CSS/SCSS, PostgreSQL, migraciones versionadas y Docker Compose.
También API REST, OpenAPI, Swagger UI, pruebas iniciales y CI.

## Exclusiones

No se implementan usuarios, login, roles ni recuperación de cuentas.
No se implementan proveedores, solicitudes, conceptos, importes ni aprobaciones.
No se implementan concurrencia funcional, idempotencia o historial de negocio.
No se despliega una demo pública ni se utilizan datos reales.
Estas exclusiones delimitan 001; no reducen el alcance final del producto.

## Requisitos y criterios de aceptación

### BV-01 — Entorno reproducible

El repositorio deberá indicar las versiones exactas finalmente utilizadas.
Java será 21; las demás versiones tendrán compatibilidad y origen comprobados.
Las dependencias y herramientas de construcción quedarán fijadas.
El backend se construirá mediante Maven Wrapper en Windows y en CI Linux.
El frontend usará un archivo de bloqueo de dependencias.

Aceptación: los comandos documentados preparan el entorno desde fuentes
y configuración de ejemplo, sin depender de secretos publicados.
Una plataforma no probada se declarará pendiente, aunque el diseño la contemple.

### BV-02 — Backend técnico

Existirá una aplicación Spring con Java 21 que pueda construirse y arrancarse.
Su organización dejará separadas entrada HTTP, comprobación técnica y acceso a datos.
No creará capas o entidades de negocio vacías para aparentar módulos futuros.

Aceptación: build y arranque correctos con configuración válida.
Si falta configuración imprescindible, el fallo será claro y no mostrará secretos.

### BV-03 — PostgreSQL y migraciones

El entorno usará PostgreSQL real, con migraciones numeradas y versionadas.
La migración inicial preparará únicamente la estructura técnica necesaria.
No habrá tablas ni datos de los dominios funcionales excluidos.

Aceptación: la migración se aplica en una base nueva y queda registrada.
Un segundo arranque no la repite ni falla por haberse aplicado antes.
Una migración inválida detiene la preparación; no se oculta el error.
Las pruebas usarán una base aislada y desechable, sin tocar datos ajenos.

### BV-04 — API y salud

Existirá un endpoint REST de consulta del estado técnico.
Cuando la aplicación y su acceso a PostgreSQL estén disponibles,
devolverá HTTP 200 y un estado público de disponibilidad.
Cuando falle esa dependencia, devolverá HTTP 503 con un mensaje controlado.

Aceptación: no revela host, credenciales, consultas, stack traces ni configuración.
El contrato describe ambas respuestas y se comprueban mediante HTTP.
Un resultado de salud correcto no acredita ninguna funcionalidad de negocio.

### BV-05 — Contrato OpenAPI y Swagger UI

La API técnica tendrá una descripción OpenAPI coherente con su comportamiento.
Swagger UI permitirá consultar y probar ese contrato en el entorno local.
No se expondrán interfaces administrativas o diagnósticos adicionales.

Aceptación: descripción accesible y válida, con códigos y campos previstos.
Swagger UI carga esa descripción y la petición técnica funciona.
No se incorpora una API de ejemplo ajena al proyecto.

### BV-06 — Angular y rutas directas

Existirá una aplicación Angular con TypeScript, HTML y CSS o SCSS.
Tendrá una pantalla básica que muestre el nombre del producto y el estado técnico.
Distinguirá carga, disponibilidad y error sin mostrar información interna.
TypeScript se compilará a JavaScript para el navegador.

Aceptación: la pantalla se abre por su ruta directa y sigue funcionando al recargar.
La ruta raíz lleva a la pantalla inicial.
Una ruta desconocida produce una salida controlada.
El build frontend y la prueba básica del componente deben pasar.
La información será comprensible, accesible por teclado y no dependerá solo del color.

### BV-07 — Docker Compose local

Una definición Compose permitirá iniciar backend, frontend y PostgreSQL.
La configuración distinguirá valores de ejemplo de secretos locales.
Solo se publicarán en la máquina local los puertos necesarios.
PostgreSQL no será accesible desde Internet.

Aceptación: arranque conjunto y consulta desde el navegador.
Los datos locales persisten al parar y arrancar normalmente.
El procedimiento explica cómo detener el entorno sin borrar datos.
Una limpieza destructiva requiere autorización y un entorno desechable identificado.

### BV-08 — Pruebas iniciales y análisis

Habrá pruebas unitarias útiles del backend y frontend.
Habrá integración con PostgreSQL real, prueba HTTP y prueba frontend básica.
Se comprobarán también errores relevantes, migraciones y navegación.
Se ejecutarán tipos, formato/lint y análisis estático aplicables.
Se revisarán dependencias y vulnerabilidades sin ocultar los hallazgos.

Aceptación: cada criterio tiene una comprobación y un resultado real.
Un fallo obligatorio impide marcar el incremento como verificado.
La cobertura se informa cuando se mida; no se inventa un umbral previo.
Las pruebas no probarán funciones de negocio todavía inexistentes.

### BV-09 — CI inicial

Existirá un workflow que automatice builds y comprobaciones iniciales.
Usará versiones fijadas, permisos mínimos y configuración sin secretos publicados.
Conservará informes útiles de pruebas sin datos sensibles.

Aceptación local: configuración validada y comandos equivalentes ejecutados.
Aceptación remota: ejecución real del workflow tras publicación humana,
identificada mediante enlace y revisión correspondiente.
Sin publicación no se declarará que la CI remota ha pasado.

### BV-10 — Documentación y evidencia

Existirá documentación de requisitos del entorno, configuración, construcción,
pruebas, arranque, parada, depuración básica y errores frecuentes comprobados.
La validación relacionará BV-01 a BV-10 con evidencia, fecha y entorno.
El README reflejará solo las capacidades que realmente existan.

Aceptación: otra persona puede seguir los pasos con datos ficticios.
Cada limitación se declara con su efecto sobre la aceptación.
No se crea validación antes de tener comprobaciones reales.

## Seguridad aplicable

Rigen [seguridad](../../docs/seguridad.md) y
[calidad](../../docs/politicas/calidad.md).
Se revisan especialmente exposición técnica, secretos, dependencias y errores.
El servicio local no debe convertirse en una demo pública por accidente.
La autenticación del producto se definirá en un incremento posterior.

## Aprobación registrada

La persona responsable del proyecto aprobó expresamente esta especificación,
el [plan](plan.md), las [tareas](tareas.md) y DT-01 a DT-08 el 2026-10-13.
001 está aprobado para implementación tras lanzamiento humano y preflight bloqueante.
Esta consolidación documental no inicia su ejecución.
En el momento de esa aprobación no se había ejecutado ninguna aceptación.
AG-006 implementó la base técnica; los resultados y pendientes actuales están
en validación, sin cambiar los requisitos anteriores.
