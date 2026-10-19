# AG-018 — Selección estable durante la búsqueda de referencias

## Incidencia observada

En el pulido 1.1 las 576 pruebas Angular terminan con 574 satisfactorias y dos
fallos, uno para proveedores y otro para supervisores. En ambos, la aserción
`expect(select.value).toBe(id)` de `referencia-busqueda.spec.ts:135` recibe una
cadena vacía después de una consulta sin resultados. La aserción ocurre antes
de borrar el texto, aunque el nombre del caso incluya esa acción posterior.

## Causa y corrección

La plantilla representaba la referencia elegida mediante dos árboles distintos:
una opción dentro de `@for` cuando estaba en la página y otra dentro de `@if`
cuando quedaba fuera. El dato `valor` no ordena por sí solo conservar el mismo
elemento nativo del desplegable al destruir y recrear esas opciones.

La corrección crea una única lista calculada `opciones`. Cuando existe una
selección, la sitúa primero, incorpora los restantes resultados sin duplicar su
identificador y mantiene un único `@for (opcion of opciones(); track opcion.id)`.
La opción no cambia de árbol al filtrar, paginar, borrar o recibir un error.
El mensaje de selección sigue distinguiendo la referencia elegida de los
resultados: una referencia retenida no se contabiliza como coincidencia del
servidor. Una búsqueda no emite `cambio` ni guarda la solicitud.

No cambian el contrato HTTP, los permisos, la base de datos, los decimales, la
portada aceptada ni el formulario real de acceso con su explicación de la demo.
No se incorpora una dependencia nueva. El caso original que fallaba no se edita
ni se omite.

## Pruebas exigidas para esta revisión

Se conservan las 24 pruebas originales de búsqueda, incluyendo las dos aserciones
fallidas. Se añaden 16 casos TestBed: persistencia del mismo nodo durante espera,
sin coincidencias y borrado; otros resultados; regreso de la referencia; error y
recuperación; paginación; valor externo; elección explícita de ninguna referencia;
cancelación de la consulta antigua. Se ejecuta Angular completo, tipos, análisis,
formato y compilación. El recorrido de navegador exige que el nodo elegido siga
conectado y seleccionado antes y después de instalar el frontend.

Las pruebas auxiliares aisladas y el ensayo DOM no equivalen a Angular TestBed
completo ni a una ejecución pública. Los resultados reales del lote se conservan
en `tmp/ag018/pulido/<intento>` y deben revisarse antes del cierre.
El fallo anterior se conserva como antecedente y no se reemplaza por un PASS.

## Límite de la entrega

La nueva versión se despliega solo si las comprobaciones locales y la vista
previa con API real pasan. Git, CI remota, aceptación visual y operación final
siguen sujetos a su cierre explícito. No se repiten las cuatro cargas de capacidad
por esta corrección de representación del selector.
