# Validación — 006 Concurrencia e idempotencia

**Estado:** Verificada localmente: CI-01–10 superados; revisión sin hallazgos abiertos.
**Autorización:** AG-013, D-006-01 a D-006-10. Sin aceptación ni integración.

Inicio registrado: 2026-10-15T12:20:55+02:00; límite: 22:20:55+02:00,
Europe/Madrid. Cierre y duración en el [informe AG-013](../../docs/trazabilidad/AG-013-informe.md).

## Criterios y resultados observados

| Criterio | Resultado esperado | Resultado observado y evidencia |
|---|---|---|
| CI-01 | Siete POST con UUID; PUT y exclusiones conservados. | PASS: HTTP/OpenAPI, UUID ausente/inválido, 201/200/Location y PUT sin clave nueva; 23 E2E incluyen Swagger con lista exacta de rutas. |
| CI-02 | La versión evita sobrescrituras y mantiene el agregado. | PASS: dos PUT con igual versión producen un éxito y VERSION_OBSOLETA; 20 claves sobre un agregado producen un éxito y 19 conflictos. Regresión de versiones de 003–005. |
| CI-03 | Huella determinista, equivalencias normalizadas e incompatibilidad. | PASS: 9 pruebas de dominio verifican UTF-8, null, longitudes, orden, normalización, UUID y algoritmo heredado; reutilización transversal incompatible devuelve 409. |
| CI-04 | Replay original, un efecto/evento y conflicto por entrada distinta. | PASS: 20 respuestas idénticas con una fila; snapshots originales después de editar/decidir; un evento. Angular conserva los 409 definitivos y bloquea otro POST desde un alta ya confirmada. |
| CI-05 | Identidad, permisos vigentes, visibilidad y CSRF antes de replay. | PASS: revocación con JWT vigente impide POST y oculta GET; actor ajeno 404, sin identidad 401, CSRF 403. Recuperación sin fiscal, contacto, textos ni hash. |
| CI-06 | Rollback sin parciales; recuperar respuesta perdida y reinicio. | PASS: fallo después del efecto revierte efecto/resultado y permite la misma clave; API y navegador recuperan commit perdido; reinicio real y reautenticación conservan usuario y resultado. |
| CI-07 | Descriptor mínimo, TTL, recarga, reapertura y dos pestañas. | PASS: 411 Angular y 23 E2E. Solo clave/operación/recurso opcional/fecha en localStorage, TTL 24 h y sessionStorage vacío. UUID efectiva en memoria del formulario; confirmación posterior bloquea el intento antiguo y RouterLink permite una intención nueva. |
| CI-08 | V6 preserva V1–V5, filas, hashes y replays de 004/005. | PASS: base nueva V1–V6, evolución Testcontainers y volumen Compose V5→V6; siete tablas/todas las columnas originales y checksums idénticos. Tres replays heredados exactos también después de reiniciar. Sin purga. |
| CI-09 | Espera acotada, Retry-After, errores seguros y contención. | PASS: plazo interno monotónico de 3 s; duplicado no retiene conexión; 409 OPERACION_EN_PROGRESO/Retry-After: 1. Veinte claves diferentes sin 503; PG caído devuelve 503 seguro y recupera 200. |
| CI-10 | Regresión 001–005, herramientas, evidencias y revisión. | PASS: revisión independiente sin hallazgos abiertos. 211 backend, 411 Angular, 23 E2E, 492 controles API, builds sin caché, Compose, auditorías, actionlint, documentación e integridad. |

## Evidencias de la versión verificada

- [Revisión final](../../qa/evidencias/ag013/revision-final.md): criterios CI-01–10,
  fuentes y artefactos contrastados; cierre de los dos ajustes documentales.
- Backend: [verify final 02](../../qa/evidencias/ag013/backend/verify-final02.log),
  [20 suites](../../qa/evidencias/ag013/backend/pruebas-finales.json) y
  [resumen](../../qa/evidencias/ag013/backend/resumen.md).
  99 unitarias + 112 IT = 211; cero fallos, errores u omitidas; Spotless PASS,
  SpotBugs 0. Incluye 180 pruebas anteriores y 31 nuevas.
- Angular: [JUnit final](../../qa/evidencias/ag013/frontend/unitarias-intencion-final-02.xml),
  411/411, cero omitidas; 346 anteriores y 65 nuevas. Tipos, lint, formato y build
  superados. Bundle main-7QNN5UUP.js, 433,65 kB antes de compresión.
