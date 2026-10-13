---
name: revision-seguridad
description: "Revisar un cambio frente a requisitos de seguridad y sus evidencias sin repararlo. Usar en revisión de autenticación, permisos, entradas, datos, dependencias o exposición del sistema."
---

# Revisar seguridad de un cambio

**Estado:** Aprobada

## Entradas

- Alcance y archivos de una versión identificada.
- Requisitos y criterios de seguridad aplicables.
- Diferencias de contenido y evidencias disponibles.
- Entorno y límites autorizados para la revisión.

## Fuentes

Lee [AGENTS](../../../AGENTS.md).
Consulta [seguridad](../../../docs/seguridad.md),
[amenazas](../../../docs/seguridad/modelo-de-amenazas.md)
y [OWASP](../../../docs/seguridad/cobertura-owasp.md).
La [calidad](../../../docs/politicas/calidad.md) define severidad y evidencias.

## Procedimiento

1. Identifica activos, entradas y fronteras afectadas.
2. Selecciona amenazas y controles aplicables, con sus IDs.
3. Revisa permisos por acción y recurso en el servidor.
4. Revisa validación, errores, secretos y configuración afectados.
5. Incluye dependencias, concurrencia o integridad si cambia su riesgo.
6. Contrasta cada control con su evidencia real.
7. Registra hallazgos y riesgo restante sin reparar archivos.
8. Devuelve al implementador las correcciones propuestas.

Trabaja en solo lectura cuando actúes como revisor.
No ejecutes ataques ni pruebas fuera del entorno autorizado.
Pide al implementador evidencia si la prueba necesita escribir artefactos.
No copies valores sensibles encontrados.

## Comprobaciones

Verifica que el frontend no sea la única barrera de permisos.
Comprueba casos negativos y límites relevantes.
No marques como mitigado un riesgo sin evidencia.
Usa no aplicable solo con una justificación de alcance.
No afirmes cumplimiento completo de OWASP o ASVS por una revisión parcial.

## Salida

Entrega hallazgos con archivo, requisito o amenaza, impacto y severidad.
Indica cómo reproducir o comprobar cada hallazgo de forma segura.
Lista controles comprobados, pendientes y limitaciones.
Relaciona la evidencia con los archivos revisados.
La persona responsable conserva la aceptación final.

## Parada

Detente si necesitas acceso, datos o permisos no autorizados.
Señala la ubicación de un secreto sin reproducirlo.
Escala contradicciones o riesgos fuera del alcance.
No repares en la misma revisión ni ejecutes Git.
