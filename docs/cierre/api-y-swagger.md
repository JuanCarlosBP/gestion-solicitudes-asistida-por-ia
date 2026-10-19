# API y Swagger: qué significa y cómo se verifica

Una **API** es la entrada que utiliza el navegador para pedir trabajo al servidor.
Un **endpoint** combina un método y una ruta. `GET` consulta, `POST` crea o ejecuta
una acción y `PUT` sustituye los datos editables de un recurso. Que la dirección
abra una página no demuestra por sí solo que todas esas operaciones funcionen.

**OpenAPI** es el documento estructurado del contrato. **Swagger UI** es una
pantalla que lee ese documento y permite explorar sus operaciones. En el laboratorio
se comprueba `/v3/api-docs`, la interfaz y una consulta real. En el VPS público se
ocultan deliberadamente esas rutas: no se debe publicar una consola administradora
para hacer que un 404 de seguridad desaparezca.

## Inventario del perfil convencional: 25 operaciones en 21 rutas

| Método | Ruta |
|---|---|
| POST | `/api/autenticacion/cerrar-sesion` |
| GET | `/api/autenticacion/csrf` |
| POST | `/api/autenticacion/iniciar-sesion` |
| POST | `/api/autenticacion/renovar` |
| GET | `/api/historial` |
| GET | `/api/identidad/supervisores` |
| GET | `/api/identidad/yo` |
| GET | `/api/operaciones-idempotentes/{clave}` |
| GET | `/api/proveedores` |
| POST | `/api/proveedores` |
| GET | `/api/proveedores/{id}` |
| PUT | `/api/proveedores/{id}` |
| POST | `/api/proveedores/{id}/desactivar` |
| GET | `/api/proveedores/{id}/historial` |
| POST | `/api/proveedores/{id}/reactivar` |
| GET | `/api/resumen` |
| GET | `/api/salud` |
| GET | `/api/solicitudes` |
| POST | `/api/solicitudes` |
| GET | `/api/solicitudes/{id}` |
| PUT | `/api/solicitudes/{id}` |
| POST | `/api/solicitudes/{id}/aprobar` |
| GET | `/api/solicitudes/{id}/historial` |
| POST | `/api/solicitudes/{id}/presentar` |
| POST | `/api/solicitudes/{id}/rechazar` |

Las pruebas de CI comparan exactamente ese inventario con OpenAPI y resuelven sus
referencias internas. Las suites API existentes ejercitan sesiones, proveedores,
solicitudes, aprobaciones, concurrencia e historial, incluidos resultados negativos.
Swagger/GET salud no sustituye esa regresión completa.

## Las cinco operaciones de la demo

`GET /api/demo`, `POST /api/demo/reservas`, `GET /api/demo/reserva`,
`POST /api/demo/acceso` y `POST /api/demo/reserva/liberar` se comprueban en el
perfil de demo mediante aislamiento HTTP y el recorrido completo del navegador.
El usuario del espacio no recibe credenciales de PostgreSQL ni del servidor.

## Cómo interpretar respuestas

- 200: operación correcta con el contenido previsto; 201: recurso creado;
  204: operación correcta sin contenido.
- 400: petición inválida; 401: identidad o reserva no válida; 403: operación
  no autorizada o CSRF incorrecto; 404: recurso no visible o ruta no disponible.
- 409: conflicto con estado, versión o capacidad. No se reemplaza por cualquier
  otro fallo para que una prueba parezca satisfactoria.

**Límite:** un inventario completo y regresiones satisfactorias no demuestran todas
las combinaciones posibles de datos o ataques. Cada informe identifica su versión,
entorno y alcance. No se suman 592 pruebas de UI y 636 controles HTTP como si fuesen
una medida única de cobertura.
