# Visión y alcance — Gestión de Solicitudes

**Versión:** 1.0
**Estado:** Alcance funcional inicial

## 1. Propósito

Gestión de Solicitudes es una aplicación empresarial destinada a centralizar
la creación, revisión, aprobación y seguimiento de solicitudes internas.

El sistema debe proporcionar una fuente única y fiable de información,
sustituyendo procesos dispersos y permitiendo conocer el estado,
responsables, decisiones e historial de cada solicitud.

## 2. Problema

La gestión de solicitudes mediante correos, documentos o herramientas
independientes puede provocar:

- desconocimiento del estado real de una solicitud;
- información duplicada o contradictoria;
- modificaciones no autorizadas;
- pérdida de cambios cuando trabajan varias personas;
- dificultad para conocer qué información fue aprobada;
- operaciones repetidas o incompatibles;
- falta de trazabilidad;
- dificultad para investigar posteriormente errores o incidencias.

El producto debe resolver estos problemas mediante un proceso centralizado,
controlado y trazable.

## 3. Actores

### Solicitante

Crea y gestiona solicitudes y consulta su evolución.

### Supervisor

Revisa solicitudes y, cuando tenga autorización, puede aprobarlas
o rechazarlas.

No podrá aprobar una solicitud propia.

### Auditor

Consulta información e historial autorizado para revisar qué ocurrió
durante el ciclo de una solicitud.

Su función de consulta no implica permisos de modificación.

### Administrador

Gestiona las funciones administrativas que se definan expresamente.

El rol administrativo no permitirá eludir automáticamente las reglas
del negocio.

## 4. Información principal

El producto gestionará:

- proveedores;
- solicitudes;
- conceptos pertenecientes a una solicitud;
- importes;
- estados;
- aprobaciones y rechazos;
- usuarios y permisos;
- historial de operaciones relevantes.

## 5. Ciclo general de una solicitud

Como marco inicial se contemplan los estados:

1. Borrador.
2. Presentada.
3. Aprobada.
4. Rechazada.

Las operaciones permitidas y transiciones exactas se definirán posteriormente
mediante requisitos verificables.

Los usuarios no podrán alterar libremente el estado para evitar el flujo
establecido.

## 6. Alcance funcional

La primera versión deberá permitir:

- identificar y autenticar usuarios;
- aplicar permisos según usuario, acción y recurso;
- crear, consultar, modificar y eliminar proveedores cuando corresponda;
- crear, consultar, modificar y eliminar solicitudes cuando corresponda;
- gestionar los conceptos asociados a una solicitud;
- calcular y validar sus importes;
- guardar solicitudes en estado borrador;
- presentar solicitudes para revisión;
- aprobar o rechazar solicitudes;
- consultar solicitudes mediante listados, filtros y paginación;
- consultar el historial autorizado;
- impedir operaciones no permitidas;
- detectar modificaciones concurrentes incompatibles;
- evitar efectos duplicados en las operaciones que lo requieran.

## 7. Integridad y concurrencia

El sistema deberá mantener información coherente cuando varios usuarios
trabajen simultáneamente.

En particular deberá evitar:

- sobrescrituras silenciosas de información más reciente;
- dos decisiones incompatibles sobre la misma solicitud;
- modificaciones incompatibles durante una aprobación;
- estados parcialmente actualizados después de un fallo;
- efectos duplicados provocados por repeticiones de una misma operación.

## 8. Seguridad

La seguridad formará parte del funcionamiento normal del producto.

Como principios generales:

- el servidor decidirá finalmente si una operación está permitida;
- cada usuario accederá únicamente a las funciones y datos autorizados;
- las entradas del usuario se considerarán no confiables;
- las credenciales y secretos deberán protegerse;
- los errores no deberán revelar información sensible;
- las operaciones relevantes deberán poder ser auditadas.

Los controles concretos se definirán en la política de seguridad
y en las especificaciones correspondientes.

## 9. Trazabilidad

El sistema deberá permitir conocer, cuando corresponda:

- quién realizó una acción;
- cuándo se produjo;
- qué operación realizó;
- sobre qué elemento;
- cuál fue el resultado;
- qué información relevante cambió.

Se distinguirán el historial funcional, los registros técnicos
y los eventos relacionados con seguridad.

## 10. Experiencia de usuario

La aplicación deberá ser:

- clara;
- coherente;
- profesional;
- adaptable a distintos tamaños de pantalla;
- accesible desde navegador;
- comprensible ante errores y conflictos;
- utilizable sin conocimientos técnicos del funcionamiento interno.

## 11. Fuera de alcance

Esta primera versión no incluirá:

- pagos reales;
- transferencias de dinero;
- concesión de créditos o préstamos;
- operaciones bancarias reales;
- integración con sistemas bancarios;
- datos reales de clientes;
- credenciales empresariales reales;
- firma electrónica con validez jurídica;
- integración con sistemas externos que no sean necesarios para el producto.

Cualquier ampliación deberá incorporarse posteriormente mediante
el proceso de gestión de requisitos establecido.

## 12. Criterios generales de éxito

El producto cumplirá su objetivo cuando sea posible realizar de forma
controlada el siguiente recorrido:

1. un usuario autorizado accede al sistema;
2. crea o selecciona un proveedor;
3. crea una solicitud;
4. incorpora sus conceptos e importes;
5. guarda y modifica el borrador;
6. presenta la solicitud;
7. otro usuario autorizado la revisa;
8. la aprueba o rechaza;
9. el sistema impide operaciones no autorizadas;
10. los conflictos concurrentes se detectan sin perder información;
11. el resultado y su historial pueden consultarse posteriormente.

Además, el comportamiento deberá ser coherente con los requisitos,
políticas y criterios de calidad aprobados para la versión.