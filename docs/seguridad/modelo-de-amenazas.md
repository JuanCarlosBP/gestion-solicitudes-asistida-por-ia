# Modelo de amenazas — Gestión de Solicitudes

**Versión:** 1.0
**Estado:** Aprobada

Este documento analiza qué cosas importantes debemos proteger,
qué podría salir mal y qué riesgos tendremos que controlar.

Las soluciones concretas se definen en las especificaciones y planes.
El apartado de identidad enlaza los controles de 002 y su evidencia parcial.

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

| ID | STRIDE | Amenaza | Prioridad | Respuesta inicial |
|---|---|---|---|---|
| AM-01 | S | Robar, falsificar o reutilizar credenciales | Alta | Mitigar |
| AM-02 | E / I | Acceder a recursos ajenos cambiando un ID | Alta | Mitigar |
| AM-03 | T / E | Manipular rol, propietario, estado o aprobador | Alta | Mitigar |
| AM-04 | T / I | Conseguir que datos enviados se conviertan en SQL | Alta | Mitigar |
| AM-05 | T / I | Conseguir que contenido del usuario se ejecute en el navegador | Alta | Mitigar |
| AM-06 | T / E | Provocar desde otra web una operación autenticada | Alta si aplica | Mitigar |
| AM-07 | I / E | Permitir orígenes web no autorizados | Media/Alta | Mitigar |
| AM-08 | T / E | Saltarse estados o reglas de aprobación | Alta | Mitigar |
| AM-09 | T / E | Aprobar la propia solicitud | Alta | Eliminar mediante regla |
| AM-10 | T | Manipular importes o totales | Alta | Mitigar |
| AM-11 | T | Sobrescribir cambios recientes | Alta | Mitigar |
| AM-12 | T | Permitir decisiones incompatibles simultáneas | Alta | Mitigar |
| AM-13 | T | Aplicar dos veces el mismo efecto | Alta | Mitigar |
| AM-14 | I | Exponer secretos o configuración | Alta | Mitigar |
| AM-15 | I / E | Exponer administración o diagnósticos | Alta | Mitigar |
| AM-16 | T / E | Incorporar un componente comprometido | Alta | Mitigar |
| AM-17 | R / T | Historial insuficiente o manipulable | Alta | Mitigar |
| AM-18 | I | Filtrar información mediante logs o caché | Alta | Mitigar |
| AM-19 | D | Agotar recursos mediante abuso | Media/Alta | Mitigar |
| AM-20 | T | Desplegar algo diferente de lo revisado | Alta | Mitigar |
| AM-21 | T / D | Dejar datos a medias tras un error | Alta | Mitigar |
| AM-22 | E | Permitir una acción porque falló el control | Alta | Eliminar mediante fallo seguro |
| AM-23 | D | No poder recuperar servicio o datos | Media | Mitigar |
| AM-24 | I / E | Accesos cruzados indebidos en la demo | Alta | Mitigar |


La prioridad inicial no sustituye la evaluación posterior del riesgo que permanezca.
La respuesta inicial deberá concretarse y comprobarse en cada especificación.

### Concreción de identidad en AG-010

La [especificación 002](../../especificaciones/002-identidad-acceso/especificacion.md)
concreta las siguientes amenazas; su [validación](../../especificaciones/002-identidad-acceso/validacion.md)
mantiene pruebas ejecutadas y pendientes. La decisión de tokens está en
[ADR-0003](../decisiones/ADR-0003-identidad-jwt-y-sesiones.md).

| Amenaza | Control de 002 | Riesgo que permanece |
|---|---|---|
| AM-01 | Argon2id, política de contraseña, errores genéricos, bloqueo temporal, RS256, fechas, sid y refresh rotatorio. | Robo durante sesión, contraseñas comprometidas fuera de lista local, diferencias temporales residuales. |
| AM-03 | Roles emitidos/validados por backend, usuario habilitado y método protegido; `/yo` no acepta roles del cliente. | Permisos de recursos y reglas de negocio futuros. |
| AM-04 | JdbcTemplate con parámetros, restricciones/FKs e IDs UUID. | Nuevas consultas futuras requieren sus propias pruebas. |
| AM-05 | Token de acceso solo en memoria, refresh HttpOnly, CSP y salida Angular segura. | XSS activo todavía puede actuar como el usuario. |
| AM-06/07 | Cookie Strict, XSRF en login/refresh/logout incluso Bearer, mismo origen, CORS cerrado. | SameSite no sustituye XSRF ni una futura configuración HTTPS. |
| AM-14/18 | Claves externas fuera de local/test, hash de secretos aleatorios, no-store, errores y logs controlados. | Claves operativas, retención y entornos públicos pendientes; búsquedas acotadas no garantizan ausencia total. |
| AM-15 | Denegación por defecto y documentación pública solo local/test. | Demo pública y administración aún no disponibles. |
| AM-19 | Cinco fallos/ventana/bloqueo temporal persistido y límites de longitud. | Bloqueo abusivo de cuenta y agotamiento global requieren controles futuros. |
| AM-21/22 | Transacciones, bloqueo de sesión, revocación confirmada antes del 401 y validación de sid que falla cerrada. | Dependencia de disponibilidad PostgreSQL; dos pestañas pueden provocar revocación segura. |
| AM-23 | Refresh persistido recupera acceso tras reinicio con clave efímera nueva; segundo arranque. | No equivale a un procedimiento completo de backup/restauración. |

