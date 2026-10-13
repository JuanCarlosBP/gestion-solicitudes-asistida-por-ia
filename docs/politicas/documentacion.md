# Política de documentación — Gestión de Solicitudes

**Versión:** 1.0
**Estado:** Aprobada

Esta política define cómo mantener documentación clara, útil y coherente
con el estado real del proyecto.
Desarrolla los principios de la [constitución](../constitucion.md)
y las condiciones de la [política de calidad](calidad.md).
La actuación de los agentes sigue las reglas de [AGENTS.md](../../AGENTS.md).

## 1. Escribir para que se entienda

El contenido propio se redactará en español.
Se conservarán los nombres exigidos por lenguajes, herramientas y estándares.
Usaremos frases sencillas y explicaremos los términos técnicos cuando aporten
información necesaria para comprender una regla o tomar una decisión.

Se explicará primero qué se necesita y por qué; después, cómo se resuelve.
Simplificar la redacción no permitirá omitir requisitos, riesgos, límites o evidencias.
Los ejemplos deberán ser concretos y representar el comportamiento que describen.

## 2. Un lugar principal para cada información

Cada regla o dato importante tendrá un documento principal.
Allí se mantendrá su definición completa y se resolverán sus cambios.
Otros documentos podrán resumirla o enlazarla, sin crear otra versión independiente.

La visión define el alcance; la constitución fija los principios;
las políticas desarrollan reglas de seguridad, calidad y documentación.
El índice permite encontrarlas y la memoria conserva solo el estado breve del trabajo.
Si hay contradicciones, se señalarán y se resolverán antes de continuar la parte afectada.

## 3. Qué responsabilidad tiene cada tipo de documento

Estos tipos se crearán cuando corresponda a su fase y exista contenido real.
Nombrarlos aquí no significa que todos estén ya creados.

| Tipo | Qué debe explicar |
|---|---|
| Principio | Una condición general que todos los cambios deben respetar, recogida en la constitución. |
| Política | Las reglas que se aplican de forma continuada a una materia, como seguridad o calidad. |
| Especificación | Qué comportamiento se exige, sus límites y los criterios para comprobarlo. |
| Plan | Cómo se pretende cumplir una especificación aprobada y qué decisiones técnicas hacen falta. |
| Tareas | Las unidades de trabajo autorizables, con su alcance y criterios de aceptación. |
| Validación | Qué se comprobó, en qué versión, con qué resultado y qué quedó pendiente. |
| ADR | Un registro de decisión de arquitectura: problema, opciones, decisión, motivo y consecuencias. |
| Documentación técnica | Cómo está construido u operado lo que realmente existe, incluidos contratos y restricciones. |
| Manual de usuario | Cómo realizar las operaciones disponibles desde la perspectiva de quien utiliza la aplicación. |
| Manual de desarrollo | Cómo preparar el entorno, construir, probar, depurar, operar y modificar el sistema. |

La especificación mantiene la referencia de qué debe cumplirse.
Un plan no sustituye su aprobación ni autoriza por sí solo la implementación.
Un ADR explica una decisión relevante sin repetir toda la documentación técnica.

## 4. Reflejar el estado real

Distinguiremos lo previsto, aprobado, implementado, ejecutado y comprobado.
No se presentará una función prevista como disponible ni una prueba pendiente como superada.
Una aprobación documental no demuestra que una protección esté implementada.
Cada afirmación sobre un resultado deberá poder relacionarse con su evidencia.

Los documentos nuevos indicarán que están pendientes de aprobación humana.
Solo se cambiará ese estado cuando exista la aprobación correspondiente.
Las limitaciones y decisiones pendientes se explicarán de forma concreta.
No se crearán plantillas vacías para aparentar que una fase está desarrollada.

## 5. Actualizar junto con el cambio

Al preparar una tarea, su responsable o agente identificará qué documentación afecta.
Si cambia un requisito, se actualizará primero la especificación y después
el plan, las tareas, el código, las pruebas y los documentos afectados.
Si cambia el comportamiento, se revisarán sus explicaciones, contratos y ejemplos.

También se revisarán las instrucciones si cambia el entorno necesario para usarlas.
Se actualizará el documento principal y se comprobarán sus resúmenes y enlaces.
La documentación desactualizada se considera un defecto.
La memoria no se utilizará para ocultar una definición permanente sin actualizar.

## 6. Instrucciones y comandos comprobables

Los pasos de ejecución se incorporarán cuando exista algo que pueda ejecutarse.
Antes de publicar un comando como instrucción de uso, habrá que comprobarlo
en el entorno y versión a los que se refiere.

La explicación indicará:

- desde qué carpeta y con qué requisitos debe ejecutarse;
- para qué sirve y qué hace;
- si modifica datos, archivos o servicios;
- qué resultado se espera;
- qué revisar si falla.

Un comando no comprobado no se presentará como una instrucción válida.
Si una comprobación no se ha podido realizar, se indicará la limitación.
Los ejemplos nunca contendrán credenciales reales.

## 7. Enlaces, rutas y organización

Los enlaces internos apuntarán a archivos o apartados que existan.
Se preferirán rutas relativas dentro del repositorio para que funcionen en otras ubicaciones.
Al crear, mover o retirar un documento, se revisarán los enlaces que lo señalan.
El índice incluirá una descripción breve de la responsabilidad de cada documento.

Las referencias históricas a archivos retirados se identificarán como tales;
no se presentarán como instrucciones ni enlaces a documentación disponible.
Un archivo futuro no se enlazará como si ya existiera.
No se duplicarán documentos completos para mantener copias de trabajo dentro del árbol.

## 8. Comentarios y documentación junto al código

Los comentarios explicarán motivos, contratos, restricciones o decisiones no evidentes.
No repetirán línea por línea lo que ya expresa el código.
Se actualizarán cuando cambie el comportamiento al que se refieren.

En Java se utilizará Javadoc, el formato de documentación junto al código,
cuando ayude a explicar contratos o decisiones que no resulten evidentes.
En TypeScript, JavaScript, HTML, CSS y SQL se añadirán comentarios cuando
aporten contexto útil para mantener el sistema.
Se evitará copiar en ellos una política completa que pueda enlazarse.

## 9. Proteger la información

La documentación, los ejemplos, las capturas y las evidencias no incluirán
secretos, contraseñas, tokens, claves privadas ni datos sensibles.
Se usarán datos ficticios y se revisará el contenido antes de compartirlo.
Si se detecta información sensible, se señalará su ubicación sin reproducirla
y se seguirá la [política de seguridad](../seguridad.md).

## 10. Revisar antes de aceptar

Antes de aceptar un cambio relevante se revisará la documentación afectada.
El responsable o agente indicará qué documentos revisó, cuáles cambió y por qué.
Se comprobarán coherencia con los requisitos, estado real, claridad, enlaces
y ausencia de información sensible.

El revisor señalará las carencias y las correcciones volverán al implementador.
Una revisión no sustituye las comprobaciones necesarias ni la aprobación humana.
Los resultados no ejecutados o no comprobados seguirán identificados como pendientes.

## 11. Fuentes externas

Se usarán fuentes oficiales o primarias cuando sea posible.
Se registrarán la versión y la fecha de consulta cuando el contenido pueda cambiar.
El registro de [fuentes](../fuentes.md) explica para qué se utiliza cada una.
Una recomendación externa se distinguirá de una decisión aprobada del proyecto.
Se respetarán las licencias y se citará la procedencia del contenido utilizado.
Una fuente externa no demuestra que nuestra implementación funcione;
esa afirmación necesita pruebas y evidencias propias.
