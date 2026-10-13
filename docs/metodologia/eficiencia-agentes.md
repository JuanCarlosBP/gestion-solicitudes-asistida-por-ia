# Eficiencia del trabajo con agentes

**Estado:** Aprobado

## Objetivo

Reducir tiempo y consumo significa evitar trabajo repetido o innecesario.
No significa recortar alcance, requisitos, seguridad, documentación o QA.
La [política de calidad](../politicas/calidad.md) sigue siendo obligatoria.

## Contexto selectivo

Empieza por AGENTS, MEMORY y el paquete de tarea.
Usa la [matriz de contexto](contexto.md) para elegir las fuentes necesarias.
Busca primero rutas, símbolos y referencias relacionadas.
Amplía la lectura cuando una dependencia pueda afectar al resultado.

No cargues todas las skills ni todos los documentos por defecto.
Una auditoría completa expresamente solicitada puede requerirlo.
No releas contenido que no haya cambiado y siga disponible en el contexto.
Comprueba cambios antes de reutilizar una lectura de una sesión anterior.

## Tareas pequeñas y completas

Divide por resultados verificables, no por un número arbitrario de líneas.
Cada tarea conserva sus requisitos, errores, límites y criterios.
No resumas un requisito hasta perder una condición importante.
Enlaza la fuente completa y conserva sus IDs.

Una tarea debe indicar cuándo se considera acabada.
Evita encargos abiertos como mejorar todo el sistema.
Si aparecen dependencias nuevas, identifica su impacto antes de seguir.

## Paralelismo con límites

El coordinador decide qué trabajos son independientes.
Solo se escribe en paralelo sobre archivos y recursos distintos.
Los contratos compartidos se acuerdan primero.
Las pruebas que comparten datos se aíslan o se ejecutan en serie.

El límite configurado es de tres subagentes.
No es una obligación mantenerlos ocupados.
Un trabajo pequeño puede resolverse en la sesión principal.
La [orquestación](orquestacion.md) define los propietarios de escritura.
Su [fallback agéntico](orquestacion.md#16-fallback-agéntico) define los tres niveles
disponibles cuando no pueden utilizarse roles personalizados o subagentes.

## Automatizar lo repetible

Usa comprobaciones automáticas para sintaxis, enlaces y formato.
En implementación se añaden builds, pruebas y análisis pertinentes.
El comando debe tener una finalidad y un resultado interpretable.
No se ejecutan herramientas ajenas al cambio solo para aumentar la lista.

Agrupa lecturas independientes cuando no alteren archivos o estado.
Conserva el resultado útil y evita copiar logs completos sin necesidad.
Revisa las salidas: un comando ejecutado no es necesariamente satisfactorio.
No automatices aprobaciones ni operaciones Git a cargo de la persona responsable.

## Resultados estructurados

Usa el [relevo](plantillas/relevo.md) para entradas y salidas.
Identifica tarea, archivos, comprobaciones, resultados y pendientes.
Relaciona cada evidencia con un criterio.
Esto evita que el siguiente agente repita exploraciones ya resueltas.

No copies un informe extenso dentro de MEMORY.
La memoria mantiene estado y referencias.
Las evidencias duraderas se guardan donde puedan encontrarse.

## Pruebas enfocadas y después completas

Durante una corrección ejecuta primero la comprobación que detecta el defecto.
Cuando pase, ejecuta las pruebas relacionadas y la regresión necesaria.
Antes de aceptar el incremento, ejecuta su conjunto obligatorio.
Las políticas y el riesgo determinan qué es obligatorio.

No escribas pruebas que solo repitan la implementación sin comprobar comportamiento.
No omitas QA para cumplir un tiempo estimado.
Una prueba inestable necesita investigación; no se repite hasta ocultar el fallo.
Después de dos correcciones fallidas del mismo problema se solicita decisión humana.

## Métricas observadas

Registra horas de inicio y fin solo si se han observado.
Registra tokens solo si la herramienta ofrece una cifra verificable.
No calcules ahorro frente a una ejecución que no se haya realizado.
No conviertas estimaciones en resultados medidos.

El [registro de ejecuciones](../trazabilidad/ejecuciones-agentes.csv)
conserva hechos útiles para reconstruir el trabajo.
La duración de una sesión no representa por sí sola tiempo productivo.
Si una cifra no está disponible, se omite o se declara no disponible.

## Cierre eficiente

Detente cuando se haya completado el trabajo autorizado y su verificación.
Evita repetir comprobaciones superadas sin cambios o dudas que lo justifiquen.
Entrega límites y pendientes en lugar de esconderlos en más texto.
La eficiencia se evalúa junto con la corrección y la trazabilidad del resultado.
