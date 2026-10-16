# Especificación — 008 Demo, operación y entrega

**Estado: borrador pendiente de clarificación y aprobación humana.**
Creado únicamente como continuación documental autorizada por AG-014, después de
[007 verificado localmente](../007-historial-auditoria/validacion.md) y de la
[puerta008](../../qa/evidencias/ag014/reanudacion/puerta008.json), cumplida
el2026-10-15 a22:17:38+02:00 con347,351minutos restantes. No hay plan/tareas aprobados,
implementación008, cuentas creadas, recursos contratados ni despliegue público.

## Objetivo y antecedentes

Preparar una demostración reproducible con datos exclusivamente ficticios y una
entrega comprensible, recuperable y operable por la persona responsable. La base
existente es un monolito modular Java21/Spring/PostgreSQL y Angular, con OpenAPI,
Docker, identidad/sesiones, permisos, idempotencia e historial V5/V7 comprobados.

Fuentes vigentes: [arquitectura](../../docs/documentaciondev/arquitectura.md),
[entorno](../../docs/documentaciondev/entorno.md),
[API](../../docs/documentaciondev/api-y-rutas.md),
[modelo de datos](../../docs/documentaciondev/modelo-de-datos.md),
[seguridad](../../docs/seguridad.md) y
[entrega AG-014](../../docs/trazabilidad/AG-014-informe.md).
Las comprobaciones locales007 no acreditan todavía operación en Internet, restore
de desastre, rendimiento público, un SLA ni aceptación del producto.

## Requisitos propuestos

| ID | Requisito para clarificar y aprobar |
|---|---|
| DO-01 | Definir audiencia, duración, responsable, presupuesto y finalidad de la demo. Solo datos y cuentas ficticios identificados como tales; separar completamente entornos y credenciales de producción. |
| DO-02 | Evaluar alojamiento Angular/Spring/PostgreSQL compatible con las versiones fijadas, TLS, rutas SPA, API, migraciones, conectividad, cuotas, suspensión y persistencia. Documentar coste y límites con fuentes vigentes antes de elegir. |
| DO-03 | Resolver el origen público de frontend/API sin debilitar CSRF, cookies, CORS, CSP, autenticación, roles actuales ni autorización por recurso. El nginx local y su proxy /api no se trasladan automáticamente a un alojamiento estático. |
| DO-04 | Definir secretos externos por entorno, provisión humana, rotación/revocación, acceso mínimo y separación de credenciales de migración/aplicación. Secretos del servidor y claves privadas nunca llegan al cliente ni al repositorio/configuración publicada/evidencia. Conservar el contrato002: el navegador trata las credenciales de acceso y sesión necesarias con las protecciones vigentes (access token transitorio y refresh en cookie protegida), sin persistencia o exposición insegura ni registro en evidencia. |
| DO-05 | Proponer cuentas ficticias por rol y guion de demostración con altas, solicitudes, decisiones, idempotencia e historial. Aprobar creación, restablecimiento, caducidad y revocación; no publicar credenciales reutilizables ni abrir administración indiscriminada. |
| DO-06 | Diseñar copia y restauración verificables, responsables, cifrado/acceso, destino, frecuencia, RPO/RTO y retención aprobados. Probar restore en un entorno ficticio separado, cotejando datos/checksums/permisos, decisiones V5 y eventos V7. No sobrescribir la fuente para probar. |
| DO-07 | Decidir retención y limpieza de datos de demo, sesiones, idempotencia e historial como conjunto coherente. No introducir purga, borrado de eventos, plazos jurídicos inventados ni pérdida de protección de replay. Cualquier operación destructiva exige procedimiento y autorización posterior. |
| DO-08 | Revisar Javadoc útil de contratos/restricciones/decisiones y preparar manuales de usuario por rol, instalación, operación, copia/restore, resolución de incidencias y recuperación. Usar contenido en español, ejemplos ficticios y enlaces comprobables. |
| DO-09 | Tras autorización de publicación, probar desde Internet rutas directas, TLS, cookies/CSRF/CORS/CSP, permisos negativos, secretos ausentes, salud200/503 y recuperación, persistencia, resumen e historial. Registrar URL/fecha/versiones y evidencia sanitizada sin atribuir éxito antes de ejecutar. |
| DO-10 | Preparar entrega revisable: inventario/versiones, configuración sin secretos, guía de despliegue/rollback, limitaciones, pruebas/CI remota, responsables y acta de aceptación humana. Publicación, integración y aceptación son decisiones separadas. |

