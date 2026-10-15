# Informe AG-014 — Historial y auditoría 007

**Estado:** 007 implementado y HA-01–10 verificados localmente, con revisión independiente sin hallazgos materiales abiertos.
**Autorización:** [encargo humano](../../qa/evidencias/ag014/encargo-humano.txt), D-007-01–10,
y respuestas de reanudación del usuario. No se declara aceptación, integración ni despliegue.

## Horario, autorización y conservación

Primer reloj observado: 2026-10-15T20:09:15+02:00, después de las lecturas iniciales.
Límite conservador: 2026-10-16T04:05:00+02:00, Europe/Madrid. El inicio anterior
no se reconstruye con precisión inventada. [Cierre parcial](../../qa/evidencias/ag014/cierre.json)
a20:42:08, duración observada00:32:53. Reanudación a21:43:51 por indicación humana,
dentro de la misma ventana. El cierre final distinguirá duración total y pausa.
Reconocimiento inicial:11min24s; construcción básica superada antes de implementar.

El usuario reparó Docker reiniciando WSL y abriendo Docker Desktop, y autorizó
npm audit exclusivamente contra registry.npmjs.org con la información necesaria
de dependencias. El agente no eliminó sockets ni usó Reset to factory defaults.
Se conservan los intentos fallidos, la auditoría OSV local y el cierre parcial.
Las nuevas evidencias están en [reanudacion](../../qa/evidencias/ag014/reanudacion).

Trabajo exclusivamente en el workspace; las herramientas instaladas y el adjunto
humano fueron entradas de lectura. Rama confirmada leyendo .git/HEAD:
feature/007-historial-auditoria. **Desviación inicial:** se ejecutó git status --short
antes de leer la prohibición adjunta; salida vacía. No hubo comandos Git posteriores,
escrituras Git, staging, commits, cambios de rama, push, PR, integración ni despliegue.
La consulta de CI mediante API y la lectura de .git/HEAD no ejecutaron Git.

## Entrega y contrato

[Especificación](../../especificaciones/007-historial-auditoria/especificacion.md),
[plan](../../especificaciones/007-historial-auditoria/plan.md),
[tareas](../../especificaciones/007-historial-auditoria/tareas.md),
[validación HA-01–10](../../especificaciones/007-historial-auditoria/validacion.md)
y [ADR-0008](../decisiones/ADR-0008-historial-de-negocio-y-consulta.md).
La aprobación D-007 sustituye el antiguo límite de borrador y de auditoría global.
No se modifica el contrato de los incrementos 001–006.

V7 añade eventos mínimos para crear/modificar/desactivar/reactivar proveedores y
crear/guardar/presentar solicitudes, en la misma transacción del cambio y del resultado
idempotente. APROBADA/RECHAZADA se proyectan únicamente desde la fuente autoritativa
V5. Sin backfill, eventos por lectura/replay/no-op ni duplicación de decisiones.
Un PUT válido con nueva versión mantiene el contrato de guardado heredado.

El módulo Java separa HTTP, aplicación, dominio y persistencia. Los cuatro GET son
/api/solicitudes/{id}/historial, /api/proveedores/{id}/historial, /api/historial y
/api/resumen. Roles actuales, unión multirrol y conteos tras aplicar visibilidad;
supervisor sin borradores ajenos, global/proveedor solo auditor o administrador.
Recurso oculto/inexistente404; global sin permiso403; sin identidad401; filtros inválidos400.
Página0, tamaño20 por defecto/máximo100, desplazamiento máximo100000, UUID/fechas
ISO con offset, filtros cerrados y orden por fecha/clave prefijada descendente.
Cada respuesta es coherente; offset entre peticiones no promete snapshot concurrente.

La proyección no incluye fiscal/contactos, descripción/conceptos, textos de decisiones,
secretos, cuerpos HTTP, hashes ni claves idempotentes. El detalle autorizado V5
conserva comentario/motivo. App SELECT/INSERT, sin UPDATE/DELETE; un administrador
BD puede alterar datos. No se afirma integridad criptográfica ni retención jurídica.

Angular integra timeline en detalles, rutas directas y global, filtros/paginación URL,
resumen real y estados de carga/vacío/error/sin acceso/historia anterior desconocida.
Mantiene el sistema visual, sin dependencias nuevas ni controles para editar/borrar eventos.

