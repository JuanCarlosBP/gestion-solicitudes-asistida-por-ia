# Plan — 007 Historial y auditoría

**Estado:** Ejecución autorizada por decisión humana AG-014, dentro de D-007-01–10.
**Fuente:** [Especificación aprobada](especificacion.md). No acredita aceptación.
El encargo autoriza crear este plan y ejecutar007; no se exige una nueva aprobación
de decisiones técnicas que preserven el alcance aprobado.

## Secuencia y propiedad

1. Coordinador: reconocimiento breve, protección SHA256 de históricos, conciliación
   SDD, contrato y ADR; control temporal máximo ocho horas.
2. Planificador: lectura y propuesta de esquema/contrato/casos límite.
3. Implementador backend: backend/** excepto V1–V6; nuevo módulo historial dividido
   en dominio/aplicación/persistencia/HTTP, V7, integración y pruebas.
4. Implementador frontend: frontend/**; modelo/cliente, timeline reutilizable,
   resumen, rutas, estilos y pruebas Angular/E2E.
5. Coordinador: qa/**, .github/workflows/ci.yml, documentos e índices/MEMORY.
6. Revisor independiente: lectura de cambios y evidencias, sin reparaciones.
   El aislamiento de lectura es una instrucción; no se afirma restricción técnica.

Un escritor por archivo, máximo tres subagentes simultáneos. Contrato anterior
a implementaciones. Revisión posterior y corrección por propietario; dos ciclos
fallidos por problema como máximo. Ningún comando Git, publicación ni datos reales.

## Backend

Una tabla nueva gestion.eventos_historial en V7 con catálogo y campos mínimos
cerrados. Índices por recurso/fecha/id, fecha/id, actor y acción según selectores.
Única fuente V5 para decisiones mediante UNION ALL de proyecciones compatibles,
sin copiar filas ni textos privados. Clave prefijada distingue origen e identidad.

Insertar en callbacks transaccionales de ServicioProveedores y ServicioSolicitudes.
Los logs afterCommit siguen siendo técnicos. Replay devuelve antes del efecto;
no-op proveedor retorna sin evento; PUT exitoso representa guardado y versión.
La identidad visible se fotografía desde BD al actuar, no desde texto del cliente.
Petición UUID se conserva cuando exista sin convertir Idempotency-Key en metadato.
V7 no cambia V1–V6 ni checksums. Privilegios app SELECT/INSERT y verificación real.

Consultas parametrizadas con listas cerradas; identidad/habilitación/roles actuales,
autorización de recurso y filtros antes del count. Reutilizar reglas de visibilidad
sin cargar conceptos ni decidir permisos desde JWT. Lectura repeatable-read para
página/count/aviso; no N+1. Resumen mediante agregación SQL de solicitudes visibles.
Errores controlados existentes400/401/403/404/503; contrato OpenAPI actualizado.

## Frontend

Módulo funcional historial con modelos mínimos, cliente GET y timeline reusable.
Detalle solicitud/proveedor y ruta directa; global solo auditor/admin.
Inicio autenticado muestra resumen real, conservando salud técnica existente.
Filtros/page en URL, fechas convertidas a ISO con offset, estado vacío/cargando/
fallo/sin acceso y aviso anterior. Señalar zona de visualización y límites.
No dependencias nuevas; estilos propios, foco y semántica accesible.
El backend conserva autoridad aunque cambien roles durante una sesión.

## Verificación

Primero pruebas enfocadas; después mvnw verify completo (Spotless, SpotBugs,
unitarias e IT PostgreSQL/Testcontainers), Angular tipos/lint/formato/tests/build.
Evolución V6→V7 con filas reales ficticias y checksums previos; no backfill,
decisiones anteriores, rollback forzado, replay, carreras, permisos y privacidad.
No base en memoria. Docker sin caché, Compose salud200/503/persistencia/Swagger;
regresiones API001–006 y E2E completo sin reintentos, más recorridos007.
Medir tamaño/latencia local y documentar volumen, sin extrapolar SLA.
Auditorías npm/Maven, actionlint, enlaces y búsqueda acotada de secretos.
Evidencia exclusivamente qa/evidencias/ag014, fuentes finales con huellas y
comparación de protegidos. CI remota consultada por GitHub en lectura; nueva
ejecución pendiente del push humano. Conservar servicios/volúmenes sin borrar.

Reanudación humana AG-014: conservar también todos los contenedores e imágenes.
Usar una copia verificada del volumen ficticioV6 en un proyecto Compose de QA
separado, sin reemplazar recursos anteriores. Testcontainers requiere un modo
optativo de conservación que mantenga aislamiento por instancia y todos los
asserts, revisado antes de ejecutarlo. Las evidencias parciales permanecen intactas;
las nuevas ejecuciones se guardan en qa/evidencias/ag014/reanudacion.

## Riesgos y límites

Identidad JWT obsoleta; conteos que filtran recursos; duplicación V5; evento
fuera de transacción; no-op/replay falsos; offsets concurrentes; datos privados;
crecimiento sin purga; privilegios administrativos. Cada riesgo tiene prueba
en [tareas](tareas.md). La BD no ofrece integridad criptográfica.
No iniciar008 hasta007 totalmente verificada localmente, revisión sin bloqueantes
y>=90 minutos restantes; solo borrador, jamás código ni despliegue.
