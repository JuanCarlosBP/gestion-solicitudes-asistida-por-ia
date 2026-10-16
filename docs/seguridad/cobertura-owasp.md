# Cobertura OWASP — Gestión de Solicitudes

**Versión:** 1.0
**Estado:** Aprobada

Este documento utiliza OWASP Top 10:2025 para comprobar
que estamos teniendo en cuenta las principales familias de riesgos web.

También utilizaremos OWASP ASVS 5.0.0 cuando necesitemos convertir
estos riesgos generales en comprobaciones técnicas concretas.

Tener este documento no significa que la aplicación ya sea segura.

## 1. Cómo utilizaremos OWASP

Para cada riesgo queremos poder responder:

1. ¿Qué significa?
2. ¿Cómo podría ocurrir en nuestro proyecto?
3. ¿Qué haremos para evitarlo?
4. ¿Cómo comprobaremos que funciona?
5. ¿Qué parte de ASVS debemos revisar?
6. ¿Está realmente comprobado?

## 2. Estados posibles

Cada control podrá estar:

- **Pendiente:** todavía no existe o no se ha comprobado.
- **Implementado:** existe, pero todavía falta comprobarlo completamente.
- **Verificado:** tenemos pruebas o evidencias reales de que funciona.
- **No aplica:** esa función o superficie no existe y podemos justificarlo.

Nunca escribiremos `Verificado` si no existe evidencia real.

## 3. A01:2025 — Pérdida de control de acceso

### Amenazas relacionadas

AM-02, AM-03, AM-06, AM-09, AM-24; AC-01 si aparece su función.
Véase el [modelo de amenazas](modelo-de-amenazas.md).

### Qué significa

Un usuario puede consultar o hacer algo que no debería tener permitido.

### Cómo podría afectarnos

Por ejemplo:

- ver la solicitud de otro usuario;
- modificarla;
- aprobar sin permiso;
- autoaprobar;
- cambiar un ID manualmente;
- modificar campos internos;
- llamar directamente a la API;
- provocar una operación desde otra web mediante CSRF;
- utilizar SSRF si en el futuro el backend acepta direcciones externas.

### Qué haremos

- rechazar por defecto lo que no esté permitido;
- comprobar permisos en el backend;
- comprobar cada acción y recurso;
- comprobar propietario y estado cuando corresponda;
- impedir modificar campos internos;
- aplicar protección CSRF cuando sea necesaria.

### Cómo lo probaremos

- usuario autorizado sobre recurso propio;
- usuario intentando usar un recurso ajeno;
- rol sin permisos;
- ID manipulado;
- llamada directa a la API;
- campo interno manipulado;
- prueba CSRF cuando corresponda;
- SSRF marcado como no aplicable mientras no exista esa función.

### ASVS que tendremos que revisar

Controles relacionados con:

- permisos;
- frontend web;
- reglas de negocio.

**Estado:** Pendiente.

## 4. A02:2025 — Configuración de seguridad incorrecta

### Amenazas relacionadas

AM-07, AM-14, AM-15, AM-19.
Véase el [modelo de amenazas](modelo-de-amenazas.md).

### Qué significa

El código puede ser correcto y el sistema seguir siendo inseguro
porque algo está mal configurado.

### Cómo podría afectarnos

Por ejemplo:

- mostrar errores internos;
- usar configuración de desarrollo en la demo;
- permitir demasiados orígenes mediante CORS;
- abrir puertos innecesarios;
- exponer Swagger o herramientas administrativas sin control;
- exponer PostgreSQL;
- ejecutar contenedores con demasiados permisos.

### Qué haremos

- separar configuraciones por entorno;
- exponer únicamente lo necesario;
- mantener secretos fuera del código;
- limitar CORS;
- aplicar permisos mínimos;
- utilizar cabeceras de seguridad;
- proteger herramientas y diagnósticos.

### Cómo lo probaremos

- revisar rutas públicas;
- revisar mensajes de error;
- comprobar cabeceras;
- comprobar puertos;
- revisar configuración real;
- comprobar el perfil utilizado;
- comprobar la exposición de PostgreSQL.

### ASVS que tendremos que revisar

Controles relacionados con:

- configuración;
- comunicaciones seguras;
- frontend.

**Estado:** Pendiente.

## 5. A03:2025 — Fallos en la cadena de suministro de software

### Amenazas relacionadas

AM-16, AM-20.
Véase el [modelo de amenazas](modelo-de-amenazas.md).

### Qué significa

Nuestro código puede ser seguro y aun así introducir un problema
mediante una librería, imagen o herramienta externa.

### Qué forma parte de nuestra cadena

