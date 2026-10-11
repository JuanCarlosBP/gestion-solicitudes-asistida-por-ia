# Modelo de amenazas — Gestión de Solicitudes

**Versión:** 1.0
**Estado:** Aprobada

Este documento analiza qué cosas importantes debemos proteger,
qué podría salir mal y qué riesgos tendremos que controlar.

No explica todavía cómo se programará cada protección.
Eso se decidirá después en las especificaciones y planes correspondientes.

## 1. Qué queremos conseguir

Antes de programar una funcionalidad importante debemos preguntarnos:

1. ¿Qué estamos protegiendo?
2. ¿Quién puede interactuar con ello?
3. ¿Por dónde pueden entrar datos o peticiones?
4. ¿Qué podría salir mal?
5. ¿Qué protección necesitaremos?
6. ¿Cómo comprobaremos después que funciona?

El objetivo es descubrir problemas antes de que formen parte del diseño.

## 2. Qué partes del sistema analizamos

Este modelo incluye:

- Angular y el navegador del usuario;
- la API REST creada con Java y Spring;
- PostgreSQL;
- autenticación y permisos;
- proveedores;
- solicitudes;
- conceptos;
- importes;
- estados;
- aprobaciones y rechazos;
- historial y auditoría;
- OpenAPI y Swagger UI;
- Docker;
- dependencias;
- CI/CD;
- herramientas externas;
- MCP y skills;
- la futura demo pública.

Por ahora no existen y, por tanto, no forman parte del alcance:

- pagos o transferencias reales;
- sistemas bancarios;
- datos reales de clientes;
- subida de archivos;
- correo y recuperación de contraseñas;
- ejecución de comandos enviados por usuarios;
- acceso del backend a direcciones web elegidas libremente por usuarios.

Si alguna de estas funciones aparece en el futuro,
este documento deberá revisarse antes de implementarla.

## 3. Método que utilizaremos

Usaremos STRIDE como guía para no olvidar tipos importantes de amenaza.

### S — Suplantación

Alguien intenta hacerse pasar por otra persona.

Ejemplo:
usar o falsificar las credenciales de otro usuario.

### T — Manipulación

Alguien intenta cambiar datos o comportamiento sin permiso.

Ejemplo:
cambiar desde el cliente el estado de una solicitud.

### R — Repudio

No podemos demostrar correctamente quién realizó una acción.

Ejemplo:
una aprobación aparece realizada pero no podemos saber por quién.

### I — Divulgación de información

Alguien puede ver datos que no debería conocer.

Ejemplo:
consultar la solicitud de otro usuario.

### D — Denegación de servicio

Alguien utiliza el sistema de forma que impide o dificulta su uso normal.

Ejemplo:
realizar miles de peticiones costosas.

### E — Elevación de privilegios

Alguien consigue permisos superiores a los que debería tener.

Ejemplo:
un usuario normal consigue realizar una operación administrativa.

STRIDE es una ayuda para analizar amenazas.
No sustituye el estudio de las reglas de negocio,
la concurrencia ni otros posibles abusos.

## 4. Qué debemos proteger

| ID | Activo | Qué debemos proteger |
|---|---|---|
| ACT-01 | Usuarios y credenciales | Que nadie pueda utilizarlos o conocerlos sin permiso |
| ACT-02 | Proveedores | Que sus datos sean correctos y estén disponibles |
| ACT-03 | Solicitudes y conceptos | Que no puedan alterarse o consultarse indebidamente |
| ACT-04 | Importes y cálculos | Que sean correctos y no puedan manipularse |
| ACT-05 | Estados y decisiones | Que las aprobaciones y rechazos sean válidos |
| ACT-06 | Historial | Que permita saber realmente qué ocurrió |
| ACT-07 | Logs de seguridad | Que sean útiles y no revelen información secreta |
| ACT-08 | Secretos y configuración | Que permanezcan protegidos |
| ACT-09 | PostgreSQL | Que sus datos sean correctos, privados y recuperables |
| ACT-10 | Código y dependencias | Que procedan de fuentes controladas y no sean manipulados |
| ACT-11 | Imágenes y artefactos | Que lo desplegado sea lo que realmente hemos revisado |
| ACT-12 | CI/CD | Que nadie pueda utilizarlo para introducir cambios indebidos |
| ACT-13 | Servicio público | Que pueda utilizarse normalmente |

## 5. Quién puede interactuar con el sistema

### Solicitante

Usuario que crea y gestiona las solicitudes que tenga permitidas.

### Supervisor

Usuario que puede revisar solicitudes y tomar las decisiones
que tenga autorizadas.

No podrá aprobar sus propias solicitudes.

### Auditor

Puede consultar la información necesaria para revisar lo ocurrido,
pero no obtiene por ello permisos para modificarla.

### Administrador

Tiene funciones administrativas concretas.

Ser administrador no permite saltarse las reglas del negocio.

### Visitante sin identificar

Solo podrá acceder a aquello que se haya definido expresamente como público.

### Usuario malicioso con cuenta válida

Tiene una cuenta real pero intenta utilizarla para acceder
a información o funciones que no le corresponden.

### Atacante externo

No necesita usar la aplicación como nosotros esperamos.

Puede modificar:

- URLs;
- identificadores;
- cuerpos de las peticiones;
- cabeceras;
- orden de las operaciones;
- frecuencia de las peticiones;
- datos enviados.

### Componente externo comprometido

Una dependencia, imagen, Action, MCP, skill u otra herramienta
también puede convertirse en una vía de entrada al sistema.

## 6. Fronteras de confianza

