# Constitución — Gestión de Solicitudes

**Versión:** 1.0
**Estado:** Vigente

Principios innegociables del proyecto.

Toda especificación, planificación, tarea, implementación, prueba,
documentación y cambio deberá respetarlos.

---

## 1. La especificación gobierna el desarrollo

No se implementará una funcionalidad que no esté definida mediante
requisitos aprobados y verificables.

Si cambia un requisito, se actualizará primero su especificación y,
posteriormente, el plan, las tareas, el código, las pruebas y la
documentación que resulten afectados.

No se utilizará el código existente como justificación para modificar
silenciosamente un requisito.

---

## 2. El alcance se controla explícitamente

Cada incremento implementará únicamente el alcance aprobado.

Las dudas, contradicciones y decisiones pendientes deberán resolverse
antes de implementar la parte afectada.

No se añadirán funcionalidades, reglas de negocio, dependencias,
abstracciones o complejidad únicamente porque resulten técnicamente
posibles.

Toda ampliación deberá incorporarse mediante el proceso SDD establecido.

---

## 3. La seguridad se diseña desde el inicio

La seguridad forma parte de cada funcionalidad y no se añadirá únicamente
al finalizar el desarrollo.

El backend será la autoridad final sobre autenticación, autorización,
validación y ejecución de operaciones protegidas.

El frontend podrá prevenir acciones incorrectas y mejorar la experiencia
del usuario, pero nunca sustituirá los controles del servidor.

Toda implementación deberá respetar la política de seguridad vigente.

Los secretos, credenciales, tokens y datos sensibles no deberán
incorporarse al código fuente ni al repositorio.

---

## 4. La arquitectura debe permanecer mantenible

La arquitectura de referencia será un monolito modular con
responsabilidades claramente separadas.

El backend distinguirá, cuando corresponda:

- entrada y salida HTTP;
- aplicación y casos de uso;
- reglas de dominio;
- persistencia.

El frontend se organizará por funcionalidades y responsabilidades claras.

Se favorecerán:

- alta cohesión;
- bajo acoplamiento;
- separación de responsabilidades;
- reutilización justificada;
- simplicidad;
- legibilidad.

SOLID y otros patrones se aplicarán cuando solucionen una necesidad real.

No se introducirán microservicios, capas, interfaces, patrones o
abstracciones sin una justificación técnica aprobada.

---

## 5. La integridad de los datos es obligatoria

Las operaciones deberán preservar la coherencia de los datos incluso
ante errores, concurrencia o repetición de peticiones.

Cuando una operación deba realizar varios cambios relacionados,
estos deberán completarse de forma coherente o revertirse según
las reglas definidas.

Las funcionalidades afectadas deberán contemplar, cuando corresponda:

- transacciones;
- control de versiones;
- conflictos concurrentes;
- operaciones repetidas;
- idempotencia;
- consistencia entre entidades relacionadas.

Una operación no podrá considerarse correcta únicamente porque devuelva
una respuesta satisfactoria si deja los datos en un estado incoherente.

---

## 6. La calidad es una condición de aceptación

Una funcionalidad no se considerará terminada únicamente porque funcione
en su recorrido principal.

Cada requisito deberá disponer de criterios de aceptación verificables.

Las comprobaciones deberán cubrir, cuando correspondan:

- comportamiento correcto;
- comportamiento incorrecto;
- errores;
- límites;
- permisos;
- seguridad;
- concurrencia;
- integración;
- regresiones.

No se aceptará una tarea con pruebas obligatorias fallando ni con
requisitos aprobados sin comprobar.

Un resultado no ejecutado se considerará pendiente, nunca superado.

---

## 7. La trazabilidad debe poder reconstruir el cambio

Los cambios relevantes del producto deberán poder relacionarse con su
origen y con la evidencia que demuestra su comportamiento.

Cuando corresponda deberá poder seguirse la relación:

**requisito → tarea → implementación → prueba → evidencia → cambio versionado**

La aplicación conservará además la trazabilidad funcional y técnica
necesaria para explicar operaciones relevantes realizadas por sus usuarios.

El historial de negocio, los registros técnicos y el historial Git
tendrán responsabilidades diferentes y no se sustituirán entre sí.

---

## 8. La documentación forma parte del producto

La documentación deberá mantenerse coherente con el comportamiento real
de la aplicación.

Un cambio funcional deberá revisar qué documentos, contratos, ejemplos,
manuales o decisiones técnicas resultan afectados.

Las decisiones o restricciones que no puedan deducirse claramente del
código deberán documentarse en el lugar correspondiente.

El contenido propio del proyecto se redactará en español, salvo nombres
impuestos por lenguajes, protocolos, estándares, frameworks o herramientas.

No se mantendrá documentación que describa funcionalidades inexistentes
o resultados todavía no comprobados.

---

## 9. El proyecto debe ser reproducible

El repositorio deberá contener todo lo necesario para reconstruir,
ejecutar y comprobar el proyecto, salvo secretos, credenciales, datos
privados y artefactos que deban generarse.

Las dependencias, configuraciones, versiones y procedimientos necesarios
deberán quedar definidos de forma reproducible.

Otro entorno correctamente preparado deberá poder ejecutar las
comprobaciones documentadas sin depender de conocimiento exclusivo
de una persona concreta.

---

## 10. La evidencia prevalece sobre las afirmaciones

No se declarará que una funcionalidad funciona, que una prueba pasa,
que una vulnerabilidad está mitigada o que una versión está lista sin
evidencia correspondiente.

Se distinguirá siempre entre:

- previsto;
- aprobado;
- implementado;
- ejecutado;
- comprobado.

Cuando una comprobación no pueda realizarse, deberá quedar registrada
como pendiente o limitada.

Ningún agente, herramienta o persona sustituirá una evidencia inexistente
por una suposición.