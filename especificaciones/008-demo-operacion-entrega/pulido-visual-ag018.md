# AG-018 — Pulido de interfaz y precisión del propietario

Estado: requisitos aprobados por el propietario; paquete 1.1 preparado el 19/10/2026.
La portada se acepta en diseño. Instalación, pruebas reales y aceptación de todo el pulido pendientes.
Este documento reemplaza la propuesta 1.0 no ejecutada. No cambia las reglas de negocio.

## Criterios vigentes

1. Separación real de los botones de la demo a todos los anchos.
2. Portada estática en `/`, con el diseño ya aprobado conservado: **Comenzar** → `/inicio`
   y **Comenzar demostración** → `/demo`. No cambiar la web principal.
3. Coma o punto decimal en cantidad y precio. Se mantienen límites de3/4 decimales,
   máximos, positividad, precisión, redondeo por línea y autoridad del backend.
   La API recibe cadenas con punto; no se aceptan separadores mezclados ni de miles.
4. Cantidades/precios sin ceros sobrantes y con coma; totales/importes con dos decimales.
5. **Defecto precisado por el propietario:** el desplegable de proveedores funciona,
   pero escribir un nombre completo o parcial en el campo de búsqueda no permite el
   resultado esperado en la creación de una solicitud. No confundirlo con no elegir opción.
   - Escribir o pegar filtra por el texto mediante la API tras300ms sin más escritura.
   - Buscar/Enter consulta inmediatamente; Enter no guarda ni envía el formulario padre.
   - Se admite nombre completo o parte; se conservan mayúsculas/minúsculas y coincidencias
     según el contrato backend, sin fabricar resultados ni filtrar solo la página cargada.
   - La escritura nueva cancela la respuesta anterior; no se pierden resultados por carreras.
   - Borrar recupera la primera página. Se conserva el ID que el usuario ya había elegido.
   - La selección requiere elegir en el desplegable: filtrar no cambia referencias por sí solo.
   - Mismo componente aplicado a supervisores; errores, sin coincidencias, límite128 y composición
     del teclado sin peticiones intermedias. Solo proveedores activos/supervisores autorizados.
6. **Conservar el formulario de acceso**, sus campos de correo y contraseña, etiquetas y botón.
   No ocultarlo por el hostname ni sustituir su mecanismo por un login ficticio.
   Añadir explicación: muestra el acceso convencional de una instalación con cuentas propias;
   en esta demo el visitante no tiene cuenta personal y no necesita ese formulario.
   Guía: Demo→Reservar→Solicitante (crear/presentar)→Demo sin liberar→Supervisor
   (aprobar/rechazar)→Demo→Auditor (historial)→Liberar al terminar.
   Conservar el controlador `acceso.ts`, sin inventar credenciales ni ampliar permisos.

## Pruebas exigidas antes y después de instalar

- Angular: tipos, lint, formato, todas las pruebas y build. Nuevas pruebas enfocadas a input,
  nombres completos/parciales, cancelación, Enter, botón, borrado, selección y login visible.
- Navegador nuevo contra API real antes de actualizar: búsquedas reales automáticas por nombre
  y fragmento interno, nombres en mayúsculas con espacios exteriores, botón y Enter, sin
  coincidencias y borrado; comprobar parámetros, contenido de resultados e IDs enviados al guardar.
- Coma98,8/233,0000, total727,00 y precios legibles; presentar, aprobar y consultar historial.
- Login: campos/botón visibles, sin valores precargados; texto y guía visibles sin inicio inventado.
- Repetir el mismo recorrido desde la versión pública instalada y capturar9estados×8anchos.
- Conservar portada aprobada y archivos originales; backend, PostgreSQL, provisionador,
  certificado, claves, datos ajenos y pruebas históricas permanecen fuera de esta modificación.

No se dispone de la traza HTTP exacta del fallo que observó el propietario. Las fuentes del
backend soportan coincidencia parcial con parámetros; el código anterior de la entrada no
buscaba al escribir y bloqueaba nuevas búsquedas durante una petición. Eso no demuestra por
sí solo todos los detalles de su incidente. El lote no instala si falla la prueba real.
