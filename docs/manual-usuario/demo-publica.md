# Cómo probar Gestión de Solicitudes

**Guía del candidato de 008. La URL solo se considera disponible cuando las
pruebas del despliegue hayan terminado. No es una declaración anticipada de cierre.**

## Para qué sirve

Una persona pide material o un servicio y explica cuánto necesita y cuánto cuesta.
Otra persona revisa la petición y decide aprobarla o rechazarla. Una tercera puede
consultar qué ocurrió. Aquí todo es ficticio: no se compran productos ni se pagan
facturas reales. Un proveedor es quien suministraría lo solicitado.

Dirección prevista: https://gestion-empresarial.jcbpsoftware.com/demo

## Primer clic: un espacio para ti

Abre la dirección en un navegador. Pulsa **Reservar mi espacio**. La aplicación
te asigna datos que no comparten otros visitantes. Dispones de 60 minutos y puedes
cambiar entre tres cuentas sin perder ese espacio. Hay un máximo inicial de tres
visitantes simultáneos. Si no queda sitio, vuelve a consultar la disponibilidad:
la aplicación no te entrega datos de otra persona.

No hay contraseñas que copiar para esos roles: **Entrar como solicitante**,
**Entrar como supervisor** y **Entrar como auditor** usan cuentas temporales reales
preparadas por el servidor. No convierten una etiqueta de la pantalla en permisos.
Nunca se pide la contraseña IONOS, root, jcbpops o la frase de una clave privada.

## Recorrido de una solicitud

1. Pulsa **Entrar como solicitante**. El solicitante es quien hace la petición.
2. Pulsa **Nueva solicitud**. En **Asunto** escribe «Material de oficina de prueba».
   El asunto es el título, no el importe. Pulsa **Crear borrador**. Un borrador
   puede prepararse y cambiarse antes de enviarlo a revisión.
3. Selecciona un proveedor y un supervisor. Si utilizas los campos de búsqueda,
   pulsa su botón Buscar y espera a que la lista termine de cargar. Escribir un
   nombre en la búsqueda no equivale a elegir una opción de la lista inferior.
4. Pulsa **Añadir concepto**. Un concepto es una línea de lo solicitado. Escribe
   «Carpetas», cantidad 2 y precio unitario 12.50. Guarda el borrador; comprueba
   el total confirmado de 25,00 €. El servidor calcula y confirma los importes:
   la cifra provisional del formulario no es la autoridad final.
5. Pulsa **Presentar solicitud** y **Confirmar y presentar**. Debe aparecer
   **Presentada**. Desde ese momento entra en el circuito de decisión.
6. Pulsa el enlace **Demo** de la parte superior. No pulses Liberar mi espacio.
   Ahora pulsa **Entrar como supervisor**. Cambias de cuenta, no de datos.
7. Abre el asunto creado en **Aprobaciones**, pulsa **Aprobar solicitud**, después
   **Revisar decisión** y **Confirmar aprobación**. Debe aparecer **Aprobada**.
8. Regresa a **Demo** y entra como auditor. Un auditor consulta el historial:
   no aprueba, no modifica solicitudes ni recibe administración del servidor.
   Busca los hechos asociados a tu solicitud, su fecha, actor y acción.
9. Para probar un rechazo, crea otra solicitud y sigue su proceso hasta Presentada.
   Como supervisor pulsa **Rechazar solicitud**, escribe el motivo solicitado y
   revisa y confirma el rechazo. No se cambia la decisión ya cerrada de la anterior.

## Qué observar en la interfaz

Comprueba que puedes leer títulos, instrucciones y botones sin solapamientos.
Reduce el ancho de la ventana y repite el recorrido en un móvil. Debe ser posible
usar teclado con Tab y Enter, distinguir el foco y entender qué campo contiene un
error. Una tabla puede tener desplazamiento interno previsto; eso no justifica
que toda la página se salga de la ventana ni que una acción quede inaccesible.

El indicador «Cargando» significa que todavía se está esperando información.
No hagas clic repetidamente pensando que no ocurrió nada. Si aparece un conflicto,
consulta el estado confirmado antes de volver a intentar una decisión.

## Qué no hacer

No introduzcas información personal, fiscal, contraseñas ni datos empresariales
reales. No uses el espacio para conservar un trabajo: al caducar se revoca el
acceso y después sus datos ficticios se preparan de nuevo. No compartas una cookie
o un token. La demo no incluye una cuenta administradora para los visitantes.

**Liberar mi espacio** termina tu reserva. Úsalo al terminar, no entre los tres
roles del recorrido. Una pestaña antigua no debe acceder a una reserva posterior.

## API, Swagger y código

La API es la entrada que utiliza Angular para hablar con el servidor. Cada ruta
con un método —por ejemplo GET para consultar— es una operación documentada.
Swagger es una herramienta para explorar ese contrato; no es la aplicación ni
el servidor. Su panel administrativo no se publica en esta demo. Las pruebas de
API y Swagger internas se realizan en el laboratorio autorizado, con datos de
prueba y sin abrir esas herramientas a cualquier visitante.

El [repositorio](https://github.com/JuanCarlosBP/gestion-solicitudes-asistida-por-ia)
conserva código, especificaciones, decisiones y pruebas. El estado del README y
el commit deben contrastarse con la versión desplegada: el nombre de una rama
por sí solo no demuestra qué está ejecutándose.
