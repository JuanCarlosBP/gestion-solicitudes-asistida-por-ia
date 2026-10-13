# Formatos de relevo entre agentes

**Estado:** Aprobado

Este documento es una plantilla operativa, creada expresamente para los relevos.
Los campos se rellenan con hechos de cada encargo; no reservan documentos futuros.
Un campo no aplicable debe incluir una razón, no una respuesta inventada.
Se usa junto con [contexto](../contexto.md) y [orquestación](../orquestacion.md).

## A. Paquete de entrada

### Identificación y autorización

Indica ID de tarea, rol receptor y coordinador.
Identifica la aprobación humana y los documentos que cubre.
Distingue encargo de análisis, implementación o revisión.

### Objetivo

Describe el resultado concreto que debe entregar el agente.
Explica para qué sirve y cómo encaja en el incremento.

### Alcance

Enumera comportamientos o comprobaciones incluidos.
Explica las exclusiones que impiden ampliar el trabajo.
Señala dependencias que ya están disponibles y las que deben esperar.

### Archivos

Lista rutas de lectura y rutas de escritura por separado.
Identifica archivos nuevos y archivos compartidos.
Confirma que cada archivo tiene un único escritor asignado.

### Fuentes

Enlaza especificación, plan, tarea y políticas aplicables.
Indica versión, huella o estado de los documentos que puedan cambiar.
Incluye fuentes externas solo si ayudan a resolver el encargo.

### Requisitos

Enumera los IDs y conserva todas sus condiciones.
Señala errores, límites, permisos y concurrencia cuando correspondan.
No sustituyas la fuente completa por una síntesis ambigua.

### Prohibiciones

Recuerda los límites relevantes de la tarea.
Incluye la prohibición de Git, secretos y ampliaciones sin aprobación.
Indica permisos y recursos externos que no están autorizados.

### Criterios de aceptación

Describe resultados observables para cada requisito.
Identifica qué defecto impediría aceptar el encargo.

### Comprobaciones

Indica pruebas o revisiones necesarias y el entorno requerido.
Describe la evidencia que deberá devolverse.
Separa comandos previstos de comandos ya comprobados.

### Parada

Indica dependencias, dudas, permisos o riesgos que obligan a detenerse.
Conserva el número de correcciones fallidas del mismo problema.
Añade límite de tiempo si existe y el canal de devolución al coordinador.

## B. Paquete de salida

### Trabajo realizado y archivos

Identifica la tarea y describe lo que realmente se hizo.
Lista archivos creados, modificados y revisados.
Relaciona los cambios con los requisitos, sin dar por aceptado el resultado.

### Pruebas y resultados

Indica comprobación, comando, entorno y referencia de archivos.
Separa resultado esperado de resultado observado.
Registra aprobado técnicamente, fallido, pendiente o no aplicable con motivo.
Enlaza evidencia sin secretos; no copies resultados dentro del prompt original.

### Pendientes y riesgos

Explica qué falta y por qué.
Señala qué requisito o aceptación queda bloqueado.
Indica riesgos restantes, decisiones necesarias y correcciones fallidas.

### Siguiente paso

Propón una acción concreta y quién debe realizarla.
No concedas autorizaciones por la persona responsable.
El coordinador consolida y registra la ejecución observada.
