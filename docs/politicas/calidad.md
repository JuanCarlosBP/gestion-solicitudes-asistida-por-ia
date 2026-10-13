# Política de calidad — Gestión de Solicitudes

**Versión:** 1.0
**Estado:** Aprobada

Esta política define cuándo podemos considerar que un cambio
está realmente terminado.

Crear código no será suficiente.

También habrá que comprobar que funciona, que cumple sus requisitos
y que no rompe las reglas del proyecto.

## 1. Principios

- Todo requisito aprobado deberá poder comprobarse.
- Implementar algo no significa que ya esté verificado.
- Verificarlo no significa que ya esté aceptado.
- Aceptarlo no significa que ya esté integrado.
- Integrarlo no significa que ya esté publicado.
- Una prueba que no se haya ejecutado seguirá pendiente.
- No aceptaremos pruebas obligatorias que estén fallando.
- Una evidencia deberá corresponder exactamente a la versión comprobada.
- La calidad incluye código, funcionamiento, seguridad,
  documentación, reproducción y operación.

## 2. Estados de una tarea

Una tarea podrá estar:

### Pendiente

Todavía no se ha autorizado realizarla.

### Autorizada

Sabemos qué debe hacerse y ha sido aprobado.

### En curso

Se está trabajando en ella.

### Implementada

El código o cambio existe.

### Verificada

Las comprobaciones necesarias han pasado.

### Aceptada

El resultado ha sido revisado y aprobado.

### Integrada

Ya forma parte de la rama donde debe quedar.

### Publicada

Forma parte de una versión entregada.

### Bloqueada

Existe un problema conocido que impide continuar.

No adelantaremos estados para esconder trabajo pendiente.

## 3. Antes de empezar a programar

Para una tarea que lo necesite deberán existir:

- especificación aprobada;
- dudas importantes resueltas;
- plan aprobado;
- tarea claramente definida;
- requisitos que cubre;
- criterios para saber si está bien;
- riesgos importantes;
- documentación que podría verse afectada.

Si falta una decisión importante,
el agente deberá detenerse en lugar de inventarla.

## 4. Antes de decir que una tarea está verificada

Dependiendo del cambio, comprobaremos:

- compilación o build;
- comprobación de tipos;
- formato y lint, que detecta incumplimientos de las reglas del código;
- análisis estático;
- análisis de dependencias y vulnerabilidades;
- pruebas relacionadas;
- funcionamiento esperado;
- datos no válidos;
- errores;
- permisos;
- seguridad;
- concurrencia;
- regresiones;
- cambios inesperados.

El análisis estático revisa el código sin ejecutar la aplicación para
detectar errores, malas prácticas o problemas conocidos.

Si alguna prueba necesaria no pudo ejecutarse,
se indicará claramente.

## 5. Antes de aceptar una tarea

Deberán cumplirse:

- criterios de aceptación;
- pruebas obligatorias;
- ausencia de defectos bloqueantes;
- Constitución;
- políticas;
- revisión independiente cuando corresponda;
- documentación actualizada;
- evidencias necesarias.

La aceptación final corresponde a la persona responsable del proyecto.

## 6. Antes de integrar

Comprobaremos:

- el cambio real que va a integrarse;
- CI;
- pruebas necesarias;
- ausencia de secretos;
- migraciones;
- contrato de la API;
- documentación;
- aprobación humana.

## 7. Antes de publicar

Además deberá existir:

- versión concreta identificada;
- build reproducible;
- artefactos correspondientes a esa versión;
- QA transversal;
- seguridad comprobada;
- concurrencia crítica comprobada;
- documentación coherente;
- limitaciones conocidas;
- autorización para desplegar.

## 8. Tipos de pruebas

### Pruebas unitarias

Comprueban una parte pequeña de forma aislada.

Ejemplos:

- una regla;
- un cálculo;
- una validación;
- un cambio de estado.

### Pruebas de integración

Comprueban que varias partes trabajan realmente juntas.

Ejemplos:

- Spring con PostgreSQL;
- JPA;
- transacciones;
- migraciones;
- seguridad HTTP.

### Pruebas de API

Comprueban:

- método HTTP;
- URL;
- datos recibidos;
- datos devueltos;
- errores;
- autenticación;
- permisos;
- contrato OpenAPI.

### Pruebas frontend

Comprueban:

- componentes Angular;
- formularios;
- validaciones;
- navegación;
- llamadas a la API;
- carga;
- errores;
- ausencia de datos.

### Pruebas E2E

Comprueban un recorrido completo:

usuario
→ Angular
→ API
→ Java/Spring
→ PostgreSQL
→ respuesta
→ pantalla.

### Pruebas de seguridad

Comprueban controles definidos en:

- política de seguridad;
- modelo de amenazas;
- OWASP;
- controles ASVS aplicables.

### Pruebas de concurrencia