Una frontera de confianza aparece cuando los datos pasan entre partes
que no deben confiar automáticamente una en otra.

En este proyecto tenemos al menos:

1. usuario ↔ navegador;
2. Angular ↔ API;
3. Swagger UI ↔ API;
4. API ↔ PostgreSQL;
5. aplicación ↔ secretos y configuración;
6. repositorio ↔ CI/CD;
7. CI/CD ↔ artefactos;
8. artefactos ↔ servidor;
9. entorno local ↔ entorno público.

Ejemplo:

Angular puede decir que un usuario es administrador.

El backend no debe creerlo simplemente porque Angular lo haya enviado.

## 7. Flujo principal

El recorrido normal será aproximadamente:

Usuario
→ navegador
→ Angular
→ HTTPS
→ API Spring
→ PostgreSQL

Swagger UI podrá comunicarse con la misma API.

Para construir y publicar:

Repositorio
→ CI/CD
→ artefacto comprobado
→ entorno desplegado

La forma física definitiva del despliegue se documentará
cuando tomemos esa decisión.

## 8. Puntos por los que pueden entrar datos

Debemos revisar especialmente:

- login;
- cierre y renovación de acceso;
- rutas de la API;
- IDs;
- cuerpos JSON;
- parámetros;
- filtros;
- ordenación;
- paginación;
- cabeceras;
- formularios Angular;
- rutas Angular;
- Swagger;
- variables de entorno;
- migraciones;
- dependencias;
- imágenes Docker;
- workflows;
- MCP;
- skills;
- funciones administrativas.

## 9. Amenazas conocidas desde el principio

| ID | Amenaza | Prioridad |
|---|---|---|
| AM-01 | Robar, falsificar o reutilizar credenciales | Alta |
| AM-02 | Acceder a recursos ajenos cambiando un ID | Alta |
| AM-03 | Manipular rol, propietario, estado o aprobador | Alta |
| AM-04 | Conseguir que datos enviados se conviertan en SQL | Alta |
| AM-05 | Conseguir que contenido del usuario se ejecute en el navegador | Alta |
| AM-06 | Provocar desde otra web una operación de un usuario autenticado | Alta si aplica |
| AM-07 | Permitir conexiones web desde orígenes que no deberían estar autorizados | Media/Alta |
| AM-08 | Saltarse los estados o reglas de aprobación | Alta |
| AM-09 | Aprobar la propia solicitud | Alta |
| AM-10 | Manipular importes o totales desde el cliente | Alta |
| AM-11 | Sobrescribir sin aviso el cambio reciente de otro usuario | Alta |
| AM-12 | Permitir dos decisiones incompatibles al mismo tiempo | Alta |
| AM-13 | Repetir una petición y aplicar dos veces el mismo efecto | Alta |
| AM-14 | Exponer secretos o configuración | Alta |
| AM-15 | Exponer funciones administrativas o diagnósticos | Alta |
| AM-16 | Incorporar una dependencia o herramienta comprometida | Alta |
| AM-17 | Tener un historial insuficiente o manipulable | Alta |
| AM-18 | Filtrar información mediante logs, navegador o caché | Alta |
| AM-19 | Agotar recursos mediante abuso del sistema | Media/Alta |
| AM-20 | Desplegar algo diferente de lo revisado | Alta |
| AM-21 | Dejar datos a medias cuando ocurre un error | Alta |
| AM-22 | Permitir una acción porque el control de seguridad ha fallado | Alta |
| AM-23 | No poder recuperar correctamente el servicio o los datos | Media |
| AM-24 | Permitir accesos cruzados indebidos en la demo | Alta |

## 10. Amenazas que dependerán de funciones futuras

Algunos riesgos solo aparecerán si añadimos determinadas funciones.

### SSRF

Habrá que analizarlo si el backend empieza a acceder
a direcciones proporcionadas por usuarios.

### Archivos maliciosos

Habrá que analizarlo si incorporamos subida de archivos.

### Inyección de comandos

Habrá que analizarla si el sistema comienza a ejecutar procesos externos
utilizando información recibida.

### Recuperación de cuentas

Habrá que analizar sus propios riesgos si se incorpora esa funcionalidad.

### Integraciones externas

Cada nueva integración puede crear nuevas entradas y fronteras de confianza.

Mientras una de estas funciones no exista,
el riesgo se indicará como no aplicable.

No se declarará como solucionado.

## 11. Qué podemos hacer con un riesgo

Cada amenaza deberá terminar con una decisión.

### Mitigar

Reducir el riesgo mediante una protección.

### Eliminar

Eliminar la función o situación que provoca el riesgo.

### Transferir

Parte de la responsabilidad pasa a otro sistema o proveedor,
pero seguimos teniendo en cuenta el riesgo que quede.

### Aceptar

Decidimos conscientemente aceptar el riesgo que permanece.

Aceptar un riesgo nunca significará simplemente no haberlo revisado.

## 12. Cómo seguiremos cada amenaza

Una amenaza importante deberá poder seguirse de principio a fin:

amenaza
→ requisito
→ especificación
→ solución
→ prueba
→ evidencia
→ riesgo que todavía quede

## 13. Cuándo revisar este documento

El modelo se revisará cuando:

- cambie la autenticación;
- cambien los permisos;
- aparezca una nueva entrada de datos;
- cambie el despliegue;
- aparezca una integración;
- cambien roles;
- cambien estados;
- cambien las reglas de aprobación;
- aparezca una operación crítica nueva;
- una prueba encuentre un riesgo nuevo;
- ocurra un problema de seguridad relevante.

No se borrará una amenaza anterior sin explicar
por qué ha dejado de afectar al sistema.