## Coordinación y pruebas

Planificador en lectura; implementadores backend/frontend con un escritor por archivo;
revisor independiente en lectura; coordinador responsable de SDD, QA, CI y documentos.
Máximo tres subagentes simultáneos. La restricción read-only fue por instrucciones,
no un aislamiento técnico demostrado. El revisor no reparó el código que revisó.

| Comprobación | Resultado observado |
|---|---|
| Backend completo |247 pruebas:122 unitarias y125 PostgreSQL IT;0 fallos/errores/omitidas;22 suites. Spotless PASS, SpotBugs0. |
| Historial enfocado |13 IT nuevas PASS; las112 IT heredadas también pasan en verify. |
| Angular |479 pruebas/23 archivos, tipos/lint/formato/build PASS; correcciones posteriores verificadas por su evidencia. |
| E2E final |33 PASS en55,4s,0 fallos/errores/omitidas, retries0;10 recorridos007 y regresión001–006, decisión anterior V5 real. |
| Accesibilidad acotada |12 capturas revisadas a360/768/1440;42 muestras de contraste, mínimo5,53:1; teclado y foco3px solid, sin desbordamiento horizontal. |
| API 007 |147 controles PASS sobre PostgreSQL real. |
| Regresión API 001–006 |492 controles PASS: sesiones88, proveedores78, solicitudes119, aprobaciones140, concurrencia67. |
| V6→V7 |Copia ficticia preservada: siete tablas, columnas y huellas/checksums intactos; V7 inicialmente vacía, sin backfill. Original V6 comprobado de nuevo sin cambios. |
| Docker/Compose |Motor29.1.3, Compose2.40.3; construcción sin caché. Persistencia stop/start,503 real por caída PostgreSQL y recuperación200, también en navegador. |
| OpenAPI |Documento generado en aplicación real:3.1.0,21 rutas, cuatro GET nuevos y respuestas verificadas. |
| npm audit |Producción y completo al registro oficial:0 vulnerabilidades notificadas. Los fallos anteriores se conservan por separado. |
| OSV local |132 componentes Maven;7 npm producción/653 completo,0 avisos listados con bases públicas actualizadas. No equivale a auditoría del SO. |
| QA/CI estáticos |Actionlint y sintaxis Node/PowerShell PASS. CI007 remota pendiente de push humano. |

Fuentes de resultados: [backend](../../qa/evidencias/ag014/reanudacion/backend-resumen-final.json),
[API007](../../qa/evidencias/ag014/reanudacion/api007-01/historial-api.json),
[regresión API](../../qa/evidencias/ag014/reanudacion/api-regresion-01),
[migración](../../qa/evidencias/ag014/reanudacion/evolucion-v7),
[original V6](../../qa/evidencias/ag014/reanudacion/original-v6-salida/verificacion-original.json),
[frontend y auditorías npm](../../qa/evidencias/ag014/reanudacion/frontend),
[OpenAPI](../../qa/evidencias/ag014/reanudacion/openapi007-control.json),
[controles estáticos](../../qa/evidencias/ag014/reanudacion/estatico-final-01.json).

[Ejecución E2E final](../../qa/evidencias/ag014/reanudacion/frontend/e2e-05/ejecucion.json),
[capturas](../../qa/evidencias/ag014/reanudacion/frontend/e2e-05/capturas),
[contrastes y teclado](../../qa/evidencias/ag014/reanudacion/frontend/e2e-05/capturas/frontend007-contrastes.json)
y [revisión visual](../../qa/evidencias/ag014/reanudacion/frontend/revision-visual-final.md).
La imagen final ui06 corresponde a main-WKPT366M.js y styles-6GABB4AX.css;
33 huellas de fuentes frontend y130 backend identifican lo probado.

Las IT prueban rollback conjunto de evento/negocio/resultado idempotente, carreras
con igual/distinta clave, replay sin duplicar, no-op, restricciones de esquema y
privilegios, revocación con JWT previo, unión multirrol, privacidad, filtros/empates,
conteos, reinicio y decisiones anteriores. Las pruebas escritas y las ejecutadas
se distinguen en los reportes de cada intento; los intentos anteriores no se borran.

