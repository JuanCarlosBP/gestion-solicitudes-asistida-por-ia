# Carga de estilos compatible con CSP

E2E02 terminó con 32 recorridos superados y uno fallido, sin reintentos. Los ocho fallos iniciales y el nuevo caso de Restablecer quedaron superados. HA-E2E10 llegó a la comprobación de foco y observó `outline: 1px auto`, frente a `3px solid` exigido.

El diagnóstico de Chromium sobre el inicio público confirmó un bloqueo de manejador inline por CSP y un enlace a `/styles-UGMBM6JM.css` que permanecía en `media=print`, con atributo `onload`. El elemento enfocado coincidía con `:focus-visible`, pero no recibía la regla global. Datos sin sesión ni secretos: `foco-diagnostico-01.json`.

El optimizador de Angular insertaba `onload="this.media='all'"` al extraer estilos críticos. La política vigente `script-src 'self'` bloquea correctamente ese manejador. Se establece `optimization.styles.inlineCritical=false` en producción; se mantienen minificación y CSP. La hoja de estilos de 1,18kB se enlaza de forma ordinaria. La modificación no cambia las reglas de negocio ni requiere dependencia nueva.

Build, tipos, lint y formato superados: `foco-correccion-01-*.log`. La inspección del HTML generado confirma ausencia de onload/media print en `foco-build-verificacion.json`. La lógica Angular conserva las 479 pruebas superadas de corrección02; no cambió después. Se refuerza el recorrido base para comprobar foco de 3px y hoja aplicable; HA-E2E10 mantiene la aserción y registrará mediciones de teclado.

Primera corrección de este problema. Aún requiere E2E03 y capturas sobre la imagen con configuración nueva. Fuentes congeladas: `fuentes-corregidas-03.json`, 32 archivos.
