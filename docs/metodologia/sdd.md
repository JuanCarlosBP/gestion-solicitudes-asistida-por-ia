# Desarrollo guiado por especificaciones

**Estado:** Aprobado

## 1. Qué significa SDD spec-anchored

SDD es desarrollo guiado por especificaciones.
Spec-anchored significa que la especificación sigue siendo la referencia
durante el diseño, la implementación, las pruebas y los cambios.
No se escribe al principio para abandonarla cuando aparece código.

La especificación explica qué debe cumplirse.
El plan explica cómo se propone conseguirlo.
Las tareas ordenan unidades de trabajo que puedan comprobarse.

## 2. Punto de partida: Constitución

La [constitución](../constitucion.md) fija principios que todos deben respetar.
La [visión](../vision-y-alcance.md) define el alcance funcional inicial.
Las políticas de seguridad, calidad y documentación desarrollan sus reglas.
Una tarea no puede cambiar esas reglas de forma silenciosa.

Antes de iniciar un incremento se comprueba su encaje en el producto.
Se consulta [MEMORY.md](../../MEMORY.md) para conocer el estado reciente.
La memoria orienta; no reemplaza las fuentes permanentes.

## 3. Especificación

Cada incremento se guarda en una carpeta numerada de especificaciones.
Su archivo `especificacion.md` describe el problema y el resultado esperado.
Debe incluir actores afectados, alcance, exclusiones y requisitos identificables.
Cada requisito tendrá criterios de aceptación observables.

Los ejemplos usarán datos ficticios.
Se incluirán errores, límites, permisos y concurrencia cuando correspondan.
No se inventarán reglas para cerrar una duda pendiente.
La aprobación del alcance general no aprueba automáticamente cada incremento.

## 4. Clarificación

Se separan los hechos confirmados de las propuestas y las dudas.
Una duda debe explicar qué decisión falta y qué trabajo depende de ella.
Se ofrecen opciones y consecuencias cuando exista información suficiente.
La persona responsable resuelve los cambios de alcance y reglas de negocio.

Las respuestas se incorporan a la especificación, con su origen.
No se mantienen decisiones importantes solo en la conversación.
Una contradicción bloquea la parte afectada hasta que se resuelva.
Si no quedan dudas relevantes, se solicita la aprobación de la especificación.

## 5. Plan

Con la especificación aprobada, `plan.md` explica la solución propuesta.
Incluye arquitectura necesaria, contratos, datos, dependencias y riesgos.
También define cómo se comprobará cada requisito y qué documentos cambiarán.
Una decisión de arquitectura importante se justificará mediante un ADR.

Un ADR registra el problema, las opciones, la decisión y sus consecuencias.
No se crearán capas, servicios o dependencias por costumbre.
La propuesta debe respetar la arquitectura de referencia del proyecto.
La persona responsable aprueba el plan antes de implementarlo.

## 6. Tareas

`tareas.md` divide el plan en trabajos pequeños y verificables.
Cada tarea indica ID, requisitos, dependencias, archivos y responsable de escritura.
También concreta criterios de aceptación, comprobaciones y evidencia esperada.
Una tarea demasiado grande se divide sin perder ninguno de sus requisitos.

Se distingue trabajo independiente de trabajo que depende de otro resultado.
La [orquestación](orquestacion.md) regula asignación y paralelismo.
Las tareas empiezan pendientes y solo se ejecutan tras su autorización.
Tener una lista completa no equivale a haber recibido esa autorización.

## 7. Aprobaciones y preparación conjunta

Las aprobaciones de especificación, plan y tareas son decisiones distintas.
Una aprobación puede agrupar documentos si identifica expresamente cada uno.
En ese caso se comprueba primero su coherencia y se resuelven las dudas abiertas.
No se deduce una aprobación del silencio o del paso del tiempo.

Para preparar 001, la persona responsable pidió redactar juntos los tres archivos.
El 2026-10-13 aprobó expresamente especificación, plan, tareas y DT-01 a DT-08.
001 está aprobado para implementación tras lanzamiento humano y preflight bloqueante.
Esta consolidación documental no inicia su implementación ni acredita pruebas.
Las reglas habituales de paso entre etapas siguen vigentes para otros incrementos.

