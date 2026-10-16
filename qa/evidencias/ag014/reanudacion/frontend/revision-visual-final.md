# Revisión visual final AG-014

Se inspeccionaron directamente las 12 imágenes PNG de `e2e-05/capturas/`, generadas por Chromium real sobre la imagen local ui06. No se editaron ni recompusieron las capturas. Son cuatro pantallas en anchos de 360, 768 y 1440 píxeles.

| Pantalla y archivos | Observado en los tres anchos |
| --- | --- |
| `frontend007-timeline-{360,768,1440}.png` | Cuatro eventos de solicitud, orden descendente, actor, fecha, estados/versiones y fuente legibles. Filtros en una, dos o cuatro columnas según espacio. Foco naranja completo sobre Actor, sin ocultar etiqueta o contenido. Botones móviles ocupan el ancho disponible y paginación apilada. |
| `frontend007-global-{360,768,1440}.png` | Aviso de cobertura anterior visible, filtros de tipo/recurso y enlaces por evento. UUID completos en enlaces con salto de línea en móvil; los campos de entrada mantienen desplazamiento horizontal interno nativo. Sin contenido que desborde la página. |
| `frontend007-proveedor-{360,768,1440}.png` | Ciclo creado/modificado/desactivado/reactivado y transición de estados/versiones legibles. Encabezado enfocado, navegación al detalle y controles separados. No se muestran datos fiscales ni de contacto en el historial. |
| `frontend007-resumen-{360,768,1440}.png` | Recuentos reales visibles, cuatro tarjetas en dos columnas móviles y cuatro en los anchos mayores. Permisos de auditor explicados y tarjeta de salud conservada. Actualizar resumen y Volver a comprobar muestran texto blanco sobre fondo oscuro, sin los colores intermedios observados antes. |

El recorrido HA-E2E10 comprueba `scrollWidth <= innerWidth` en las cuatro pantallas y los tres anchos. Las etiquetas explícitas, Tab desde el encabezado a Acción y después Actor, y el contorno de 3px solid pasan en los tres anchos. Las mediciones de teclado quedan en `e2e-05/capturas/frontend007-contrastes.json`.

Se calcularon 42 pares de colores computados: mínimo 5,52686:1 y máximo 13,87804:1, todos superiores al umbral 4,5:1. Los botones del resumen se midieron habilitados después de recargar realmente resumen y salud: 7,76543:1 y 10,64562:1 respectivamente. Esta es una muestra de contraste y revisión visual acotada; no se presenta como auditoría WCAG completa.

Resultado observado: sin defectos pendientes en las 12 capturas revisadas. Las capturas y fallos anteriores se conservan; la aceptación del incremento corresponde a la persona responsable.
