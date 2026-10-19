# 008 — Corrección del recorrido de teclado en la CI de cierre

## Hecho observado

La primera CI de la [PR #7](https://github.com/JuanCarlosBP/gestion-solicitudes-asistida-por-ia/pull/7)
corresponde al commit `fa8fc15f8d89275c7b44490c4f4b7c75d660b4e7` y a la
[ejecución 39301229470](https://github.com/JuanCarlosBP/gestion-solicitudes-asistida-por-ia/actions/runs/39301229470).
Backend, frontend y demo terminaron satisfactoriamente. Compose pasó sus seis
suites HTTP (636 controles), el inventario OpenAPI (21 rutas, 25 operaciones y
195 referencias) y 32 de sus 33 pruebas de navegador, incluida Swagger.

La prueba `teclado, foco, idioma y ancho móvil` falló en
`frontend/e2e/base.spec.ts:66`: esperaba el foco en «Volver a comprobar» tras
una sola pulsación Tab desde el contenido principal. El control de documentos
y actionlint posterior no llegó a ejecutarse; no se cuenta como PASS.

## Causa y decisión

El pulido aprobado añadió antes del estado del sistema el enlace «Comenzar
demostración», en [inicio.html](../../frontend/src/app/inicio/inicio.html).
Ese enlace es ahora el primer control del contenido al navegar con Tab.
La antigua secuencia omitía este control y había quedado desactualizada.

El foco indica qué elemento recibirá una pulsación del teclado. Un enlace
nuevo debe seguir siendo alcanzable: no lo ocultamos, no le ponemos
`tabindex="-1"` y no cambiamos el orden de la interfaz para satisfacer una
expectativa antigua. La prueba se adapta al orden intencionado y comprueba
explícitamente el enlace nuevo, su destino, el contorno visible, el avance y
el retroceso entre ambos controles.

Se mantienen el salto al contenido, el idioma español, el foco en main, el
botón de comprobación, su activación por Enter y la ausencia de desbordamiento.
Además se espera una respuesta real GET `/api/salud` con estado 200 después
de pulsar Enter, en lugar de inferir la nueva consulta de un texto previo.

## Cambio limitado y verificación

Se modifica únicamente [base.spec.ts](../../frontend/e2e/base.spec.ts) y se
añade esta nota. No se modifica ningún archivo de aplicación, autenticación,
base de datos, workflow o infraestructura. No hay pruebas omitidas, incremento
de reintentos, pausas artificiales ni asignación programática del foco en el
test para forzar un éxito.

La ejecución inicial fallida se conserva en GitHub. El nuevo commit debe
superar los cuatro trabajos de la CI de la PR y después los cuatro de main.
Este documento no anticipa ese resultado: debe consultarse la revisión y su
run concreto. No requiere redeplegar el VPS ni repetir las cuatro ventanas de
carga por un cambio exclusivamente del test.

## Para estudiar y defender la corrección

1. Abrir el run fallido, trabajo Compose y su paso de navegador.
2. Leer la aserción, no solo el nombre de la prueba.
3. Comparar su secuencia con el orden del HTML aprobado.
4. Identificar el enlace nuevo que legítimamente recibe el foco.
5. Abrir el diff del commit correctivo y comprobar las aserciones conservadas.
6. Comprobar las dos CI posteriores sin confundir una prueba local con remota.

No se afirma una certificación general de accesibilidad. La comprobación cubre
este recorrido y estos controles. Las copias externas periódicas, restauración
global, reinicio real del VPS y acceso con PC apagado siguen diferenciados del
cierre del código.
