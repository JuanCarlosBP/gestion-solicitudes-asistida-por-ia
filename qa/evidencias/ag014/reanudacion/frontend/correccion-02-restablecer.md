# Restablecer filtros sin cambios en URL

La revisión independiente propuso comprobar campos editados sin aplicar cuando la URL ya era `/historial?page=0&size=20`. La nueva prueba reprodujo el defecto: la API recibía los valores iniciales pero el selector de acción conservaba APROBADA. Evidencia: `restablecer-diagnostico-01.log`, 23 superadas y una fallida.

Se corrige el handler `restablecer(formulario)` para asignar los valores iniciales a los controles reales antes de navegar o recargar. Es necesario porque Angular no reescribe bindings con valores que no han cambiado. No cambia el contrato de filtros ni los permisos. Se añade el mismo escenario al recorrido HA-E2E08; continúa habiendo 33 recorridos.

Primera corrección del problema: 24 pruebas enfocadas superadas (`restablecer-correccion-01.log`). Regresión posterior: 479 pruebas en 23 archivos superadas; tipos, lint, formato y build superados (`correccion-02-*.log`). Nueva huella de las 31 fuentes en `fuentes-corregidas-02.json`. La ejecución integrada requiere la imagen actualizada; las evidencias previas permanecen conservadas.
