# Contraste durante la habilitación del botón

E2E03 terminó con 32 recorridos superados y uno fallido, sin reintentos. Foco y carga CSS quedaron superados. HA-E2E10 midió contraste 2,97697 en el botón Aplicar filtros inmediatamente después de cargar los eventos.

El diagnóstico de Chromium observó los fotogramas reales de la transición, desde la habilitación hasta terminar las animaciones, sin espera artificial: `contraste-diagnostico-01.json`. Hubo dos animaciones simultáneas de texto y fondo. El contraste empezó en 5,52686, descendió a 1,05018 y terminó en 7,76543; el estado final tenía cero animaciones. El problema era transitorio y visible, no una paleta final insuficiente.

Se desactiva la transición únicamente en los botones habilitados del componente de historial. Los colores cambian directamente entre estados legibles. Se conservan paleta, reglas globales, foco, CSP y umbral mínimo 4,5 de la prueba. Es la primera corrección de este problema, distinto del bloqueo previo de CSS.

Formato y build superados en `contraste-correccion-01-*.log`. La lógica TypeScript no cambia. Fuentes congeladas en `fuentes-corregidas-05.json`: 32 archivos. Bundle `main-WKPT366M.js`, CSS `styles-UGMBM6JM.css`. Pendiente ejecutar sobre la imagen nueva y revisar las 12 capturas finales.