- Navegador: [JUnit final](../../qa/evidencias/ag013/frontend/e2e-intencion-completo-final/e2e.xml)
  y [log](../../qa/evidencias/ag013/frontend/e2e-intencion-completo-final.txt),
  23/23, un worker, cero reintentos, 44,1 s observados. Incluye 14 anteriores y
  nueve nuevos; teclado/Enter/foco, dos pestañas y anchos 360/768/1440.
- API: 88 controles de sesiones, 78 de proveedores, 119 de solicitudes,
  140 de aprobaciones y [67 de concurrencia](../../qa/evidencias/ag013/api-concurrencia-01/compose-concurrencia.json):
  492 PASS sobre PostgreSQL real.
- V6: [antes](../../qa/evidencias/ag013/evolucion006/v6-datos-antes.json) y
  [después](../../qa/evidencias/ag013/evolucion006/v6-datos-despues.json), capturados
  antes de mutaciones de QA. Tabla de resultados e índices: 139.264 bytes en esa captura.
- Imágenes: [comparación de artefactos](../../qa/evidencias/ag013/imagenes-finales.json),
  126 clases/recursos/bundles comparados con salidas locales verificadas,
  cero diferencias; backend y frontend construidos sin caché.
- Suministro: [auditorías finales](../../qa/evidencias/ag013/auditorias-finales.json),
  npm producción/completa 0 vulnerabilidades informadas; OSV Maven 132 componentes
  y 0 avisos. POM, package.json y lockfile coinciden con la entrada.
- Entrega: [integridad](../../qa/evidencias/ag013/entrega-integridad.json),
  [fuentes](../../qa/evidencias/ag013/fuentes-finales.json),
  [archivos](../../qa/evidencias/ag013/entrega-manifiesto.json) y
  [commits propuestos](../../qa/evidencias/ag013/manifiesto-commits.json).
  1.075 protegidos sin alteración; prefijo histórico del CSV conservado.

## Contención y alcance de las medidas

Compose: 20 peticiones con igual clave, 112,86 ms totales y un recurso; 20 claves
diferentes, 45,79 ms y 20 recursos. Duplicado con advisory lock ocupado: 409 en
3.014,97 ms. IT final: duplicado con las cinco conexiones ocupadas, 3.010 ms;
20 claves sobre el mismo agregado, 78 ms y una transición.

Son tiempos exteriores observados, incluidos transporte y planificación; no
acreditan un SLA universal de 3.000 ms ni rendimiento productivo. La implementación
limita la espera interna y no mantiene conexiones mientras esperan duplicados locales.

## Fallos conservados y correcciones

Los logs iniciales permanecen en AG-013. Se corrigieron sintaxis de V6, análisis
estático, un fixture CSRF sin UUID, CHECK SQL nullable, documentación OpenAPI y
los verificadores de errores/reautenticación. En Angular se reprodujeron carreras
de limpieza, respuestas tardías y confirmación después del error, con pruebas
enfocadas antes de la regresión. Se preservan conflictos definitivos y la asociación
del formulario con la UUID efectiva, incluso al reemplazar la tarjeta del panel.

E2E inicial 19/21: la lista Swagger omitía el nuevo endpoint; el fixture de bloqueo
mezclaba cookie CSRF nueva con cabecera anterior al reanudar una petición pausada.
Conservar la pareja original de Angular corrigió el fixture sin cambiar seguridad.
La regresión final de 23 casos incluye ambos formularios confirmados después
del error y navegación interna a una intención nueva. No se usaron reintentos para
ocultar fallos. Causas completas en el informe y los resúmenes de implementadores.

## Límites y pendientes humanos

EN_PROGRESO usa metadatos de la instancia actual; varias réplicas requieren diseño
y pruebas adicionales. Sin purga automática; retención jurídica/archivo/tombstone
pendientes de 007/008. El TTL cliente no elimina protección del servidor. Web Locks
es necesario para iniciar operaciones coordinadas; sin él se informa y se permite
consultar pendientes. Cobertura de carga, OWASP, WCAG, sistema operativo y recuperación
de desastres acotada; no se afirma certificación ni ausencia de fallos desconocidos.

La CI remota nueva requiere commit/push humano. El fallo documental heredado se
reprodujo y corrigió localmente incluyendo el log original sin editarlo. Aceptación,
integración y despliegue permanecen en la persona responsable.

Desviación: el coordinador ejecutó git status --short antes de leer la prohibición
del adjunto; consulta sin cambios y salida vacía. No hubo más comandos Git ni
operaciones de escritura Git. No se afirma ausencia absoluta de Git.
