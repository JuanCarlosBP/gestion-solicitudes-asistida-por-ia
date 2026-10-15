# Extensión del contraste a los botones del inicio

E2E04 superó los 33 recorridos en 53,8s, sin reintentos. Sin embargo, la inspección de las capturas del resumen mostró colores intermedios en Actualizar resumen y Volver a comprobar. La muestra de contraste anterior no incluía esos dos botones; por eso el resultado automático no bastaba para cerrar la revisión visual.

Una medición inicial aislada no mostró animación (7,76543). Se conservó como `contraste-resumen-diagnostico-01.json`. La recarga mediante el botón real sí reprodujo el fenómeno: `contraste-resumen-recarga-01.json` contiene diez fotogramas, todos con `deshabilitado=false`, dos animaciones, mínimo 1,29191 y estado final 10,64562 en hover. No aplica la exención de contraste para controles inactivos.

Segunda corrección del mismo fenómeno: se evita la transición simultánea de texto y fondo en el estilo compartido de botones habilitados. Los enlaces mantienen su transición; no hay refactor general ni cambio de paleta o umbral. Se mantiene también la regla local del historial introducida en la primera corrección.

HA-E2E10 ahora recarga realmente resumen y salud, espera sus respuestas200 y botones habilitados, y añade ambos controles a las mediciones. La muestra pasa de36a42 pares de colores en tres anchos. Si este mismo problema persiste tras esta segunda corrección, se detendrá ese punto según la regla del proyecto.

Build, tipos, lint y formato superados: `contraste-correccion-02-*.log`. Fuentes congeladas: `fuentes-corregidas-06.json`,33archivos. Bundle `main-WKPT366M.js`, CSS `styles-6GABB4AX.css`. La lógica Angular conserva las479pruebas superadas; sin modificaciones de TypeScript de aplicación después de ese resultado. Pendiente el pase final sobre la imagen actualizada y la inspección de sus12capturas.
