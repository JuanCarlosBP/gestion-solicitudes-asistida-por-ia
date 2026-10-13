---
name: sdd
description: "Comprobar la preparación de un incremento SDD antes de pasar de etapa. Usar al revisar especificación, clarificaciones, plan o tareas y sus aprobaciones; no autoriza implementar."
---

# Comprobar el paso entre etapas SDD

**Estado:** Aprobada

## Entradas

- Objetivo y etapa actual del incremento.
- Especificación, plan y tareas que realmente existan.
- Evidencia de aprobación humana y dudas pendientes.
- Cambios de requisitos propuestos.

## Fuentes

Lee [AGENTS](../../../AGENTS.md) y [MEMORY](../../../MEMORY.md).
Consulta el [proceso SDD](../../../docs/metodologia/sdd.md).
Aplica la [constitución](../../../docs/constitucion.md)
y la [política de calidad](../../../docs/politicas/calidad.md).

## Procedimiento

1. Identifica el incremento y su estado real.
2. Comprueba el documento que gobierna la etapa.
3. Relaciona cada requisito con criterios observables.
4. Separa hechos, propuestas y dudas sin inventar reglas.
5. Comprueba las aprobaciones necesarias para el siguiente paso.
6. Revisa coherencia entre alcance, plan y tareas si existen.
7. Si cambió un requisito, identifica todos sus documentos afectados.
8. Devuelve la decisión pendiente y el siguiente paso permitido.

No crees plan o tareas antes de aprobar la especificación,
salvo autorización humana expresa para preparar esos borradores.
Preparar borradores no permite implementar.
No cambies un estado a aprobado por haber completado esta revisión.

## Comprobaciones

Comprueba alcance, exclusiones y criterios de aceptación.
Verifica que no se perdió un requisito al dividir tareas.
Revisa dependencias y evidencia esperada.
Señala contradicciones con las políticas aplicables.
Distingue autorización para redactar de autorización para ejecutar.

## Salida

Entrega etapa revisada y documentos consultados.
Lista criterios completos, carencias y decisiones humanas necesarias.
Propón un siguiente paso concreto con sus condiciones.
Usa el [relevo](../../../docs/metodologia/plantillas/relevo.md)
si otro agente debe continuar.

## Parada

Detente ante falta de aprobación, contradicción o requisito ambiguo.
No implementes ni ejecutes Git como parte de esta skill.
No apruebes en nombre de la persona responsable.
Si se necesita cambiar alcance, vuelve a la especificación.
