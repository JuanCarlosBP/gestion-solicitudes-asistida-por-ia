# AG-013 — Concurrencia e idempotencia transversal

**Estado:** 006 verificada localmente; CI-01–10 superados y revisión sin hallazgos abiertos.
**Autorización:** Encargo humano AG-013, D-006-01–10 y SDD/ADR/implementación006.

## Horario y alcance

Inicio registrado2026-10-15T12:20:55+02:00, límite22:20:55+02:00, Europe/Madrid.
Precondición cerrada12:29:55+02:00,9,01 minutos.006 cerrada localmente a
13:23:17,915+02:00, tras1h02m22,915s. Cierre AG-013: 2026-10-15T13:27:21+02:00; duración 01:06:26. Registro completo en
[cierre](../../qa/evidencias/ag013/cierre.json).
Workspace exclusivo indicado por usuario. Rama comunicada feature/006-concurrencia-idempotencia;
no verificada mediante Git. No integración ni publicación.

El encargo informa de aceptación formal del gobierno y de 001/002; 003–005 estaban
implementados y verificados localmente. AG-013 no altera ni sustituye las evidencias
históricas, y no acepta ni integra 006 por cuenta de la persona responsable.

Desviación: antes de leer la prohibición del adjunto, el coordinador ejecutó
`git status --short`, consulta sin cambios y salida vacía. Se informó enseguida.
No se ejecutaron más comandos Git; no se puede afirmar ausencia absoluta de Git.

## Roles y fuentes

