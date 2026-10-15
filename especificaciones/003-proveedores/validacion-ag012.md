# Adenda de validación — 003, corrección heredada AG-012

**Estado:** Corrección enfocada y regresión 001–003 comprobadas localmente.
La [validación AG-011](validacion.md) y sus evidencias permanecen íntegramente
conservadas. Esta adenda registra hechos posteriores, autorizados por AG-012.

PR3 run38633782500: backend/frontend success, Compose failure solo en E2E003,
paso10; esperaba1 y recibió2. [Ejecución original de GitHub Actions](https://github.com/JuanCarlosBP/gestion-solicitudes-asistida-por-ia/actions/runs/38633782500).
Reproducción local sin modificar prueba: mismo punto, recibió6 sobre catálogo
acumulado. Captura mostró denominación/fiscal vacíos. Esto respalda una carrera
de preparación/restauración del formulario, no un defecto demostrado de SQL.
El primer intento restringido no accedió a loopback (ERR_NETWORK_ACCESS_DENIED);
repetido con acceso autorizado reprodujo el fallo de producto/prueba.

Corrección01 solo en frontend/e2e/proveedores.spec.ts: UUID por recorrido;
caso Unicode fiscal63 puntos/90UTF16; esperar foco del título y aria-busy=false
tras restauración; filtrar por denominación única completa y fiscal exacto;
comprobar filtros en URL antes de asertar cardinalidad. Buscador sin cambios.
No se reduce la aserción ni se usa espera temporal fija ni reintentos.

Prueba enfocada PASS1/1, doce pasos,4.3s. Regresión E2E001–003 PASS9/9,7.8s,
sin reintentos. Evidencias AG012: e2e-proveedores-inicial-con-red.log,
e2e-proveedores-correccion01.log, e2e-regresion001-003.log/.xml y capturas.
Backend verify heredado PASS98 pruebas con Spotless/SpotBugs; frontend PASS130
pruebas y tipos/lint/formato/build. La segunda ejecución del E2E usa catálogo
previamente poblado. El primer ng test falló en resolución de módulos Vite bajo
sandbox; sin cambiar fuentes, la ejecución autorizada con permisos locales pasó.
Logs y JUnit propios AG012 conservan ambas ejecuciones. Precondición de construcción
terminó a23:35:28 (1.43min); regresión adicional completa antes de desarrollo004.

Agrupación separable sugerida: test: aislar datos y preparación del E2E de proveedores.
Archivos: prueba, esta adenda y evidencias del fallo/corrección. No se ejecutó Git.
CI remota de la corrección pendiente de push humano, no equivale a aceptación.
