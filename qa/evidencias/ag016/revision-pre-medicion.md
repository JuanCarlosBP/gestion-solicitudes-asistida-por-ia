# Revisión independiente previa a medición

Revisor: agente `revision_reanudacion`, solo lectura. Coordinador transcribe sus
conclusiones recibidas el2026-10-16; no se ejecutaron pruebas, Docker ni Git desde
el revisor. No constituye aceptación humana.

El revisor comprobó las correcciones del plazo conjunto90s, sobrecupo durante pico,
identidad/StartedAt, captura de fuentes e imágenes, NMT y candado de carga. Localizó
dos carencias del evaluador: ausencia JVM/NMT no bloqueante y falta de comparación
de parámetros funcionales. Ambas se corrigieron antes de medir: versión2 exige
presencia/parseo JVM/NMT y proyección pública cerrada, igual al inicio/cierre y
entre pasadas. Se preserva memoria por servicio y reserva SO sin restar caché.

Huellas revisadas:

- `qa/ag016/evaluar.mjs`:71256fc96ff28db6f1723c8059008bf4a1525bca3ec2ad521d1de179cda3f40c.
- `qa/ag016/evaluar.test.mjs`:d7b7728ff5af621cd43174ee038e5dcb932a67a80850f5024060488a044ff382.

Las25pruebas offline registradas en `evaluador-offline-02/verificacion.json`
corresponden a esas fuentes. La matriz propone candidato pendiente de revisión
técnica CPU/throttling/cola/slots, sin recomendación automática ni capacidad inventada.
La captura NMT real de `preflight-medicion-01` incluye total y Java Heap parseables.

En documentación se precisaron18controles de conexión (15denegados+3autorizados)
y la revisión técnica posterior de CPU. El revisor no reparó esos archivos.

La revisión UI detectó 61 min en `e2e-demo-final-03`. Se interrumpió `carga-a1`, que
no constituye una pasada válida. La segunda corrección quedó comprobada después:
`e2e-demo-final-04` exige 60 min en tres reservas y antes de las capturas de escritorio
y móvil. El revisor inspeccionó ambas imágenes y contrastó las huellas del artefacto;
la regresión final05 registra 33 PASS sin reintentos. Los fallos anteriores se conservan.

La revisión de los helpers de entrega cerró dos hallazgos: cobertura exacta y rutas
únicas del sello, y exclusión de rutas externas mediante unidades Windows. La evidencia
del implementador contiene 5 controles de cobertura y 9 de rutas correctos. El helper
de progreso trata JSON parcial como dato pendiente con aviso y no convierte la falta
de reserva SO en cero. Huellas revisadas: `sellar.mjs`, `86fd1c0c…526ec2d8`;
`progreso.mjs`, `5e87277a…0dc5a33`.

Las 2.738 comparaciones de bytes históricos registradas no presentan diferencias.
Pendientes: cuatro ventanas completas comparables, análisis de capacidad, contenido
final de la entrega y generación/comprobación del sello. Estos controles offline
no acreditan capacidad ni sustituyen la aceptación humana.
