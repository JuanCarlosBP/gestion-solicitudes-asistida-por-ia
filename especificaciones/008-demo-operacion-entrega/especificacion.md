# Especificación — 008 Demo, operación y entrega

**Estado: ejecución local autorizada por el encargo humano AG-016 del 2026-10-16.**
El encargo agrupa concreción, plan, tareas, implementación y pruebas, con revisión
independiente del diseño antes del código. No acredita verificación, aceptación
humana ni publicación. Sustituye los límites históricos de AG-014/015.

## Base y objetivo

001–007 y AG-015 aceptados e integrados según el humano. Base:
`eaa0baec78ed9b99d8039ea7e6256b254be295d3`; árbol:
`5e5d0a92ed719e74729461ab3f8d63baaa84bcb2`; CI main `38882642418`,
backend/frontend/compose PASS según encargo. Rama preparada por el humano:
`feature/008-demo-operacion-entrega`. Contrastar base leyendo metadatos, sin Git.
No repetir una suite idéntica de baseline.

Entregar demo local ejecutable y medible: Angular estático, una instancia Java
de aplicación y un PostgreSQL con pocas bases ficticias separadas. Cada visitante
reserva exclusivamente un espacio; cupo configurable inicial tres, duración de
ensayo 60 minutos. No Java por visitante ni alternativa de negocio compartido.

Fuentes: [seguridad](../../docs/seguridad.md),
[calidad](../../docs/politicas/calidad.md), [plan](plan.md), [tareas](tareas.md)
y [ADR0009](../../docs/decisiones/ADR-0009-demo-aislada-y-operacion.md).
Protocolo externo v1.0 aportado por el humano y leído; huella/ruta en
[referencia](../../qa/evidencias/ag016/protocolo-referencia.json). Sus límites
históricos AG-015 quedan sustituidos por AG-016. Añade objetivo de arranque frío
≤90 s, 100 % de recorridos nominales válidos, sin 5xx/timeouts inesperados ni swap
sostenido. Datos propuestos:20 proveedores y100 solicitudes de5conceptos por
espacio, estados diversos e historial legítimo. No alterar template0/template1.

## Criterios DO-01–DO-10

| ID | Resultado y comprobación exigidos |
|---|---|
| DO-01 | Presentación pública ficticia, reserva exclusiva, cupo/duración configurables. Tres reservas obtienen espacios distintos; la cuarta recibe capacidad ocupada. |
| DO-02 | Perfiles local/público separados, topología aprobada. Construcción fuera del presupuesto; cuotas y consumo del conjunto medidos. Proveedor/precio/dominio reservados al humano. |
| DO-03 | Origen único /api, CSRF, cookies, JWT/sid, refresh, revocación y permisos conservados. TLS preparado sin DNS/publicación. Sin reserva válida, ninguna base de negocio por defecto. |
| DO-04 | Secretos por referencias/archivos fuera de Git; runtime mínimo y provisión/migración separada. Runtime sin superusuario, CREATEDB, CREATEROLE ni socket Docker. Verificar CONNECT y roles globales. |
| DO-05 | Cuentas/contraseñas ficticias temporales por generación para solicitante/supervisor/auditor, catálogo preparado, sin administrador público. Botones con autenticación real y guías de 3–4 pasos. Credenciales solo al titular válido, no-store, nunca logs/evidencias/almacenamiento navegador. |
| DO-06 | Copia/restore a QA nueva, nunca sobre fuente; cotejar datos, V5/V7 y permisos. Medir tiempos; RPO/RTO y retención operativa como propuestas humanas, no contratos. |
| DO-07 | Ciclo persistente de reserva/revocación/drenaje/reciclaje y recuperación tras reinicio. Reciclar base ficticia como conjunto sin purgar eventos individualmente. Comprobar entorno local, inventario cerrado y ausencia de reserva vigente antes de recrear. |
| DO-08 | Guías por rol, manuales públicos de operación/recuperación, Javadoc útil, inventario portfolio y rutas/contratos estables para capítulo008 privado. No manual privado en repositorio ni cambios web personal. |
| DO-09 | Aislamiento, regresión y suite local antes de dimensionar. Internet/TLS real pendientes de publicación humana. No afirmar PUBLICADO ni réplica exacta del VPS. |
| DO-10 | Entrega por criterio, decisiones/evidencias/revisión/incidencias/tiempos, matriz A/B dos pasadas, capacidad recomendada solo con datos. Manifiesto grupos→mensajeSugerido+archivos únicos, hashes/sello con autorreferencias excluidas. |