## Entorno, fallos y soluciones

Maven inicial: ruta/caché corregidas dentro del workspace. Mockito autoattach falló
por pipe Windows; javaagent ya disponible permitió ejecutar las pruebas sin nuevas
dependencias. SpotBugs señaló tres referencias a colaboradores Spring compartidos;
exclusiones estrictas por clase/constructor/campo/patrón revisadas, resultado posterior0.

Docker fallaba por socket temporal externo antes de la reparación manual humana.
Tras ella, docker info/ps desde sandbox fallaban con permission denied al pipe;
con acceso autorizado respondieron correctamente. No se borró ningún recurso.
Una sonda de cierre usó por error /api/estado y obtuvo401; /api/salud devolvió200
con acceso al puerto local. Las dos incidencias y la sonda correcta se conservan.

Para no eliminar contenedores existentes se creó un proyecto QA con una copia
pg_dump/pg_restore de la base ficticia V6. La restauración omitió únicamente CREATE
SCHEMA porque el esquema/roles ya estaban inicializados. Se verificó igualdad antes
de migrar. El original se conservó y volvió a comprobarse. Cada frontend corregido
usa un contenedor nuevo, reteniendo detenido el anterior; ui02 creó además una red
 y un volumen vacíos que también se conservan. Esto no añade otra BD a la arquitectura.

Testcontainers usa un modo optativo de conservación, limitado a su versión2.0.5:
UUID único por instancia, sin compartir datos ni registrar limpieza; once contenedores
QA detenidos con sus volúmenes. Ocho IT solo cambiaron factory/import: inversión en
memoria confirma8/8 huellas originales, sin modificar aserciones. El primer guard
leyó un paquete sin Implementation-Version y falló antes de crear recursos; corregido
al paquete DockerClientFactory,13 IT enfocadas y verify completo PASS.

npm audit no se ejecutó inicialmente por DNS/rechazo automático de envío del inventario.
Tras autorización expresa del destino y contenido, se ejecutaron ambas auditorías.
OSV previo se conserva como evidencia distinta, sin presentarlo como aquel npm audit.

E2E01:25 PASS/8 fallos. Se corrigieron etiquetas explícitas y selección inicial del
filtro; Swagger esperaba17 rutas en vez de21; dos localizadores de éxito ambiguos
se delimitaron manteniendo las mismas aserciones. La búsqueda de proveedores espera
la preparación del formulario y comprueba valor/URL/resultados. El replay manual usa
un contexto API aislado con la misma sesión, clave, cuerpo y Bearer, sin relogin ni
cambio de backend; mantiene201 y DTO idéntico. Una carrera CSRF era hipótesis, no
causa demostrada: solo se conservan indicadores booleanos, nunca tokens/cookies.

La revisión detectó Restablecer con controles editados y URL ya predeterminada:
regresión reproducida y corregida sincronizando controles;479 pruebas Angular PASS.
E2E02:32 PASS/1 fallo de foco. Diagnóstico confirmó que CSP bloqueaba onload del CSS
crítico de Angular; inlineCritical=false carga CSS normal sin debilitar CSP.
E2E03 supera foco3px y falla contraste durante el cambio de estado del botón.
Diez frames confirman contraste transitorio mínimo1,05 frente a7,77 estable;
la primera corrección elimina la transición en botones habilitados del timeline.
E2E04:33 PASS sin reintentos, pero la revisión visual detecta el mismo fenómeno
en botones habilitados del resumen (mínimo1,29; no es exención por estar deshabilitados).
La segunda corrección elimina esa transición en button:enabled del estilo compartido;
los enlaces conservan su animación. HA-E2E10 recarga resumen/salud, exige ambos
botones habilitados y mide su contraste. E2E05 final33 PASS y42 muestras superadas;
revisión visual de12 capturas cierra los hallazgos. No hubo un tercer ciclo del mismo fallo.

## Medidas y límites

V7 vacía:49152bytes con índices. IT:251 eventos,311296bytes, página20 en10ms en
verify y11ms en ejecución enfocada. Compose:10 eventos V7 y68 decisiones V5,
106496bytes de V7;20 GET size100 entre5,34 y13,68ms, media7,44ms.
[Medición](../../qa/evidencias/ag014/reanudacion/api007-01/historial-medicion.json).
Carga local pequeña/ficticia y posible caché; no SLA, capacidad productiva ni extrapolación lineal.