- Maven;
- npm;
- dependencias directas;
- dependencias que llegan a través de otras;
- JDK;
- Node;
- imágenes Docker;
- GitHub Actions;
- plugins;
- herramientas;
- MCP;
- skills;
- artefactos generados.

### Qué haremos

- utilizar componentes de origen conocido;
- fijar versiones;
- utilizar archivos de bloqueo cuando correspondan;
- mantener un inventario;
- revisar actualizaciones;
- limitar los permisos de CI/CD;
- analizar dependencias e imágenes;
- generar un SBOM en las entregas cuando corresponda.

Un SBOM es simplemente una lista de los componentes
que forman una versión del software.

### Cómo lo probaremos

- obtener el inventario de dependencias;
- revisar también las dependencias indirectas;
- analizar imágenes;
- revisar Actions, MCP y skills;
- registrar vulnerabilidades encontradas;
- comprobar de qué build procede lo desplegado.

### ASVS que tendremos que revisar

Controles relacionados con:

- configuración;
- arquitectura segura;
- componentes y proceso de construcción.

**Estado:** Pendiente.

## 6. A04:2025 — Fallos criptográficos

### Amenazas relacionadas

AM-01, AM-14, AM-18.
Véase el [modelo de amenazas](modelo-de-amenazas.md).

### Qué significa

Información que debería estar protegida queda expuesta
por utilizar mal contraseñas, claves, cifrado o comunicaciones.

### Cómo podría afectarnos

- guardar contraseñas de forma recuperable;
- utilizar hashes rápidos;
- guardar secretos en código;
- utilizar HTTP;
- proteger mal las claves;
- introducir datos sensibles dentro de tokens;
- pensar que firmar información significa ocultarla.

### Qué haremos

- utilizar funciones diseñadas para contraseñas;
- utilizar una sal aleatoria;
- utilizar bibliotecas mantenidas;
- utilizar HTTPS;
- guardar secretos fuera del código;
- controlar las claves;
- no inventar criptografía.

### Cómo lo probaremos

- contraseña correcta e incorrecta;
- comprobar almacenamiento no reversible;
- comprobar uso de sal;
- buscar secretos;
- comprobar HTTPS;
- revisar los tokens cuando existan.

### ASVS que tendremos que revisar

Controles relacionados con:

- autenticación;
- criptografía;
- comunicaciones seguras;
- protección de datos.

**Estado:** Pendiente.

## 7. A05:2025 — Inyección

### Amenazas relacionadas

AM-04, AM-05; AC-03 si aparece su función.
Véase el [modelo de amenazas](modelo-de-amenazas.md).

### Qué significa

Un dato enviado al sistema termina siendo interpretado como una instrucción.

### Cómo podría afectarnos

- SQL Injection;
- consultas SQL construidas de forma insegura;
- ordenación basada en texto no controlado;
- XSS almacenado;
- XSS reflejado;
- comandos construidos con datos externos.

### Qué haremos

- separar consultas SQL y parámetros;
- usar listas cerradas cuando algo no pueda parametrizarse;
- validar entradas;
- mostrar datos de forma segura;
- mantener las protecciones de Angular;
- separar siempre datos y código.

### Cómo lo probaremos

- intentar modificar consultas mediante datos;
- enviar ordenaciones no permitidas;
- introducir HTML o JavaScript;
- mostrar esos datos a otro usuario;
- revisar consultas SQL personalizadas;
- comprobar que los datos nunca se ejecutan.

### ASVS que tendremos que revisar

Controles relacionados con:

- validación;
- limpieza y presentación segura de datos;
- frontend;
- programación segura.

**Estado:** Pendiente.

## 8. A06:2025 — Diseño inseguro

### Amenazas relacionadas

AM-08, AM-09, AM-10, AM-11, AM-12, AM-13, AM-21, AM-22.
Véase el [modelo de amenazas](modelo-de-amenazas.md).

### Qué significa

El programa puede estar perfectamente escrito
y aun así permitir algo que nunca debería permitirse.

### Cómo podría afectarnos

- autoaprobar;
- saltarse estados;
- modificar una solicitud ya terminada;
- confiar en importes calculados por Angular;
- aprobar una versión distinta de la revisada;
- aprobar dos veces;
- repetir operaciones;
- tener reglas de negocio incompletas.

### Qué haremos

- utilizar SDD;
- mantener este modelo de amenazas;
- definir los cambios de estado permitidos;
- dejar las decisiones finales al backend;
- definir reglas que siempre deban cumplirse;
- utilizar transacciones;
- controlar versiones;
- utilizar idempotencia cuando sea necesaria.

### Cómo lo probaremos