## Aislamiento observable

| ID | Criterio |
|---|---|
| AIS-01 | Resolver reserva/espacio/generación antes de cualquier consulta de negocio, incluso validación JWT/login/refresh/historial. ID de URL/cabecera sin prueba no autoriza. Contexto ausente/manipulado denegado. |
| AIS-02 | A nunca consulta/muta B; auditor solo historia global de A. Probar cuentas copiadas, JWT/refresh/cookies antiguos, cambio de rol y reasignación. |
| AIS-03 | Destino autorizado y usuario PostgreSQL por espacio; ningún nombre de BD desde cliente. CONNECT denegado entre espacios y a control. |
| AIS-04 | Limpiar contexto al finalizar/excepción; no heredarlo a hilos. Pools por BD/total acotados; probar reutilización de conexiones/hilos y ausencia de fallback. |
| AIS-05 | Memoria idempotente, Web Locks y localStorage incluyen espacio/generación. Respuestas antiguas no repueblan otra reserva. Analizar advisory locks según ámbito real de PostgreSQL antes de cambiarlos. |
| AIS-06 | Expiración/revocación deniega admisiones nuevas; operaciones admitidas terminan o revierten en generación antigua antes de reciclar. Nunca alcanzan base reasignada. |
| AIS-07 | Reinicio conserva reservas/estados. Fallo de provisión bloquea el espacio. No clonar sesiones/tokens vivos. |
| AIS-08 | Límites configurables de reservas/peticiones/autenticación/entradas/almacenamiento sin debilitar Argon2/CSRF. Errores sanitizados y sin credenciales en evidencia. |
| AIS-09 | Laboratorio exclusivo AG-016, inventario previo/final, puertos propios y un dueño Docker. Scripts exigen proyecto/Compose/variables, sin fallback; antes de exec/stop/restart verifican ID/servicio/etiqueta. Preservar recursos previos. |

## Ensayos autorizados

A=2 GiB/1 vCPU; B=4 GiB/2 vCPU. C=8 GiB/4 vCPU solo si ambos fallan.
Dos pasadas secuenciales por perfil: 10 minutos calentamiento, 30 nominal,
5 pico, 20 operación con caducidad/reciclaje/copia/restore. Misma versión,
semilla/mezcla/datos, tres visitantes crean/editan/presentan/deciden/consultan
historial y resumen/inician sesión/renuevan.

Presupuesto conjunto Java+PostgreSQL+web/proxy+provisión+reserva SO/Docker;
carga/navegador fuera. Verificar cgroups/cuotas; declarar aproximaciones.
No cambiar límites globales de Docker Desktop ni reducir ventanas/umbrales.
Registrar muestras/tasas/errores previstos e imprevistos y p50/p95/p99 por
operación; RSS/heap/nativa/caché reclamable, CPU/throttling, conexiones, OOM,
reinicios, swap e I/O. Objetivos: cero cruces/pérdida inesperada; p95 lectura
≤500 ms, escritura ≤1 s, login ≤2 s; margen RAM nominal objetivo ≥25%;
cero OOM/reinicios imprevistos; reserva preparada ≤3 s. Inducidos aparte.
Recomendar menor perfil con margen; insuficiencia de evidencia implica bloqueo
concreto. No autoriza compra ni acredita rendimiento en VPS real.

## Antecedentes y fronteras

Cloudflare Pages/Render/Neon fueron candidatas del borrador AG-014 sin precios
ni capacidades comprobados. Son antecedentes; la opción aprobada es VPS con
Java/PostgreSQL únicos y bases separadas. No se reabre esa elección.

Dominio/proveedor/precio/credenciales reales/licencia/compra/DNS/publicación
corresponden al humano y no bloquean localhost. Una decisión nueva de permisos,
privacidad, alcance o coste se eleva. V1–V7, informes/sellos/CSV históricos se
preservan. No Git, Kafka, Redis, microservicios, Kubernetes, WSL global,
prune, down -v, reset, socket Docker en contenedores ni montajes privilegiados.
No destruir bases/contenedores/volúmenes/evidencias previos.