Sin purga ni plazo legal inventado. Pendientes decisiones humanas de retención,
operación pública, carga real, auditoría integral OWASP/ASVS/WCAG y gestión de claves.
La variante sintética de CI no acredita decisión anterior V5 en navegador: la
verificación local exige el recurso procedente de V6 y E2E_HISTORIAL_ANTERIOR_DECISION=true.
CI heredada PR4/PR5 verde corresponde a001–006; no acredita007 sin publicar.

## Conservación y cierre

[Compose final](../../qa/evidencias/ag014/reanudacion/compose-final-01/resultado.json):
reinicio de backend/PostgreSQL/ui06 con nueve tablas y sus huellas intactas;
503 real en2001ms,200 tras recuperación y ambos estados comprobados en navegador.
Se detuvieron los servicios QA al terminar, sin eliminar recursos.
[Inventario final](../../qa/evidencias/ag014/reanudacion/conservacion-final.json):
los11 contenedores,4 volúmenes y13 imágenes previos siguen presentes; total final
30 contenedores detenidos,17 volúmenes y20 imágenes. Ningún recurso previo ausente.

[Revisión independiente final](../../qa/evidencias/ag014/reanudacion/revision-final.md):
HA-01–10 verificados localmente. Recálculo de287 fuentes,431 artefactos frontend y
1454 archivos protegidos sin diferencias; prefijoCSV intacto. La revisión fue de
lectura, huellas e imágenes, sin ejecutar pruebas ni reparar por el revisor.

La [puerta008](../../qa/evidencias/ag014/reanudacion/puerta008.json) se cumplió
a22:17:38+02:00, con347,351 minutos restantes. Se creó únicamente el
[borrador008](../../especificaciones/008-demo-operacion-entrega/especificacion.md):
demo, Javadoc/manuales, cuentas ficticias, copias/restore, retención/limpieza y
pruebas desde Internet. Cloudflare Pages Free, Render siempre activo y Neon Free
son candidatas sin condiciones/precios verificados. No hay plan aprobado, código008,
cuentas externas, contratación, DNS, migración real ni publicación.

La persona responsable realizará selección de commits, Git, CI remota, aceptación,
integración y despliegue, y aclarará/aprobará008 antes de cualquier implementación.

## Cierre registrado y manifiestos

Cierre de contenido: 2026-10-15T22:20:54.0000000+02:00, Europe/Madrid. Duración total observada desde el primer
reloj: 02:11:39, incluida la pausa entre turnos de01:01:43. Suma de los dos periodos
observados: 01:09:56; no es medida de tiempo CPU ni una reconstrucción del inicio
anterior al reloj. Los controles documentales/manifiestos se ejecutan inmediatamente
después de registrar este cierre, dentro de la ventana.

[Cierre final y manifiestos](../../qa/evidencias/ag014/reanudacion/cierre-final/)
conservan horario, resultados, integridad, relación exhaustiva de archivos creados/
modificados/eliminados y huellas finales. Es comparación SHA256 desde la entrada,
no diff Git. El manifiesto semántico propone grupos para ejecución humana:
SDD/ADR007; backend/V7; Angular; QA/CI; borrador008; documentación/evidencia AG-014.
Incluye las salidas autogeneradas de cada etapa; no ejecuta Git.

El registroCSV conserva la fila parcial y añade AG-014-REANUDACION. MEMORY resume
el estado final. Los controles de enlaces y patrones de secretos son acotados;
no garantizan ausencia de cualquier secreto. No se alteran AG003–013 ni V1–V6.

El control del registro detectó que una concatenación PowerShell fragmentaba el
campo de resultado de la nueva fila. Se corrigió solo esa fila mediante serialización
CSV de once cadenas; los42676bytes anteriores, incluida la fila parcial AG-014,
permanecen idénticos. El primer intento de reparación no llegó a escribir por la
conversión automática de una fecha a DateTime. Se conservan la fila fallida y los
manifiestos previos al ajuste en el directorio final. El control específico
registro-csv-control.json registra la causa, solución y comprobación del prefijo.
El horario de fin de las comprobaciones posteriores figura en verificaciones-finales.json.