No se amplía este incremento a las amenazas de aprobación, importes, historial
funcional o concurrencia de negocio. Ninguna categoría completa se da por cubierta.

## 10. Amenazas que dependerán de funciones futuras

Algunos riesgos solo aparecerán si añadimos determinadas funciones.

### AC-01 — SSRF

Habrá que analizarlo si el backend empieza a acceder
a direcciones proporcionadas por usuarios.

### AC-02 — Archivos maliciosos

Habrá que analizarlo si incorporamos subida de archivos.

### AC-03 — Inyección de comandos

Habrá que analizarla si el sistema comienza a ejecutar procesos externos
utilizando información recibida.

### AC-04 — Recuperación de cuentas

Habrá que analizar sus propios riesgos si se incorpora esa funcionalidad.

### AC-05 — Integraciones externas

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

## Controles del catálogo — AG-011

La especificación 003 y ADR-0004 concretan estos riesgos; resultados reales en
[validación 003](../../especificaciones/003-proveedores/validacion.md).

| Amenaza | Control previsto por PR | Riesgo restante |
|---|---|---|
| AM-02/03 | PR-08/11: visibilidad activos/inactivos, permisos por rol, DTO cerrado y autoridad backend. | Permisos de solicitudes/aprobaciones futuros fuera de alcance. |
| AM-04/05 | PR-03/11: SQL parametrizado, orden cerrado, LIKE literal, interpolación Angular. | Cada entrada nueva exige sus propias pruebas. |
| AM-06/07 | PR-08/11: CSRF con Bearer, mismo origen, CORS cerrado. | HTTPS público pendiente. |
| AM-11/12/13 | PR-05/06/07/09: unique real, versión SQL y estado repetido sin efectos. | 006 ampliará concurrencia/idempotencia transversal. |
| AM-17/18 | PR-11: eventos después de commit limitados a IDs/acción/resultado, sin fiscal/contacto. | Historial 007, retención y eliminación jurídica definitiva pendientes. |
| AM-19 | PR-03: páginas máximo 100, filtros limitados y órdenes cerrados. | No hay benchmark de 50.000 ni protección global de carga. |
| AM-21/22/23 | PR-07/09/12: transacciones, restricciones, fallo seguro, persistencia/reinicio. | Dependencia PostgreSQL; no equivale a restauración completa de desastres. |

## Controles de solicitudes — AG-012

Implementación004 y comprobaciones en su [validación](../../especificaciones/004-solicitudes-conceptos-importes/validacion.md).
No se convierten amenazas globales a mitigadas por una prueba parcial.

| Amenaza | Control acotado | Límite |
|---|---|---|
| AM-02/03 | SCI09/13: actor/recurso/estado, visibilidad previa aCOUNT, DTO cerrado y CSRF. | Angular orienta, backend decide; administración de usuarios no incorporada. |
| AM-04/05 | SCI03/13: SQL parametrizado, orden cerrado, comodines literales e interpolación Angular. | No acredita todas las superficies futuras. |
| AM-08/10 | SCI05/08: transición cerrada e importes BigDecimal del servidor, límites y fotografía. | Aprobación/rechazo fuera de004. |
| AM-11/12/13 | SCI10/11: versión, bloqueos y resultado idempotente transaccional persistido. | Generalización006 posterior; sin purga automática. |
| AM-17/18 | SCI13: eventos mínimos tras commit, hash de clave y sin cuerpos/credenciales. | Historial/retención/alertas posteriores. |
| AM-21/22/23 | SCI04/08/14: rollback del agregado, referencias actuales y errores seguros; reinicio y persistencia. | Dependencia de PostgreSQL, sin recuperación de desastres completa. |

Proveedores son registros de catálogo, no cuentas. No existe ámbito multiempresa.
Las evidencias de QA son ficticias y no se publican tokens ni cuerpos de sesión.

## Decisiones de solicitudes — incremento 005

| Amenaza | Control acotado | Límite |
|---|---|---|
| AM-02/03 | AP-03/07: asignación, prohibición de autor y rol/habilitación vigentes incluso en replay; bandeja siempre acotada. | La gestión de usuarios sigue fuera del incremento. |
| AM-04/05 | AP-02/08: DTO estricto, Unicode válido, longitudes y salida Angular como texto. | No acredita otras superficies de entrada. |
| AM-08/10 | AP-01/04: solo PRESENTADA pasa a un estado final; datos presentados y asignación inmutables. | No se permite reabrir o delegar. |
| AM-11/12/13 | AP-05/06: versión y bloqueo, una decisión/evento y replay persistido compatible. | Mecanismo local; generalización y retención futuras. |
| AM-17/18 | AP-09: evento de negocio mínimo protegido y logs técnicos sin textos de decisión. | Historial avanzado, alertas y borrado jurídico pendientes. |
| AM-21/22/23 | AP-06/09/10: rollback conjunto y evolución V4→V5 preservando datos. | No equivale a recuperación completa de desastres. |

Resultados reales, fallos y pendientes en
[validación 005](../../especificaciones/005-aprobaciones/validacion.md).