- intentar autoaprobar;
- intentar un cambio de estado ilegal;
- modificar una solicitud terminada;
- manipular un total;
- repetir una operación;
- realizar dos aprobaciones;
- modificar mientras otra persona aprueba.

### ASVS que tendremos que revisar

Controles relacionados con:

- reglas de negocio;
- autorización;
- arquitectura.

**Estado:** Pendiente.

## 9. A07:2025 — Fallos de autenticación

### Amenazas relacionadas

AM-01; AC-04 si aparece su función.
Véase el [modelo de amenazas](modelo-de-amenazas.md).

### Qué significa

Alguien consigue hacerse pasar por otro usuario
o mantiene un acceso que debería haber terminado.

### Cómo podría afectarnos

- contraseñas inseguras;
- descubrir qué usuarios existen;
- intentos ilimitados;
- robo de credenciales;
- tokens manipulados;
- tokens caducados aceptados;
- cierre de sesión que realmente no invalida el acceso.

### Qué haremos

- utilizar Spring Security;
- almacenar correctamente las contraseñas;
- aplicar la política de contraseñas;
- utilizar mensajes de error que no revelen cuentas;
- limitar intentos;
- controlar caducidad;
- renovación;
- cierre;
- revocación.

### Cómo lo probaremos

- usuario inexistente;
- contraseña incorrecta;
- muchos intentos;
- credencial modificada;
- credencial caducada;
- cierre de sesión;
- revocación;
- cambios importantes de permisos.

### ASVS que tendremos que revisar

Controles relacionados con:

- autenticación;
- sesión;
- tokens, si finalmente los utilizamos.

**Estado:** Pendiente.

## 10. A08:2025 — Fallos de integridad del software o de los datos

### Amenazas relacionadas

AM-03, AM-16, AM-20.
Véase el [modelo de amenazas](modelo-de-amenazas.md).

### Qué significa

Confiamos en software, datos o artefactos
sin poder asegurar suficientemente que son los correctos.

### Cómo podría afectarnos

- modificar campos internos;
- utilizar una dependencia alterada;
- utilizar una Action comprometida;
- desplegar algo distinto de lo revisado;
- modificar indebidamente la configuración de entrega.

### Qué haremos

- definir claramente qué campos acepta cada operación;
- proteger campos internos;
- relacionar cada build con su código;
- identificar artefactos;
- controlar CI/CD;
- revisar procedencia;
- desplegar los artefactos realmente validados.

### Cómo lo probaremos

- intentar modificar campos internos;
- seguir código → build → artefacto → despliegue;
- revisar dependencias;
- revisar Actions;
- comprobar procedencia e integridad cuando corresponda.

### ASVS que tendremos que revisar

Controles relacionados con:

- configuración;
- protección de datos;
- arquitectura y programación segura.

**Estado:** Pendiente.

## 11. A09:2025 — Fallos de registro y alertas de seguridad

### Amenazas relacionadas

AM-17, AM-18.
Véase el [modelo de amenazas](modelo-de-amenazas.md).

### Qué significa

Puede ocurrir un ataque o problema importante
y no dejar información suficiente para descubrirlo o investigarlo.

### Cómo podría afectarnos

- accesos fallidos que no quedan registrados;
- permisos rechazados que nadie puede investigar;
- cambios administrativos sin historial;
- logs manipulables;
- secretos escritos en logs;
- no poder relacionar distintos eventos;
- no tener ninguna señal ante situaciones importantes.

### Qué haremos

- utilizar logs estructurados;
- registrar eventos importantes de seguridad;
- separar logs técnicos e historial del negocio;
- relacionar peticiones mediante identificadores;
- proteger los logs;
- evitar datos peligrosos o secretos;
- definir alertas adecuadas al proyecto.

### Cómo lo probaremos

- provocar un login incorrecto;
- provocar un rechazo por permisos;
- realizar un cambio administrativo controlado;
- comprobar que no aparecen secretos;
- seguir una petición mediante su identificador;
- comprobar al menos una alerta cuando exista.

### ASVS que tendremos que revisar

Controles relacionados con:

- logs;
- errores;
- protección de datos.

**Estado:** Pendiente.

## 12. A10:2025 — Manejo inadecuado de condiciones excepcionales

### Amenazas relacionadas

AM-19, AM-21, AM-22, AM-23.
Véase el [modelo de amenazas](modelo-de-amenazas.md).

### Qué significa

Algo inesperado falla y el sistema responde de una forma insegura
o deja los datos en un estado incorrecto.

### Cómo podría afectarnos

