---
name: verificacion-qa
description: "Verificar los criterios de una tarea aprobada y registrar resultados reales. Usar al preparar o ejecutar QA de un incremento, sin confundir pruebas pendientes con superadas."
---

# Verificar una tarea con evidencia

**Estado:** Aprobada

## Entradas

- Especificación, plan y tarea aprobados.
- Archivos o versión que se va a comprobar.
- Entorno disponible y permisos de ejecución.
- Evidencias anteriores y cambios desde su obtención.

## Fuentes

Lee [AGENTS](../../../AGENTS.md) y [MEMORY](../../../MEMORY.md).
Aplica [calidad](../../../docs/politicas/calidad.md).
Consulta [seguridad](../../../docs/seguridad.md) cuando corresponda.
Usa [SDD](../../../docs/metodologia/sdd.md) para relacionar criterios y tareas.

## Procedimiento

1. Relaciona cada criterio con una comprobación concreta.
2. Identifica comandos, datos y recursos necesarios.
3. Comprueba si el rol tiene permiso para generar artefactos.
4. Ejecuta primero las comprobaciones enfocadas al cambio.
5. Ejecuta después el conjunto obligatorio del incremento.
6. Registra comando, entorno, fecha y resultado observado.
7. Distingue fallos de producto, fallos de entorno y pendientes.
8. Entrega cobertura de criterios y bloqueos de aceptación.

Una revisión de solo lectura no puede ejecutar builds que escriban.
En ese caso solicita evidencia al implementador.
No inventes un comando ni lo presentes como comprobado antes de ejecutarlo.
No ejecutes Git para identificar la versión cuando esté prohibido:
usa referencias facilitadas o huellas de los archivos.

## Comprobaciones

Incluye errores, límites, permisos y concurrencia cuando sean aplicables.
Revisa tipos, formato, lint y análisis según la tarea.
Comprueba que una prueba fallida no se esconda con reintentos.
Un resultado posterior exige explicar qué cambió.
No omitas una prueba obligatoria porque falle el entorno.

## Salida

Entrega criterio, comprobación, resultado y evidencia.
Separa esperado de observado.
Marca lo pendiente y explica su impacto.
Actualiza la validación solo dentro del alcance de escritura autorizado.
No declares aceptada una tarea: la decisión es humana.

## Parada

Detente si ejecutar requiere permisos o recursos no disponibles.
Tras dos correcciones fallidas del mismo problema, solicita decisión humana.
No reduzcas criterios para dar el trabajo por terminado.
No inventes cobertura, tiempos, tokens ni resultados.
