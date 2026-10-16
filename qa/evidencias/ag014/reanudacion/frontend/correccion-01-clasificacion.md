# Primera corrección posterior a E2E01

Ejecución inicial real: 33 recorridos, 25 superados y 8 fallidos, retries=0. Se conserva íntegra en `e2e-01/`. La corrección todavía requiere ejecución integrada sobre la imagen actualizada.

| Fallo observado | Clasificación y cambio | Comprobación conservada |
| --- | --- | --- |
| Swagger, base.spec.ts | Expectativa anterior de17rutas. Se añaden las4GET aprobadas de007 y se comprueban sus métodos/respuestas. | Lista cerrada de21rutas y contratos heredados. |
| HA-E2E03 | Defecto de nombres accesibles: label contenedor incluía opciones. Ahora label explícita vinculada porfor/id. También se corrige selección inicial del tamaño: antes aparecía1 aunque APIpedía20. | Filtros por tipo/actor/fechas/acción, paginación, URL y recarga. |
| HA-E2E07 | Mismo defecto de etiqueta deAcción. | RecursoV6 real, flag obligatorio true, decisiónV5 y aviso incluso con filtro vacío. Las primeras aserciones ya pasaron enE2E01. |
| HA-E2E08 | Mismo defecto de etiqueta deAcción. | Vacío, filtro inválido, recuperación y validación de fecha imposible. |
| HA-E2E10 | Mismo defecto de etiqueta deAcción. | Foco/Tab/outline, no desbordamiento,12capturas y contraste computado. |
| Solicitudes, cambio de estado | Selector de status ambiguo tras añadir status de timeline. Se acota al mensaje directo de éxito. | Texto exacto Solicitud presentada. |
| Operaciones, replay manual | HTTP403 observado. La carrera entre cookie jar compartida y GET tardío es compatible con código/cronología, pero la causa exacta no quedó demostrada por logs. Replaymanual usa APIRequestContext aislado inicializado desde snapshot de la misma sesión; no relogin ni modificación del backend. | RetryUI original, misma clave/cuerpo/Bearer, igualdad exacta de respuesta y ahora status201. Evidencia adicional solo booleanos presencia/igualdadCSRF. |
| Proveedores, búsqueda tras volver | La captura mostró filtro vacío y listado sin filtrar. Se espera foco del encabezado y aria-busy=false antes de editar, como ya hacía el paso10 de la prueba heredada. | Búsqueda real mediante formulario, más aserciones del valor introducido y URL resultante. Mensajes de desactivar/reactivar se acotan también para evitar ambigüedad con el timeline. |

Verificación local posterior:23pruebas enfocadasPASS;478pruebas/23archivosPASS; tipos, lint, formato y buildPASS. Logs `correccion-01-*.log`. No se cambian requisitos, contratos, permisos, CSRF ni idempotencia. Ninguna prueba funcional se omite y no hay reintentos automáticos. No se ha completado aún una segunda ejecución E2E ni revisado las12capturas de007.