- caída de PostgreSQL;
- timeout;
- error dentro de una transacción;
- excepción inesperada;
- no poder comprobar permisos;
- quedarse sin recursos;
- guardar solo una parte de una operación.

### Qué haremos

- rechazar de forma segura cuando no pueda comprobarse algo;
- utilizar transacciones;
- deshacer cambios incompletos;
- utilizar límites;
- utilizar timeouts;
- liberar recursos;
- controlar mensajes de error;
- poder recuperarnos después.

### Cómo lo probaremos

- provocar un fallo controlado de PostgreSQL;
- producir un error durante una operación;
- provocar un timeout;
- impedir temporalmente comprobar permisos;
- enviar datos inesperados;
- recuperar el servicio;
- comprobar que no quedan cambios a medias.

### ASVS que tendremos que revisar

Controles relacionados con:

- reglas de negocio;
- arquitectura;
- logs y errores.

**Estado:** Pendiente.

## 13. Cómo utilizaremos ASVS 5.0.0

OWASP Top 10 nos dice qué grandes tipos de riesgo debemos vigilar.

ASVS permite bajar esos riesgos a controles técnicos más concretos.

Revisaremos al menos las áreas que correspondan a:

- validación y datos;
- reglas de negocio;
- frontend;
- autenticación;
- sesiones;
- permisos;
- tokens si los utilizamos;
- criptografía;
- comunicaciones;
- configuración;
- protección de datos;
- arquitectura;
- logs y errores.

No copiaremos controles de ASVS porque sí.

Para utilizar uno:

1. comprobaremos su texto en ASVS 5.0.0;
2. comprobaremos que realmente afecta a nuestra aplicación;
3. lo relacionaremos con un requisito;
4. decidiremos cómo probarlo.

## 14. Cómo guardaremos las evidencias

Cuando un control esté realmente comprobado podremos seguir:

riesgo OWASP
→ amenaza concreta
→ requisito
→ solución
→ prueba
→ versión comprobada
→ resultado
→ evidencia
→ riesgo que todavía quede

## 15. Cuándo podremos decir que un riesgo está cubierto

No diremos que cumplimos OWASP solo porque exista este documento.

Para considerar cubierta una categoría deberán existir:

- riesgos identificados;
- medidas implementadas;
- pruebas realmente ejecutadas;
- evidencias;
- riesgos restantes conocidos;
- justificación para todo aquello que se marque como no aplicable.

## 16. Controles parciales de identidad — AG-010

002 incorpora controles limitados al acceso. La fuente de resultados es
[validación 002](../../especificaciones/002-identidad-acceso/validacion.md), con
evidencias propias AG-010. Los estados globales anteriores de categoría no se
convierten en «Verificado» por completar este incremento.

| Categoría afectada | Controles y requisitos | Comprobaciones de 002 y límites |
|---|---|---|
| A01 — Acceso | IA-06/10/12: sid, roles del servidor, default deny y CSRF. | Bearer ausente/inválido, roles de método, 403 CSRF. Recursos y reglas de negocio futuros pendientes. |
| A02 — Configuración | IA-07/09/14: perfiles, cookies y OpenAPI local. | Falta de claves, atributos de cookies, CORS cerrado y cabeceras. HTTPS público pendiente. |
| A03 — Cadena de suministro | IA-14 y ADR-0002: versiones exactas y auditoría. | Inventarios actuales y auditorías con herramienta/fecha explícitas; no cobertura de vulnerabilidades desconocidas. |
| A04 — Criptografía | IA-02/06/07/08: Argon2id, RSA y hash del refresh aleatorio. | Parámetros/sal, claims/algoritmo/fechas, claves inválidas y secretos fuera de JSON. Gestión operativa pública pendiente. |
| A05 — Inyección | IA-01/04/13: SQL parametrizado, entradas limitadas y Angular. | Correo/contraseña, DTO limitado y salida segura; no acredita todas las entradas futuras. |
| A07 — Autenticación | IA-01–13: cuentas, bloqueo, login, rotación, reuse, logout y restauración. | Unitarias, HTTP, PostgreSQL concurrente y E2E. MFA/recuperación/administración no implementadas. |
| A09 — Registro | IA-05/08/14: eventos técnicos sin credenciales. | Fallos, reuse y búsqueda acotada. Alertas, retención e historial funcional pendientes. |
| A10 — Excepciones | IA-08/11/14: transacciones y fallo seguro. | Rotación concurrente, revocación persistida, PostgreSQL caído y recuperación. No acredita recuperación completa de desastres. |

No se añaden identificadores ASVS sin comprobar su texto y aplicabilidad.
Trazabilidad concreta de amenazas en el [modelo](modelo-de-amenazas.md).
