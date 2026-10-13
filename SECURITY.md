# Comunicación de vulnerabilidades

**Estado:** Aprobado

Este documento explica cómo avisar de un posible problema de seguridad.
No sustituye la [política de seguridad](docs/seguridad.md),
que define los controles exigidos al producto.

## Canal de comunicación

Envía el aviso a **jcbpsoft@gmail.com**.
Usa un asunto breve que permita identificar el componente afectado.
No publiques detalles explotables en una issue pública.

Comunica el problema de forma privada antes de proponer su divulgación.
No adjuntes contraseñas, tokens, claves privadas ni datos reales.
Si la evidencia contiene información sensible, describe dónde aparece
sin copiar su valor.

## Información útil

Indica, cuando puedas:

- qué parte del proyecto parece afectada;
- versión, referencia o fecha del contenido revisado;
- comportamiento esperado y comportamiento observado;
- pasos mínimos para reproducir el problema de forma segura;
- condiciones necesarias para que ocurra;
- impacto que has observado, separado del que solo sospechas;
- entorno de prueba y datos ficticios utilizados;
- evidencia reducida y revisada para que no contenga secretos;
- una forma de contacto para aclaraciones.

No es necesario demostrar un daño real para comunicar un riesgo.
Evita pruebas que alteren datos ajenos, degraden un servicio
o accedan a información fuera de tu autorización.
No se pide realizar ataques contra una futura demo pública.

## Confirmación y seguimiento

La persona responsable revisará el aviso y confirmará su recepción
cuando pueda atenderlo.
Pedirá aclaraciones si faltan datos para reproducirlo o valorar el impacto.
La prioridad dependerá del riesgo y del alcance afectado.

Se comunicará el estado de la revisión por el mismo canal privado.
No se promete un plazo fijo que todavía no pueda sostenerse.
Una corrección necesitará comprobaciones antes de darse por resuelta.
La publicación de detalles se coordinará según el riesgo restante.

## Alcance actual

El repositorio contiene documentación y preparación del trabajo con agentes.
Todavía no ofrece una aplicación funcional ni una demo pública validada.
Un hallazgo puede afectar a reglas, configuración, dependencias previstas
o información expuesta en los documentos.

No existe aún una política de soporte de versiones del producto desplegado.
Cuando haya versiones entregadas se documentará su cobertura real.
La aprobación de una política no demuestra que sus controles funcionen.

## Seguimiento en el proyecto

Los hallazgos confirmados se relacionarán con requisito, tarea y evidencia.
Los informes públicos omitirán información que facilite una explotación activa.
Los avisos privados no se copiarán íntegros a Git.
El [modelo de amenazas](docs/seguridad/modelo-de-amenazas.md)
y la [cobertura OWASP](docs/seguridad/cobertura-owasp.md)
orientarán la revisión cuando sean aplicables.
