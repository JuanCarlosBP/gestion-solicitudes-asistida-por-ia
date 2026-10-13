# Cómo contribuir

**Estado:** Aprobado

Los cambios deben responder a una necesidad concreta y poder comprobarse.
La persona responsable del proyecto decide qué se acepta y cuándo se integra.

## Antes de proponer

Lee [MEMORY.md](MEMORY.md) para conocer el estado y la siguiente acción.
Consulta la [visión y alcance](docs/vision-y-alcance.md) si cambia el producto.
Revisa la [constitución](docs/constitucion.md) y las políticas aplicables.
El [índice](docs/README.md) permite encontrarlas sin cargar toda la documentación.

Actualmente el producto aún no tiene una base funcional ejecutable.
G02-B, P2 y el paquete 001 están aprobados documentalmente.
001 espera el lanzamiento humano y las comprobaciones bloqueantes del preflight.
La aprobación del diseño no acredita implementación ni pruebas ejecutadas.

## Proponer un cambio

Explica el problema, a quién afecta y qué comportamiento se necesita.
Indica qué queda dentro y fuera del cambio.
Incluye un ejemplo concreto y cómo comprobarías su resultado.
Relaciona la propuesta con una especificación existente cuando la haya.

Las dudas de negocio deben resolverse antes de implementar la parte afectada.
No cambies un requisito para justificar el comportamiento de código existente.
El proceso aprobado está en [SDD](docs/metodologia/sdd.md).
Las vulnerabilidades siguen [SECURITY.md](SECURITY.md), por un canal privado.

## Del requisito a la evidencia

Cada tarea debe señalar el requisito que atiende.
Cada requisito necesita criterios de aceptación observables.
Cada comprobación debe indicar qué criterio verifica.
Su evidencia debe corresponder a los archivos y al entorno revisados.

La relación esperada es requisito → tarea → prueba → evidencia.
Después se relacionará con el cambio versionado por la persona responsable.
Una captura aislada o una CI en verde no demuestra todos los requisitos.
Una prueba no ejecutada se registra como pendiente.

## Implementar el alcance autorizado

Consulta la especificación, el plan y las tareas aprobados antes de programar.
Trabaja en una unidad que pueda revisarse sin mezclar cambios ajenos.
Mantén las responsabilidades separadas y evita dependencias innecesarias.
Si cambia el alcance, vuelve a la especificación y solicita decisión humana.

Los agentes siguen [AGENTS.md](AGENTS.md).
Ningún agente realizará operaciones Git durante este trabajo.
La persona responsable elegirá una rama cuando convenga aislar el cambio.
La creación de ramas no sustituye la aprobación del trabajo.

## Pruebas y documentación

Aplica la [política de calidad](docs/politicas/calidad.md).
Ejecuta las comprobaciones pertinentes y registra también los fallos.
Comprueba primero la parte modificada y después las regresiones necesarias.
No omitas una prueba obligatoria porque el entorno no permita ejecutarla:
declara el bloqueo y su efecto sobre la aceptación.

Revisa los contratos, instrucciones y ejemplos afectados.
Sigue la [política documental](docs/politicas/documentacion.md).
No presentes como comprobado un comando que todavía no se ha ejecutado.

## Revisión y preparación de Git

Antes de staging, revisa alcance, diferencias, pruebas y documentos.
Comprueba que no se incorporan archivos generados ni datos privados.
El revisor comunica hallazgos; el implementador realiza las correcciones.
La aceptación final corresponde a la persona responsable del proyecto.

La persona responsable selecciona y comprueba los archivos del staging.
Los commits serán semánticos: el mensaje describe el propósito del cambio.
Por ejemplo, `docs: definir el proceso de contribución`.
Se usarán tipos como `feat`, `fix`, `docs`, `test` o `chore` según lo ocurrido.
No se mezclarán cambios independientes para ocultar su alcance.

Cuando corresponda una PR, explicará problema, solución y validación.
Una PR es una solicitud de revisión antes de integrar un cambio.
Debe identificar los pendientes y enlazar requisitos y evidencias útiles.
La persona responsable realizará commit, push y comprobación del remoto.

## Información protegida

No incluyas contraseñas, tokens, claves privadas ni credenciales reales.
Tampoco los incluyas en ejemplos, prompts, informes o capturas.
Usa datos ficticios y revisa los archivos antes de compartirlos.
Si encuentras un secreto, señala su ubicación sin reproducirlo
y aplica la [política de seguridad](docs/seguridad.md).

## Entrega

Informa qué cambió, qué se comprobó y qué sigue pendiente.
Actualiza la memoria breve cuando cambie el estado relevante.
Detente después de entregar; la revisión humana determina el siguiente paso.