## Opciones de alojamiento, todavía sin seleccionar

| Candidata solicitada | Aspectos que requieren contraste y decisión |
|---|---|
| Cloudflare Pages Free para Angular | Compatibilidad SPA y rutas directas, cabeceras, límites del plan y solución aprobada para un origen API compatible con la seguridad existente. No se afirma que ejecute nginx ni un backend Java. |
| Render, servicio Spring siempre activo | Plan que realmente garantice el comportamiento requerido sin suspensión; coste, región, Java21/Docker, arranque, memoria, conexiones y gestión de secretos. No se afirma gratuidad ni disponibilidad permanente de un plan no comprobado. |
| Neon Free para PostgreSQL | Versión y extensiones necesarias, conexiones/pooling, TLS, cuotas, suspensión, almacenamiento, backups/restore y límites del plan. No se asume que un nivel gratuito satisfaga los objetivos de recuperación. |

Son candidatas del encargo, no servicios contratados ni capacidades/precios verificados.
Las condiciones comerciales y técnicas deberán contrastarse en fuentes oficiales
vigentes al tomar la decisión; no se ha realizado esa evaluación externa en este borrador.
No se introducen microservicios, Kafka, Redis ni bases adicionales en la arquitectura.

## Borrador conceptual de configuración

Inventario documental, deliberadamente no ejecutable y sin claves:

| Elemento | Valor pendiente |
|---|---|
| URL pública y origen de API | Por decidir y aprobar junto al proxy/origen común. |
| Alojamiento frontend/backend/BD | Candidatas anteriores; selección, región y plan pendientes. |
| TLS, DNS y cabeceras | Responsable y mecanismo pendientes; sin cambios DNS realizados. |
| Perfil y secretos del backend | Perfil público aprobado y referencias al gestor de secretos elegido, nunca valores reales. |
| Conexión PostgreSQL | Host/base/TLS y referencia de credencial externa pendientes; aplicación con mínimos privilegios. |
| Migraciones | Flyway V1–V7 preservadas, credencial separada y comprobación previa; no migrar una BD real desde este encargo. |
| Copias y observabilidad | Destino/frecuencia/retención/alertas/RPO/RTO pendientes; logs mínimos sin datos sensibles. |

No copiar contraseñas de ejemplo local ni habilitar perfiles demo públicamente sin
la decisión y los controles de DO-04/05. El futuro rollback debe considerar también
compatibilidad de esquema y datos; no se propone borrar migraciones ni volver atrás
destructivamente una BD.

## Clarificaciones abiertas

1. ¿Quién accederá, durante cuánto tiempo y con qué presupuesto máximo? ¿Qué significa
   «siempre activo» para esta demo y cómo se comprobará, sin inventar un SLA?
2. ¿Qué origen público y mecanismo de acceso/proxy se aprueban para mantener las
   garantías actuales? ¿Quién gestionará cuentas, DNS, facturación y secretos?
3. ¿Qué RPO/RTO, destino de copias y retención se necesitan? ¿Quién autoriza y
   presencia la prueba de restauración y la eventual limpieza?
4. ¿Se permite acceso anónimo a información de presentación o solo usuarios invitados?
   El acceso de negocio continuará autenticado y autorizado salvo cambio aprobado.
5. ¿Qué manuales y guion necesita cada perfil y quién firma la aceptación?

## Salidas documentales propuestas para un plan posterior

Inventario de configuración/versiones y alternativas; revisión de Javadoc relevante;
manual de usuario y operación; procedimiento de backup/restore y rollback; guion de
cuentas/datos ficticios y limpieza; matriz de pruebas desde Internet; checklist de
entrega y aceptación. Son propuestas de contenido, no tareas aprobadas ni ejecutadas.
Los criterios DO-01–10 deberán concretarse en resultados esperados observables
durante clarificación antes de redactar y aprobar un plan de implementación.

## Fuera de esta continuación

No se crean planes, tareas de ejecución, migraciones, código008 ni configuración
operativa. No se compran recursos, crean cuentas, publican credenciales, configuran
DNS, despliegan servicios ni alteran producción. Los30 contenedores detenidos,
17 volúmenes y20 imágenes conservados tras AG-014 no se limpian desde este borrador.
El siguiente paso es revisión humana de esta especificación y sus clarificaciones.
