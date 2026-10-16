# AG-015 — Corrección de la regresión remota de aprobaciones

**Estado:** CORRECCIÓN LOCAL VERIFICADA — PENDIENTE DE PUBLICACIÓN Y CI.
007 no está aceptado ni integrado. Publicación y nueva CI corresponden al humano.

## Encargo y referencia

El encargo autoriza diagnosticar y corregir exclusivamente el fallo de007,
conservar seguridad y contratos, realizar regresión y preparar entrega local.
Rama comprobada por lectura de metadatos: `feature/007-historial-auditoria`;
revisión `5e4024997215c23e24c3f648f0f53d8f68652e65`.
[PR6](https://github.com/JuanCarlosBP/gestion-solicitudes-asistida-por-ia/pull/6),
abierta en borrador hacia `feature/006-concurrencia-idempotencia`;
[run38814632990/job116696095705](https://github.com/JuanCarlosBP/gestion-solicitudes-asistida-por-ia/actions/runs/38814632990/job/116696095705).
Lectura remota mediante gh; ninguna escritura remota ni nueva autenticación.

Primer reloj observado:2026-10-16T00:39:46.4409128+02:00, después de lecturas iniciales.
Fin observado (corte documental):2026-10-16T01:08:09.1353237+02:00; duración00:28:22.6944109.
[Registro temporal](../../qa/evidencias/ag015/cierre.json). Después del corte se
comprueba y sella la entrega; no se atribuye tiempo anterior al primer reloj.
No hubo pausas humanas. Sí esperas de construcción/pruebas y una serie diagnóstica
interrumpida, registradas abajo; no se descuentan de la duración observada.

Roles reales: principal coordinador e implementador, único escritor; agentes
`planificacion_ag015` y `revision_ag015` independientes, de lectura por instrucciones.
Su sandbox era workspace-write: no se afirma aislamiento técnico de solo lectura.
Máximo tres agentes simultáneos. Se aplicaron las skills QA, revisión de seguridad
y mantenimiento documental. La autorización específica AG-015 cubre esta reparación;
no modifica requisitos, dependencias ni contratos de negocio.

## Síntoma remoto y diagnóstico causal

El remoto pasó backend/frontend y636 controles API. Playwright32/33; las diez
pruebas de historial pasaron. Falló `aprobaciones.spec.ts`, prueba484, aserción530:
esperaba[200,409], obtuvo[200,403]. Los controles posteriores de código409,
decisión única, versión y estado no se completaron en ese intento.
Documentación/secretos y actionlint/sintaxis quedaron OMITIDOS, no PASS.
[Metadatos remotos](../../qa/evidencias/ag015/run-remoto.json) y
[XML/captura del fallo original](../../qa/evidencias/ag015/remoto).

Se registró [hipótesis y plan](../../qa/evidencias/ag015/plan-diagnostico.md) antes de
corregir, y [causa/alcance](../../qa/evidencias/ag015/causa-y-alcance.md) antes de editar
producto. Se contrastaron CSRF, renovación, identidad/roles y defecto de fixture.

La [intercalación causal previa](../../qa/evidencias/ag015/antes-intercalada-una)
reproduce[200,403] con dos pestañas del mismo contexto y peticiones reales.
Se retiene el envío de un POST después de construir su cabecera; la otra pestaña
ejecuta un GET real de historial. Después se liberan los dos envíos de decisión
concurrentemente. No se cambian cabeceras, cuerpos, cookies ni respuestas, ni se
introducen sleeps o retries. Es instrumentación diagnóstica adicional; la prueba
original queda idéntica. No se afirma reconstruir el orden exacto de la CI remota.

El403 tiene cuerpo `ACCESO_NO_PERMITIDO`; cookie/cabecera XSRF están presentes
pero son distintas. Actor y rol SUPERVISOR coinciden, y las renovaciones200
concluyeron antes. El [emisor CsrfFilter](../../qa/evidencias/ag015/emisor-csrf.txt)
queda identificado en la variante con ambas cabeceras anteriores, que recibe403/403.
La evidencia pública registra presencia/igualdad/orden, nunca valores de tokens.
Esto confirma un defecto de producto reproducible, consistente con el síntoma
remoto; no atribuye el fallo al fixture por tener otras suites verdes.

Con Spring Security7.0.7, la configuración stateless conserva SessionManagementFilter.
Cada validación Bearer se interpreta como autenticación nueva para su estrategia
CSRF: borra y materializa la cookie. Un GET concurrente cambia así la cookie
compartida después de que Angular construya X-XSRF-TOKEN. El rechazo estricto es
correcto; la rotación por cada Bearer es la causa. Bytecode e instrumentación
reproducible en [reproducción](../../qa/evidencias/ag015/reproduccion).

## Corrección mínima y alternativas

Tres fuentes de producto cambian:

- `SeguridadTecnica.java`: la estrategia CSRF evita rotar por un JwtAuthenticationToken
  ya autenticado y delega al mecanismo estándar para otras autenticaciones.
  Se conserva materialización si falta cookie, matcher CSRF de métodos mutables,
  validación JWT/sid, reglas HTTP, method security y default deny.
- `RepositorioCsrfPorEntorno.java`: componente compartido y rotación explícita
  mediante CookieCsrfTokenRepository; atributos de cookie sin cambios.
- `ControladorAutenticacion.java`: rota XSRF en login correcto/logout real;
  renovación de la misma sesión conserva XSRF y mantiene la rotación estricta
  de refresh. Las dos cookies se agregan a la misma respuesta servlet, evitando
  que ResponseEntity sustituya Set-Cookie. Códigos/cuerpos públicos sin cambios.

Dos pruebas HTTP reales en IdentidadAccesoIT comprueban lecturas Bearer concurrentes,
cookie estable/materializada,403 ante cabecera ausente/distinta incluso con Bearer,
refresh sin rotación XSRF, login/logout con rotación y sin exponer XSRF en el cuerpo.
Dos slices WebMvc importan el componente real nuevo; sus aserciones no cambian.
Se añade un ejecutor backend conservador de recursos e informes por intento.

Descartadas: aceptar403, excluir Bearer de CSRF, serializar las decisiones,
separar contextos, reintentar o modificar credenciales para ocultar la carrera.
Sustituir toda la estrategia de sesión ampliaría el alcance; la opción
requireExplicitAuthenticationStrategy es incompatible con la configuración
actual. La rotación explícita cubre las fronteras del controlador propio.

No cambian frontend/E2E originales, workflow, dependencias, V1–V7 ni008.
La prueba original conserva[200,409], SOLICITUD_NO_DECIDIBLE, versión/estado y
decisión única. Sus diez casos crean UUID distintos; la comparación de BD
confirma diez solicitudes nuevas, versión3 y una decisión por solicitud.

## Verificación ejecutada

| Comprobación | Resultado y evidencia |
|---|---|
| Regresión causal HTTP antes | Dos pruebas:1 fallo+1 error, ambos esperados para demostrar el defecto. [Antes](../../qa/evidencias/ag015/backend-antes). |
| Regresión causal HTTP final |2/2 PASS. [Después02](../../qa/evidencias/ag015/backend-despues02). |
| Carrera causal navegador | Antes[200,403]; después[200,409] y SOLICITUD_NO_DECIDIBLE, controles finales completos. [Después](../../qa/evidencias/ag015/despues-intercalada). |
| Original enfocada | Diez ejecuciones consecutivas PASS, retries0, datos aislados. Directorios enfocada-01–10. [Control BD](../../qa/evidencias/ag015/serie-bd-control.json). No es garantía estadística. |
| E2E Windows final |33/33 PASS,0 omitidas/retries0. [windows-completa02](../../qa/evidencias/ag015/windows-completa02). Sustituye íntegramente la acreditación del primer intento. |
| E2E Linux complementario |24/24 PASS,0 omitidas entre los24 seleccionados/retries0. Incluye3 aprobaciones y10 historial; excluye operaciones.spec.ts (9casos), que contiene3 pruebas con acceso a Docker. [Linux](../../qa/evidencias/ag015/linux-complementaria). No equivale a la suite33 ni a CI remota. |
| Backend verify |249 PASS:122 unitarias+127IT,22 suites,0 fallos/errores/omitidas; Spotless PASS, SpotBugs0. [Completo02](../../qa/evidencias/ag015/backend-completo02). PostgreSQL Linux real en Docker. |
| Frontend |479 pruebas/23archivos PASS; tipos, lint, formato y build PASS. [Frontend](../../qa/evidencias/ag015/frontend). |
| API |636 PASS: sesiones88,proveedores78,solicitudes119,aprobaciones140,concurrencia67,historial144. [API final](../../qa/evidencias/ag015/api-final). |
| Compose | Persistencia tras stop/start; caída PostgreSQL503 real en2086ms, recuperación200 y navegador. [Resultado](../../qa/evidencias/ag015/api-final/compose-persistencia-caida.json). |
| Estáticos | actionlint,22 scripts Node y4 PowerShell PASS. [Resultado](../../qa/evidencias/ag015/estatico/resultados.json). Documentación/secretos PASS sobre entrega final en [cierre](../../qa/evidencias/ag015/cierre-final). |
| Correspondencia imagen/verify |133 clases de la imagen probada idénticas byte a byte a target/classes del verify final. [Comparación](../../qa/evidencias/ag015/imagen-vs-verify.json), [identidad Compose](../../qa/evidencias/ag015/compose-final-identidad.txt), [imágenes](../../qa/evidencias/ag015/imagenes-ejecucion.txt). |

Se siguió el orden Compose→sesiones→proveedores→solicitudes→aprobaciones→concurrencia→
historial del workflow y sus usuarios E2E_AJENO_CORREO/E2E_MULTIPLE_CORREO/fixture
de historial. Entorno ficticio .env.example y BASE_URL18081. Los proyectos
`gestion-solicitudes-ag015` y `gestion-solicitudes-ag015-final` separan antes/después.
El manifiesto complementario enlaza estas ejecuciones con fuentes e imagen;
los metadatos de imagen se observaron al cierre, no se inventan capturas previas.

### Cobertura636 frente a639 y reutilización

El remoto y AG-015 usan el fixture sintético de CI:492 heredados+144historial=636.
AG-014 local tenía492+147=639. Su fixture de dos solicitudes anteriores aporta
cuatro controles HA01/HA03; el sintético aporta uno: diferencia de tres.
E2E_HISTORIAL_ANTERIOR_DECISION no se activó en AG-015. El nombre HA-E2E07 no
demuestra aquí una decisión anterior a V7: esa aserción condicional pertenece
al recorrido histórico de AG-014 con la variable activada.

No se repitió la copia/migración V6→V7. Se reutiliza su evidencia histórica
porque V1–V7 y el código funcional de historial no cambian, comprobado con SHA-256;
verify y API vuelven a cubrir migración de base nueva, atomicidad y permisos.
Auditorías OSV/npm y análisis visual de AG-014 se conservan como históricos sobre
dependencias/frontend sin cambios; no se presentan como consultas nuevas ni como
evaluación integral de seguridad/accesibilidad. No se reutiliza AG-014 para acreditar
el nuevo comportamiento de CSRF: tiene pruebas específicas y regresión completa.

## Intentos fallidos e incidencias conservadas

1. Antes original/observada y serie01–02 pasaron: la carrera depende del orden.
   Serie diagnóstica03 agotó120s al esperar callbacks del observador tras cerrar
   páginas;04 se interrumpió,05–10 no se ejecutaron. No se cuentan como diez finales.
   Se corrigió el observador para guardar eventos disponibles sin bloquear el cierre.
2. `antes-intercalada` pasó sin intercalación porque el generador falló al casar
   saltos de línea. Se conserva ese intento con su límite. Las variantes posteriores
   con dos cabeceras anteriores dieron403/403; la variante una reproduce200/403.
   La primera configuración DEBUG no activó el logger por diferencias de mayúsculas;
   emisor02 sí lo activó. No se modifica el resultado original de ninguno.
3. Ciclo1 de producto arregló lecturas Bearer, pero la nueva prueba de login mostró
   que ResponseEntity sustituía Set-Cookie. Ciclo2 agrega ambas cookies en servlet:
   ambas regresiones PASS. No hubo un tercer ciclo del mismo hallazgo.
4. El primer verify completo encontró9 errores de inyección en dos slices WebMvc.
   Se importó el repositorio real, sin cambiar aserciones; el segundo verify249 PASS.
   Es un hallazgo separado de cableado de tests, corregido una vez.
5. Primer Windows completo:31 PASS/2 errores SQL porque el lanzador no transmitió
   COMPOSE_PROJECT_NAME. Además, el caso de reinicio actuó sobre el backend previo
   `gestion-solicitudes-001-backend-1`: arrancó00:56:24 y terminó00:56:31 con salida1,
   mientras su PostgreSQL seguía detenido. Falló al conectar (UnknownHostException:
   postgres). Es una desviación de aislamiento de impacto alto; no se afirma que
   el recurso previo quedó intacto: cambiaron ciclo de vida y logs. No se observó
   conexión a BD; esto no sustituye una auditoría completa del volumen previo.
   [Estado](../../qa/evidencias/ag015/incidente-aislamiento-estado.txt),
   [diagnóstico sanitizado](../../qa/evidencias/ag015/incidente-aislamiento-diagnostico.txt)
   y [lanzador anterior](../../qa/evidencias/ag015/lanzador-windows-primer-intento.txt).
   El PASS de reinicio de ese intento no acredita el reinicio del producto probado.
   El lanzador final exige los tres contenedores y las etiquetas del proyecto propio;
   Windows completo02 repitió correctamente los33 casos. Se informó al usuario.
6. La revisión automática de aprobación rechazó montar el socket Docker en el
   ejecutor Linux por conceder control amplio del host. No se ejecutó ese montaje
   ni se eludió mediante intermediarios. Se ejecutaron24 E2E Linux sin socket;
   operaciones.spec.ts se excluyó completo (9casos,3 con acceso a Docker), y sus
   nueve casos están acreditados en Windows. La imagen auxiliar de
   CLI ya construida queda retenida, sin usarla para sortear el rechazo.
7. Desviación inicial: se ejecutó `git status --short` antes de leer la prohibición
   del adjunto; salida vacía. Ningún Git posterior ni escrituras Git. Se comunicó;
   no se presenta la sesión como exenta de comandos Git.

Los registros brutos privados permanecen en tmp/ag015 y no son entregables.
La evidencia nueva usa .txt, no .log; .gitignore no cambia. No se normalizan XML,
capturas ni salidas para corregir formato. EOF/espacios se controlan en fuentes
editables; evidencia bruta se sella conservando bytes.

## Entrega, límites y siguiente paso

El [manifiesto exhaustivo](../../qa/evidencias/ag015/manifiesto-commits.json)
enumera todos los archivos nuevos/modificados con grupos, mensajeSugerido y rutas
de texto únicas; la [integridad](../../qa/evidencias/ag015/entrega-integridad.json)
contiene SHA-256. [SHA256SUMS](../../qa/evidencias/ag015/SHA256SUMS.txt) sella esos
dos documentos. La integridad excluye únicamente su propio archivo y ese sello
para evitar autorreferencia; la respuesta de entrega aporta el SHA-256 del sello.
No son commits realizados: todos los comandos Git de entrega quedan al humano.
Fuentes de producto:3; pruebas:3; ejecutor backend:1; documentación de estado,
memoria, CSV y evidencia nueva. No elimina archivos históricos ni recursos Docker.
La [preservación de fuentes](../../qa/evidencias/ag015/preservacion-fuentes.json)
comprueba2211 archivos protegidos sin cambios, sin ausentes, y el prefijo histórico
del CSV íntegro. La [preservación Docker](../../qa/evidencias/ag015/preservacion-docker.json)
verifica52 contenedores detenidos,32 volúmenes y26 imágenes, ningún previo ausente;
no confunde presencia de IDs/nombres con inmutabilidad del backend previo afectado.
[Formato editable](../../qa/evidencias/ag015/formato-fuentes.json),
[secretos complementario](../../qa/evidencias/ag015/secretos-complementario.json)
y [correspondencia de ejecuciones](../../qa/evidencias/ag015/correspondencia-ejecuciones.json)
aportan controles sobre la entrega, sin normalizar evidencia bruta.

La [revisión independiente](../../qa/evidencias/ag015/revision-independiente.md)
concluye sin hallazgos materiales abiertos de producto/seguridad en su alcance.
El incidente alto de aislamiento queda declarado y corregido en el lanzador;
no se convierte en aceptación humana ni en garantía de inmutabilidad del previo.
La comprobación exacta de hashes se realiza tras cerrar los metadatos de entrega.
Persisten límites: no garantía estadística de ausencia de carreras; login/logout
concurrentes son fronteras reales que pueden invalidar peticiones en vuelo;
refresh reutilizado conserva cierre seguro, sin nueva coordinación entre pestañas.
Linux24 no sustituye CI33; publicación, CI y aceptación permanecen pendientes.

008: tercera opción aprobada conceptualmente (un VPS, una instancia Java,
un PostgreSQL y bases temporales separadas). Prototipo y comparación2GB/1vCPU
frente a4GB/2vCPU después del cierre007; sin cambios en008 en esta reparación.

La persona responsable revisará cambios e incidentes, publicará la corrección,
verificará la nueva CI y decidirá la aceptación de007. El agente se detendrá
después de la entrega local; no hace add/commit/push/PR/integración/despliegue.
