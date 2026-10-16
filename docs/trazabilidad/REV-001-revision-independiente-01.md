# REV-001 — Primera revisión independiente de 001

**Estado:** Correcciones requeridas
**Fecha:** 2026-10-13, Europe/Madrid.
**Origen:** primera revisión independiente en esta conversación, anterior a AG-009;
registro durable autorizado expresamente por la persona responsable en AG-009.

La revisión fue de solo lectura. No se modificaron archivos, no se ejecutó Git
ni se ejecutaron nuevamente builds o pruebas de aplicación. Se contrastaron
requisitos BV-01 a BV-10, código, configuración, informes y huellas de AG-008.
No se detectó otra vulnerabilidad alta demostrada. La recomendación fue
**corregir y mantener 001 pendiente**, sin aceptación por la persona responsable.

| Hallazgo | Severidad | Hecho observado | Requisitos afectados |
|---|---|---|---|
| R-01 | Bloqueante | `frontend/Dockerfile` depende de `frontend/public`, carpeta completamente vacía que Git no conserva. La entrega no permite construir desde un checkout limpio. | BV-01, BV-07, BV-09 |
| R-02 | Media | Las herramientas reutilizables escriben en `qa/evidencias/ag006`; una nueva ejecución puede alterar historia. La CI puede publicar archivos anteriores si falla antes de regenerarlos. | BV-08, BV-09, BV-10 |
| R-03 | Media | README, entorno, arquitectura y plan describen Spotless como bloqueado, aunque AG-008 acreditó `mvnw verify` con éxito. | BV-10 |
| R-04 | Baja | Compose admite `FRONTEND_PUERTO`, pero QA utiliza directamente el puerto 18080. | BV-07, BV-08 |

En aquella revisión coincidieron las 301 huellas del manifiesto AG-008 y las
35 huellas reutilizadas. Se comprobaron 305 enlaces internos sin destinos ausentes.
Los informes originales respaldaban 13 pruebas backend, 11 Angular y 5 E2E
sin fallos ni omisiones. La búsqueda acotada no encontró patrones de secretos;
no constituye una garantía absoluta. No aparecieron archivos inesperados dentro
del inventario, con las exclusiones declaradas de cachés, temporales y configuración.

La revisión no repitió Docker, navegación, auditorías ni pruebas funcionales;
no consultó Git ni el remoto. El fallo de copia limpia fue una conclusión estática,
no un build ejecutado por el revisor. Las pruebas existentes no anulaban ese defecto.

Este informe conserva los hallazgos originales. Las respuestas, correcciones y
comprobaciones posteriores se registran en [AG-009](AG-009-informe.md) y en la
[validación](../../especificaciones/001-base-verificable/validacion.md), sin cambiar
este registro para presentar retrospectivamente los hallazgos como resueltos.