Coordinador escribe SDD/ADR/docs/MEMORY/índices/CI/qa/infraestructura; implementador
backend posee backend/** salvoV1–V5; frontend posee frontend/**. Planificador y
revisor separados actúan en lectura por instrucción. No se acredita aislamiento
técnico read-only; sesión workspace-write, red restringida y escalaciones puntuales
para Docker, procesos locales y auditorías. Tres subagentes concurrentes como máximo.
Skills SDD, mantenimiento-documental, verificacion-qa y revision-seguridad leídas
y aplicadas, sin afirmar una invocación nativa inexistente.

Se consultaron AGENTS/MEMORY/contexto/orquestación, seguridad/calidad/documentación,
SDD003–005, ADR0004–0006, V3–V5, código/QA/CI pertinente. El planificador contrastó
contratos y compatibilidad; revisión independiente contrasta requisitos/evidencias.

## Precondición y preservación

Java21.0.12.1, Node24.13.0, npm11.6.2, Docker29.1.3 accesibles. compile backend y
build frontend PASS. Maven tomó JAVA_HOME17 inicialmente; seleccionar JDK21 instalado
resolvió el fallo de Spotless sin editar producto. Docker requirió acceso autorizado
al pipe local. Evidencias: precondicion.json y logs de construcción.

Huellas iniciales1135 archivos; complemento1035 históricos incluye archivos ignorados
por rg inicial, especialmente logs. No se editó ningún histórico entre capturas.
Captura real V5: siete tablas y proyección de todas sus columnas, sin imprimir filas;
V6 conserva conteos/huellas/checksums: comparación real V5→V6 PASS antes de mutaciones
de QA, siete tablas y todas sus columnas anteriores. El registro y sus índices
ocupaban 139.264 bytes en esa captura. Prefijo CSV y MEMORY de entrada guardados.

## Fallo remoto heredado, separado de006

PR3/run38718798024 y PR4/run38718789285 consultadas por conector GitHub en lectura.
Backend/frontend/API/E2E pasan; Compose falla en documentación. PR3 no tiene dos
destinos; PR4 ya contiene primer-fallo-remoto.txt, pero falta el log histórico
qa/evidencias/ag011/backend-verify-final.log porque *.log está ignorado.

Corrección: excepción exacta en .gitignore para incluir el archivo existente con
su hash original. No se edita evidencia ni validación histórica. Reproducción
sin Git en tmp/ag013/reproduccion-ci:523 enlaces,1 ausente y exit1; incluyendo
el log original:523 enlaces,0 ausentes,0 patrones y exit0. Copia y original tienen
misma huella. El intento de borrar la copia informó que ya estaba ausente porque
el manifiesto inicial respetaba *.log; la prueba de ausencia sigue siendo real.
La inclusión en commit/push y CI remota nueva permanecen humanas.
Evidencias: ci-remota-entrada.json, ci-heredada-reproduccion.txt,
ci-heredada-corregida.txt y ci-heredada-resultado.json, dentro de AG-013.

## SDD y diseño

[Especificación006](../../especificaciones/006-concurrencia-idempotencia/especificacion.md),
[plan](../../especificaciones/006-concurrencia-idempotencia/plan.md),
[tareas](../../especificaciones/006-concurrencia-idempotencia/tareas.md) y
[ADR0007](../decisiones/ADR-0007-concurrencia-idempotencia-transversal.md) se redactaron
antes de habilitar implementación. Aprobación procede del encargo humano.
Validación local completada. Matriz de sietePOST, PUT/exclusiones, usuario+clave,
canónica2/legacy1, snapshot tipado original, permiso actual, espera3s/Retry-After1,
recuperación mínima y ausencia de purga documentados.
La [validación006](../../especificaciones/006-concurrencia-idempotencia/validacion.md)
relaciona individualmente CI-01–10 con resultados y evidencias.

## Revisión y correcciones

La revisión independiente detectó y remitió al escritor responsable:

- Una respuesta 400 tardía podía borrar un descriptor compartido con otra pestaña.
  La corrección conserva el descriptor ante errores; pruebas Angular superadas.
- El estado podía retroceder desde COMPLETADA al llegar un POST/GET anterior.
  La confirmación pasa a ser monotónica. Se corrigieron además el conflicto 409 tardío
  y el formulario de alta sin ID, para no confundir entradas incompatibles ni
  permitir otra alta tras una confirmación cuyo detalle no se pudo cargar.
- La inspección posterior encontró el orden inverso: POST ya fallido y GET exitoso
  posterior, con el formulario antiguo todavía abierto. Se reprodujo y corrigió
  la asociación por UUID efectiva para que limpiar el descriptor no permita otro
  envío del mismo intento. Las pruebas de ambos formularios y sus E2E pasan.
- OpenAPI omitía errores/Retry-After en operaciones nuevas; corregido y probado.
- Un CHECK de V6 admitía moneda nula por la lógica SQL UNKNOWN; se exige IS NOT NULL
  y una prueba negativa comprueba la restricción sin alterar datos heredados.
- QA006 utilizaba inicialmente el campo `codigo` en lugar de `error`, y pretendía
  reutilizar JWT después de rotar la firma local en un reinicio. Se corrigió el
  verificador antes de ejecutarlo, conservando la autenticación existente.

El revisor contrastó 112/112 fuentes backend finales y 211 pruebas superadas.
La última comprobación global preserva 1.075 archivos protegidos y el prefijo CSV.
El revisor contrastó también 111/111 fuentes frontend, 411 unitarias y 23 E2E
finales, sin defectos técnicos pendientes identificados. El pase consolidado cerró
los dos ajustes documentales: inventario vigente del README y actualización de
huellas tras la última edición de arquitectura. Los 251 archivos de fuentes
coinciden, con 126 artefactos de imágenes cotejados. Dictamen y alcance en la
[revisión final](../../qa/evidencias/ag013/revision-final.md).

La primera suite E2E obtuvo 19/21. Swagger omitía el nuevo GET en su lista exacta;
se amplió conservando la igualdad exacta. La prueba de progreso pausaba un POST
en Playwright: una petición de la segunda pestaña rotaba la cookie CSRF durante
la pausa y `route.continue` combinaba cookie nueva con cabecera anterior. Los
diagnósticos booleanos comprueban que Angular había generado la pareja correcta.
El fixture ahora conserva ambas cabeceras originales mediante fetch/fulfill;
el backend sigue validando CSRF. Enfoque 12/12 y regresión 21/21 superados antes
del último hallazgo de formulario. La versión posterior supera 411 unitarias,
dos E2E enfocados y la regresión completa de 23 E2E sin reintentos.

## Resultados y pendientes

| Comprobación ejecutada | Resultado y evidencia propia |
|---|---|
| Maven verify, Spotless y SpotBugs | 211/211: 99 unitarias + 112 IT; cero omitidas y SpotBugs 0. `backend/verify-final02.log`, XML y huellas finales. Incluye las 180 pruebas anteriores y 31 nuevas. |
| Angular | 411/411, 346 anteriores y 65 nuevas; tipos/lint/formato/build PASS. `frontend/unitarias-intencion-final-02.xml` y `frontend/entrega-frontend.json`. |
| E2E final | 23/23, 14 anteriores y 9 nuevos, 44,1 s; un worker y cero reintentos. `frontend/e2e-intencion-completo-final/`. Incluye teclado, foco, Swagger y responsive. |
| API identidad | 88 controles PASS, `api-sesiones-01/compose-sesiones.json`. |
| API proveedores | 78 controles PASS, `api-proveedores-01/compose-proveedores.json`. |
| API solicitudes | 119 controles PASS, `api-solicitudes-01/compose-solicitudes.json`. |
| API aprobaciones | 140 controles PASS, `api-aprobaciones-01/compose-aprobaciones.json`. |
| API concurrencia | 67 controles PASS, `api-concurrencia-01/compose-concurrencia.json`; total API 492. |
| Compose y navegador de salud | Persistencia tras stop/start, PostgreSQL caído 503 y recuperación 200. Repetido sobre imágenes finales: 2.016 ms observados para 503; `compose-imagen-final/compose-persistencia-caida.json`. Sin borrar volumen. |
| Imágenes finales | Builds sin caché; 126 clases/recursos/bundles comparados con salidas locales, cero diferencias. `imagenes-finales.json`. |
| Evolución real V5→V6 | Siete tablas y columnas anteriores idénticas; V1–V5/checksums intactos, V6 aplicada. `evolucion006/v6-datos-antes.json` y `v6-datos-despues.json`. |
| Auditoría npm | Producción y completa: salida 0, cero vulnerabilidades informadas; JSON en AG-013. |
| Auditoría Maven | OSV Scanner 2.7.0, 132 componentes, cero coincidencias; base pública descargada durante la sesión y análisis local sin envío de metadatos. `auditoria-maven/`. |
| Dependencias preliminares | PASS conforme a ADR-0002; se conservan las transitivas controladas. Sin nuevas dependencias ni versiones mayores. |
| CI estática | Actionlint PASS; API006 y E2E001–006 incorporados, Actions por SHA, una ejecución por PR, evidencias aisladas y cero reintentos E2E. |
| Documentación e integridad | 592 enlaces; cero destinos ausentes y cero patrones detectados en `documentacion-final/documentacion-control.json`; 1.075 protegidos intactos y prefijo histórico del CSV conservado en `entrega-integridad.json`. |
| Búsqueda adicional de secretos | Cero ubicaciones de patrones JWT y claves privadas en evidencias AG-013, `secretos-evidencias-final.json`. Alcance acotado, sin imprimir valores. |

Todos los caminos de evidencia de la tabla son relativos a `qa/evidencias/ag013/`.
La comprobación remota nueva sigue pendiente del commit/push humano; la equivalencia
local en Windows no acredita la ejecución del runner Linux.

Resumen frontend completo en [entrega](../../qa/evidencias/ag013/frontend/entrega-frontend.json).
Contenedores detenidos y volumen conservado, comprobados en
[cierre Compose](../../qa/evidencias/ag013/compose-cierre.json).

## Matriz, huella, replay y errores

La [matriz aprobada](../../especificaciones/006-concurrencia-idempotencia/especificacion.md)
incluye crear/desactivar/reactivar proveedor, crear borrador, presentar, aprobar y
rechazar. Los dos PUT conservan versión y no exigen clave nueva. GET, identidad,
CSRF y salud mantienen sus garantías específicas.

El ámbito es usuario+UUID global. SHA-256 de canónica 2 comienza `CI2;` y serializa
operación, usuario, recurso, versión y entrada normalizada en orden fijo. Null es
`N;`; texto es `S<longitud UTF-8>:<contenido>;`. La versión 1 mantiene exactamente
los algoritmos y hashes anteriores. Los detalles de normalización están en ADR-0007.

Solo se persisten éxitos, atómicos con efecto/evento. El snapshot tipado permite
replay exacto después de editar el recurso; GET de recuperación devuelve únicamente
HTTP/id/versión/estado/número opcional. No devuelve cuerpos, fiscal, contactos ni
textos de decisión. Autorización y visibilidad vigentes preceden al replay; CSRF
se mantiene en mutaciones. Los errores no consumen la clave.

VERSION_OBSOLETA y CLAVE_IDEMPOTENCIA_REUTILIZADA conservan 409. La espera interna
monotónica se limita a tres segundos; OPERACION_EN_PROGRESO devuelve 409 y
Retry-After: 1. Duplicados locales esperan sin conexión al pool. Recuperación
inexistente/ajena devuelve 404; PostgreSQL inaccesible devuelve 503 controlado,
también desde el filtro de identidad.

## Contención, rollback y reinicio

| Escenario local | Resultado observado |
|---|---|
| 20 POST con la misma clave, Compose | 20 respuestas 201 idénticas y una fila; total 112,86 ms. |
| 20 claves diferentes, Compose | 20 recursos distintos, sin 503; total 45,79 ms. |
| Dos PUT con igual versión | Un éxito y un VERSION_OBSOLETA. |
| Duplicado con advisory lock ocupado, Compose | 409 y Retry-After: 1; 3.014,97 ms de extremo a extremo. |
| 20 claves sobre el mismo agregado, IT final | Un éxito y 19 conflictos; 78 ms. |
| Duplicado con pool de cinco conexiones ocupado, IT final | Espera sin tomar conexión; 3.010 ms observados. |
| Duplicado en navegador, E2E final | 409/Retry-After y reintento de la misma clave; 3.061 ms de extremo a extremo. |

Los tiempos exteriores incluyen planificación, filtros y transporte; no son un
SLA universal de 3.000 ms ni evidencia de rendimiento productivo. La espera interna
está acotada y la prueba con pool ocupado evita confundir espera con saturación.

Un trigger de prueba falla entre efecto y registro: no queda efecto parcial y la
misma clave funciona al reintentar. Los tres resultados heredados PRESENTAR,
APROBAR y RECHAZAR se comparan exactamente antes/después de V6 y tras reiniciar
el contexto. Compose reinicia el backend, reautentica al mismo usuario porque
la firma local rota, y recupera el resultado persistido. Revocar permisos con un
JWT vigente impide replay y oculta GET. La caída real de PostgreSQL produce 503;
recuperarlo conserva el éxito. Respuesta descartada después de commit pasa en API;
la pérdida de red de navegador se verifica por separado en E2E.

## Recuperación Angular y accesibilidad

OperacionesSeguras comparte las siete acciones y un panel de estados accesibles.
Web Locks protege únicamente la reclamación del descriptor, no toda la petición.
El nombre de almacenamiento separa cuentas mediante SHA-256 del UUID del usuario;
el valor contiene solo clave, operación, recurso opcional y fecha. El TTL de
24 horas es cliente; nunca purga el éxito del servidor. Cuerpos y credenciales
no se añaden al almacenamiento; sessionStorage permanece vacío.

Los errores conservan la clave. Un GET completado limpia el descriptor, conserva
la confirmación terminal y permite abrir el recurso autorizado. Un 404 no acredita
ausencia de efecto. El formulario conserva en memoria el descriptor efectivamente
reclamado, incluso tras reemplazar la tarjeta del panel; queda bloqueado después
de confirmar y no envía otro POST aunque cambien asunto o fiscal. Una navegación
Angular real a una nueva alta permite otro intento con otra UUID. Los conflictos
definitivos conservan código/estado y no se presentan como éxito de la entrada rechazada.

E2E comprueba Enter, foco en Abrir resultado y ausencia de desbordamiento a
360/768/1440 px. El coordinador inspeccionó las capturas finales de ambos formularios
confirmados; mensajes/enlaces legibles y botones deshabilitados. Evidencia con
SHA-256 en [inspección visual](../../qa/evidencias/ag013/inspeccion-visual.json).
Esta revisión no equivale a una evaluación WCAG exhaustiva.

## Archivos y manifiesto de commits

El [manifiesto de entrega](../../qa/evidencias/ag013/entrega-manifiesto.json) enumera
cada archivo creado/modificado/eliminado y su SHA-256 frente a las capturas de
entrada. No es un diff Git. Cambios funcionales: paquete backend operaciones, V6,
adaptadores de proveedores/solicitudes/identidad/OpenAPI y sus pruebas; servicio,
panel, APIs, formularios y E2E Angular. Coordinación: SDD006/ADR0007, verificadores
QA, CI, índices, documentación de desarrollo/seguridad, informe y memoria.
La única adición007 es su especificación borrador, posterior a la puerta autorizada.
POM, package.json y lockfile permanecen idénticos; V1–V5 e históricos intactos.

El [manifiesto de commits](../../qa/evidencias/ag013/manifiesto-commits.json) propone
seis grupos para revisión y ejecución humanas: corrección documental de CI heredada;
SDD/ADR; backend/V6; frontend; QA/CI; documentación y evidencias. Incluye el log
AG-011 existente con sus bytes originales. No se ejecutó add, commit, push, creación
de rama, PR, integración ni despliegue.

## Riesgos y pendientes de entrega

- Sin purga automática: crecimiento O(éxitos con clave nueva), incluidos no-op.
  Vigilar `pg_total_relation_size`; 007/008 decidirán archivo/tombstone y retención
  jurídica sin inventar un plazo. El TTL cliente no elimina registros del servidor.
  Después de QA, 360 registros ficticios ocupan 311.296 bytes con índices; esta
  observación no constituye una estimación de capacidad productiva.
- EN_PROGRESO usa metadatos efímeros de una instancia; varias réplicas requieren
  diseño y pruebas adicionales. PostgreSQL mantiene unicidad y resultados durables.
- Se requiere Web Locks para iniciar mutaciones coordinadas entre pestañas; si no
  está disponible se informa de forma accesible y se permite recuperar pendientes.
- La cobertura OWASP, accesibilidad y carga es acotada. Auditorías de dependencias
  no equivalen a una auditoría de todo el sistema operativo ni a ausencia de fallos
  desconocidos. HTTPS público, operación y recuperación de desastres siguen fuera.
- Después del cierre local: revisión/aceptación humana, selección de cambios,
  commit/push, CI remota e integración. Ninguna aceptación ni integración por IA.
- Aclarar y aprobar007 antes de planificar. Los criterios HA-01–10 son propuestas;
  no hay implementación ni pruebas de007.

## Continuación documental007 y cierre

La [puerta007](../../qa/evidencias/ag013/puerta007.json) se registró antes de escribir:
006 completamente verificada, revisión sin hallazgos abiertos, documentación e
integridad PASS y537,298 minutos restantes a13:23:37,103+02:00. Se creó únicamente
la [especificación007](../../especificaciones/007-historial-auditoria/especificacion.md),
**Borrador pendiente de aprobación humana**. No se crearon plan, tareas, ADR,
migración ni código007. Se distinguen hechos anteriores, eventos de decisión y
registro de replay; quedan preguntas sobre catálogo, visibilidad, campos y retención.

Horario, CSV y MEMORY registran el cierre. El manifiesto final incluye cambios y
evidencias; el prefijo CSV anterior se conserva byte a byte. Los servicios Compose
permanecen detenidos, con volumen conservado. No quedan comprobaciones locales
exigidas pendientes; la CI remota, aceptación, integración y despliegue son humanos.