Comprueban qué ocurre cuando varias acciones coinciden en el tiempo.

Por ejemplo:

- dos ediciones;
- dos aprobaciones;
- actualización mientras se aprueba;
- operaciones repetidas;
- timeouts.

### Pruebas de accesibilidad

Comprobarán al menos:

- teclado;
- foco;
- etiquetas;
- formularios;
- mensajes;
- información que no dependa solo del color.

### Pruebas de recuperación

Comprobarán que realmente podemos restaurar
o reconstruir lo que digamos que puede recuperarse.

### Pruebas de carga

Se realizarán de forma limitada y solo en entornos autorizados.

Se medirán:

- tiempos;
- errores;
- consumo de recursos;
- comportamiento bajo el volumen definido.

## 9. Cómo será un caso de prueba

Cuando corresponda, una prueba indicará:

- situación inicial;
- datos utilizados;
- acción realizada;
- resultado esperado;
- resultado obtenido;
- estado final de la prueba.

Dependiendo de la función también probaremos:

- caso correcto;
- dato incorrecto;
- dato ausente;
- duplicado;
- valor límite;
- usuario sin permiso;
- recurso de otro usuario;
- recurso inexistente;
- estado no permitido;
- fallo de otro componente;
- repetición;
- concurrencia;
- recuperación.

## 10. TDD

Cuando sea útil utilizaremos este ciclo:

1. escribir una prueba que falle porque todavía falta el comportamiento;
2. implementar lo necesario;
3. comprobar que la prueba pasa;
4. ejecutar las pruebas relacionadas para comprobar que no hemos roto otra cosa.

No utilizaremos TDD de forma artificial cuando no aporte valor.

## 11. Cobertura de código

El porcentaje de cobertura será una ayuda,
no una demostración automática de calidad.

El umbral se decidirá cuando exista una base real de código.

Las reglas importantes tendrán sus propias pruebas
aunque el porcentaje global ya sea alto.

No crearemos pruebas inútiles únicamente para aumentar una cifra.

## 12. Pruebas que fallan de forma aleatoria

Una prueba que unas veces pasa y otras falla
no se considerará correcta por repetirla hasta que pase.

Habrá que:

- descubrir la causa;
- corregirla;
- o dejar el problema registrado y bloqueado.

No esconderemos ese problema mediante reintentos indiscriminados.

## 13. Importancia de los defectos

### Bloqueante

Impide continuar o afecta gravemente:

- build;
- función principal;
- seguridad;
- integridad;
- entrega.

Impide integrar y publicar.

### Alta

Afecta una función importante o introduce un riesgo serio.

### Media

Afecta una parte limitada y existe una alternativa razonable.

### Baja

Problema menor sin impacto crítico.

## 14. Evidencias

Una comprobación importante deberá permitir saber:

- qué requisito o riesgo comprobamos;
- qué versión revisamos;
- dónde se ejecutó;
- qué comando o prueba utilizamos;
- qué resultado obtuvimos;
- dónde está la evidencia;
- qué limitaciones quedan.

Logs, capturas e informes no deberán mostrar secretos.

## 15. Integración continua

La CI crecerá junto con el proyecto.

Al principio podrá comprobar documentación.

Después añadiremos progresivamente:

1. build;
2. backend;
3. frontend;
4. integración;
5. contrato API;
6. seguridad;
7. QA transversal;
8. artefactos.

Que una CI aparezca en verde no será suficiente
si alguna prueba obligatoria ni siquiera estaba incluida.

## 16. Revisión independiente

Cuando una tarea necesite revisión,
el revisor deberá:

- leer sus requisitos;
- leer el plan;
- revisar los cambios;
- revisar las pruebas;
- comprobar requisito por requisito;
- señalar los problemas encontrados.

El revisor no corregirá el código mientras realiza esa revisión.

Las correcciones volverán al implementador.

## 17. Documentación

La documentación forma parte del producto.

Si está desactualizada,
consideraremos que existe un defecto.

Los comandos importantes deberán explicar:

- dónde ejecutarlos;
- para qué sirven;
- qué hacen;
- qué resultado esperamos;
- qué revisar si fallan.

## 18. Reproducibilidad

Una versión candidata deberá poder:

- obtenerse desde el repositorio;
- instalar sus dependencias;
- preparar su configuración;
- construirse;
- probarse;
- arrancarse;
- utilizarse siguiendo la documentación.

## 19. Cuándo consideramos algo terminado

Una tarea o versión solo podrá aceptarse cuando:

- cumpla los requisitos aprobados;
- pase las pruebas necesarias;
- no tenga defectos bloqueantes;
- respete la Constitución y las políticas;
- tenga la documentación necesaria;
- disponga de evidencias suficientes;
- declare las limitaciones que todavía tenga.

Lo que no hayamos comprobado seguirá marcado como pendiente.