## 8. Implementación

El implementador recibe una tarea aprobada y un paquete de entrada.
Comprueba los archivos autorizados y las condiciones de parada.
Implementa el mínimo diseño suficiente para cumplir todos los requisitos.
No reduce comprobaciones ni amplía funcionalidades para facilitar el trabajo.

Si necesita cambiar una decisión aprobada, detiene la parte afectada.
Los defectos de implementación se corrigen sin alterar el requisito.
Cuando sea útil se aplica TDD según la [política de calidad](../politicas/calidad.md).
TDD comienza por una prueba que falla por el comportamiento que falta.

## 9. Validación

`validacion.md` nace cuando hay comprobaciones reales que registrar.
No se crea vacío antes de ejecutar el incremento.
Relaciona requisito, prueba, versión o huellas de archivos y resultado observado.
Indica comando, entorno, fecha, evidencia y limitaciones.

Se distinguen resultado esperado, observado, ejecutado y pendiente.
Si una comprobación falla, su resultado no se reemplaza por el deseado.
Una repetición se explica y conserva la causa de la corrección.
La falta de entorno deja una prueba pendiente; no permite darla por superada.

El revisor comprueba requisitos, cambios y evidencias sin reparar en esa revisión.
Las correcciones vuelven al implementador.
La persona responsable acepta o rechaza el resultado.
Una revisión técnica favorable no sustituye esa aceptación.

## 10. Cambio de requisito

Primero se describe qué requisito cambia y por qué.
Se revisan impacto, riesgos y criterios de aceptación.
La persona responsable aprueba el nuevo requisito.
Después se actualizan plan, tareas, implementación, pruebas y documentación.

Los cambios duraderos se relacionan con el [registro de decisiones](../trazabilidad/cambios.md).
Un cambio puramente técnico no se presenta como nueva regla de negocio.
Si afecta contratos o compatibilidad, se explica antes de aplicarlo.
La evidencia anterior no se reutiliza como prueba automática del nuevo comportamiento.

## 11. Documentos y salidas

| Etapa | Salida que debe quedar |
|---|---|
| Constitución | Principios vigentes y políticas aplicables, enlazados. |
| Especificación | Requisitos, alcance y criterios en `especificacion.md`. |
| Clarificación | Dudas y decisiones incorporadas a la especificación. |
| Plan | Solución propuesta y decisiones justificadas en `plan.md`. |
| Tareas | Orden, dependencias y evidencia esperada en `tareas.md`. |
| Implementación | Archivos autorizados y sus pruebas, aún por aceptar. |
| Validación | Resultados reales y pendientes en `validacion.md`. |
| Cambio | Requisito y documentos afectados actualizados y relacionados. |

El [índice de especificaciones](../../especificaciones/README.md) señala lo que existe.
La [plantilla de relevo](plantillas/relevo.md) permite transferir un trabajo concreto.

## 12. Cuándo detenerse

Se detiene la parte afectada si falta aprobación o hay requisitos contradictorios.
También si se necesita un secreto, permiso o acceso que no está disponible.
Un riesgo de seguridad no se resuelve desactivando el control.
Dos correcciones fallidas del mismo problema obligan a solicitar decisión humana.

Al detenerse se entrega lo realizado, el bloqueo y el siguiente paso propuesto.
El trabajo independiente solo continúa si ya estaba autorizado.
No se sigue programando para ocultar que faltaba una decisión.

## 13. Relación con Git

Git conserva la evolución; no decide si un requisito está aprobado.
La persona responsable revisa las diferencias y selecciona el staging.
Después comprueba lo seleccionado, crea el commit y realiza push.
Comprueba el remoto antes de dar por publicado el cambio.

Los agentes no ejecutan operaciones Git en este proceso.
Entregan un manifiesto de archivos y mensajes semánticos sugeridos.
La memoria se actualiza con hechos y referencias realmente conocidos.
Una versión publicada tampoco demuestra pruebas que no se hayan ejecutado.
