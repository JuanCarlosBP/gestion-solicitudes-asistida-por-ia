# Plan técnico008 — AG-016

**Estado: concreción autorizada por AG-016; implementación tras revisión independiente.**
No es aceptación ni evidencia de pruebas. Alcance: [especificación](especificacion.md).

## Arquitectura y contratos

Un servidor Java de aplicación, Angular/nginx y PostgreSQL. Utilidad de provisión
sin HTTP en el mismo artefacto; JVM auxiliar persistente sin HTTP, no por visitante.
Incluida en presupuesto cuando se ejecuta. Ninguna dependencia nueva prevista.
Módulo demo independiente y activación explícita; comportamiento001–007 fuera
de demo conservado. V1–V7 intactas y Flyway desactivado en servidor demo.

Control operativo en `ag016_control`, separado de bases ficticias
`ag016_demo_01`, `ag016_demo_02`, `ag016_demo_03`; restauración únicamente a
`ag016_restore_qa` nueva. Inventario cerrado, configurable por operador dentro
de prefijo AG-016 local. No usar nombres del cliente. Control nunca se recicla.
Un usuario runtime por BD miembro de gestion_app NOLOGIN; este rol recibe
privilegios de objetos de V1–V7 pero jamás CONNECT. Revocar PUBLIC en bases de aplicación/control/postgres del laboratorio;
no modificar template0/template1. pg_hba cerrado deniega a runtime cualquier
destino ajeno, incluidas plantillas cuyo ACL de PUBLIC permanece sin alterar.
Verificar ACL y acceso efectivo como controles distintos, junto a privilegios globales.

### Contrato HTTP fijado para escritores

| Método/ruta | Entrada/salida |
|---|---|
| GET /api/demo | 200: {habilitada:true,cupo:3,duracionMinutos:60,disponibles:n}. Perfil sin demo:404; UI explica indisponibilidad. Sin datos internos ni credenciales. |
| POST /api/demo/reservas | Sin cuerpo de selección; CSRF. 201 con ReservaDemo y cookie DEMO-RESERVA HttpOnly/SameSite Strict/Path=/api; Secure en público. Cookie aleatoria256bits, solo hash persistido. Cuarta reserva:409 DEMO_CAPACIDAD_OCUPADA. Cookie vigente reusa su reserva sin extender plazo. |
| GET /api/demo/reserva | Cookie válida y selector; 200 ReservaDemo. Sin válida:401 DEMO_RESERVA_INVALIDA. |
| POST /api/demo/acceso | {rol:"SOLICITANTE"\|"SUPERVISOR"\|"AUDITOR"}; cookie/contexto/CSRF. Invoca autenticación existente con cuenta temporal real (Argon2, sid, refresh, JWT); contrato Acceso existente. No vía de bypass ni contraseña en respuesta. |
| POST /api/demo/reserva/liberar | Cookie/contexto/CSRF; revoca e inicia drenaje;204. Limpia cookies de reserva/identidad, cliente limpia sesión. |

ReservaDemo = {reservaId:UUID,espacio:string,generacion:UUID,expiraEn:ISO8601}.
Selector X-Demo-Contexto = `espacio:generacion:reservaId`. Obligatorio en negocio,
identidad y rutas de reserva propia/acceso/liberar; no autoriza por sí mismo.
GET csrf, salud, presentación y creación de reserva no requieren selector.
Ausencia/caducidad/manipulación:401 DEMO_RESERVA_INVALIDA antes de JDBC negocio.
Errores usan contrato actual de problemas; capacidades/estados internos no se filtran.

Filtro demo antes del procesamiento Bearer. Valida hash cookie+selector+reserva
persistida; instala ThreadLocal inmutable, siempre elimina en finally. Rechaza
el uso de contexto implícito. En rutas públicas de bootstrap (GET /api/demo,
POST /api/demo/reservas, GET csrf y salud), el cliente no envía Bearer y el
resolver Bearer del perfil demo lo ignora: permitAll por sí solo no evita su
validación ni la consulta de sid. Probar JWT viejo en esas rutas y comprobar
que ninguna consulta de negocio sucede sin ámbito.
El filtro rechaza
dispatch asíncrono de negocio; no herencia a hilos. DataSource de negocio estricto
sin default; pools independientes por espacio/generación, máximo inicial3 cada
uno, control2 (total runtime11). Provisión máximo2 adicionales, techo13.
Destinos y usuarios solo desde configuración validada. Salud usa control y no
necesita inventar contexto. JWT contiene demo_reserva/demo_espacio/demo_generacion;
compararlos antes de consultar sid. Acotar sesión/refresh al fin de reserva.
Mantener CSRF AG-015, autorización vigente y auditoría existente.

### Preparación y ciclo de vida

PREPARANDO → LISTO → RESERVADO → DRENANDO → RECICLABLE → PREPARANDO.
Fallo: BLOQUEADO. Estados persistentes y eventos operativos append-only.
Generación UUID nueva, usuarios UUID nuevos, cero sesiones/tokens. Cuentas
solicitante/supervisor/auditor y proveedores ficticios preparados antes de LISTO.

HMAC-SHA256 estándar, semilla externa >=32bytes, mensaje versionado con
espacio/generación/rol; contraseñas Base64URL completas, Argon2 actual sin cambios.
Clave HMAC nunca pública; no es contraseña universal. Backend deriva solo para
autenticar una reserva validada; no devuelve ni persiste contraseña reversible.
Provisión comparte referencia de semilla, no credenciales runtime de otros fines.
No rotar semilla mientras haya generaciones vivas sin transición/revocación.

Gate lectura/escritura por espacio: admisión síncrona mantiene lectura durante
petición, sin retener conexión control. Expiración/revocación cierra admisiones;
operaciones admitidas terminan/revierten en BD vieja. Exclusión de escritura
cierra pool y confirma drenaje antes de RECICLABLE. Provisión externa verifica
estado/generación, ausencia reserva vigente y actividad PostgreSQL; reclama
atómicamente antes de recrear. No confiar en contador perdido tras reinicio.
Reconciliar persistencia y conexiones; duda/fallo deja BLOQUEADO. Provisión única
con bloqueo y estados CAS; nunca automatizar destrucción de control/QA/origen.
Identidad migradora externa al HTTP; sin socket Docker.
El servicio provisionador mantiene una JVM auxiliar sin HTTP con sondeo cada2s;
no se crea una JVM por visitante. El bootstrap inicial exige una llamada explícita.
Solo ejecuta un lote al encontrar RECICLABLE; un fallo deja BLOQUEADO sin reparación
automática, mientras el supervisor continúa atendiendo otros espacios elegibles.

### Frontend

Ruta /demo con presentación, reserva, tiempo restante y guías por rol de3–4pasos.
Botones llaman POST /api/demo/acceso con servicio de autenticación real y
serializan cambios de rol/cookies como login actual. Sin administrador.
Contexto no secreto en sessionStorage por pestaña, validado como formato solamente;
autoridad siempre servidor. No persistir tokens/contraseñas/cuerpos.
Interceptor incluye selector en /api del mismo origen. Contexto/reserva/generación
y época de sesión evitan respuestas tardías; no adoptar automáticamente reserva
nueva desde otra pestaña. Aislar localStorage/Web Locks/mapas por contexto+usuario.
Perfil no demo conserva contratos/pruebas originales; demo muestra indisponibilidad
si API no está habilitada.

### Operación y límites

Compose nuevo en infraestructura/demo, proyecto obligatorio
gestion-solicitudes-ag016; loopback18086 para web local, PostgreSQL sin puerto público.
Secretos generados fuera de Git mediante archivos ignorados; RSA persistente
también local demo para comprobar reinicio. Proxy mismo origen /api, límites de
cuerpo/tasa y cabeceras, perfil TLS público separado con rutas a certificados.
Cupo/TTL/pools/concurrencia/tasas/tamaño BD configurables; umbral almacenamiento
bloquea nuevas escrituras/reservas, nunca purga eventos. Dimensionar tras QA.
El límite solo afecta admisiones/mutaciones de negocio; siempre permite revocar,
liberar, drenar y registrar esos eventos en control, con capacidad reservada.
Probar el límite sin impedir estas operaciones de seguridad.

Scripts requieren COMPOSE_PROJECT_NAME, fichero Compose y variables completas;
inspeccionan ID, servicio y etiqueta antes de mutar un servicio. Coordinador único
dueño Docker. No tocar recursos anteriores. Copia consistente pg_dump y restore
a QA nueva; cotejo datos/permisos/V5/V7; preservar control/logs operación.
QA queda fuera de destinos runtime y sin CONNECT de roles demo. La copia puede
contener sesiones vivas, pero antes de habilitar cualquier acceso a QA se invalidan
sesiones/refresh en QA; nunca se reactivan credenciales copiadas. Conservar negocio,
historial e idempotencia y comprobar rechazo de tokens copiados. Fuente intacta.
Rollback solo a versión compatible con esquema; no bajar migraciones ni restaurar
sobre fuente. RPO/RTO/retención quedan propuestos y tiempos medidos.

La comprobación de recuperación incluye una ejecución separada que lee la copia
cifrada ya guardada y su clave externa. Un helper independiente puede restaurarla
en `ag016_restore_qa`, nueva y ya incluida en el inventario técnico, sin cambiar
el arnés congelado de las cuatro pasadas. Cotejará el snapshot contra sus agregados
guardados y la fuente actual contra su estado inmediatamente anterior; invalidará
sesiones y refresh copiados y verificará CONNECT. Se ejecutará fuera de las ventanas
de carga. El rollback queda como procedimiento propuesto, condicionado a una imagen
compatible; no se atribuye un ensayo de downgrade que no se haya realizado.

## Hitos y verificación

1. Cierre documental007 y base/inventario. SDD/ADR/contrato, revisión independiente.
2. Backend+frontend en rutas disjuntas, infraestructura y pruebas enfocadas.
3. AIS-01–09: A/B, selectores, credenciales antiguas, roles, pools, caducidad en
   vuelo, reinicio, cupo y fallo reciclaje. Después regresión001–007 y suite final.
4. Leer protocolo adjunto, construir imágenes fuera de envolvente y ejecutar
   A/B dos pasadas completas secuenciales con medidas por operación/conjunto.
   C solo si ambos fallan. Si bloqueo esencial, declararlo sin PASS inventado.
5. Revisión final, manuales públicos, manifiesto/hash/sello sin duplicación
   innecesaria y entrega con pendientes para VPS. No Git/publicación.

## Concreción de carga tras lectura del protocolo

Semilla del generador:160082026. Por espacio20proveedores y100solicitudes de5conceptos;
60borradores,20presentadas,10aprobadas,10rechazadas, creadas por API/cuentas reales.
Sin inventar eventos pasados. Datos de semilla fuera de las ventanas y tiempos aparte.
Nominal: tres visitantes, cada uno un recorrido cada30s; pico: cada10s, mismos espacios.
Un recorrido usa solicitante→crear/editar/presentar/refresh; supervisor→decidir;
auditor→historial/resumen; cierres/cambios de cuenta reales. La mezcla exacta, conteos
y pausas se fijan en el arnés antes de ejecutar. Ráfagas de abuso/sobrecupo se separan
de recorridos útiles y sus429/409esperados no inflan throughput. No adaptar a posteriori.
Arranque frío objetivo≤90s,100%recorridos nominales válidos y cero5xx/timeouts
imprevistos; sin swap sostenido. Propuesta de RPO operativo24h/RTO30min solo para
revisión humana; ensayo medirá duración real y no los considerará compromisos.

Cada restore usa QA nueva de la lista cerrada de
[inventario](../../qa/evidencias/ag016/inventario-autorizado.json): sufijos funcional,
a1,a2,b1,b2 (c1,c2 solo tras falloA/B). No se recrean esas bases para otra pasada.
Cambio de rol demo mantiene una sesión activa por espacio: revoca sesiones previas
en la misma transacción del login real; no modifica política001–007 fuera de demo.

### Comprobación temporal tras la primera pasada completa

`carga-final-a1` conserva FAIL: las dos sondas de caducidad se programaron mezclando
UTC del cliente y del servidor sin calibración. Los eventos persistidos conservan
el TTL original y las lecturas posteriores muestran desfase variable; no permiten
reconstruir exactamente el reloj durante aquellas sondas. No se reclasifica la pasada.

Antes de repetir se añade una IT con PostgreSQL real y un reloj fijo exclusivo
de la instancia de prueba. La fila permanece RESERVADO y conserva expira_en; se
comprueba un microsegundo antes, en el vencimiento y un microsegundo después.
Se recorre repositorio, servicio y filtro HTTP con request/response de prueba:
antes se admite la cadena; en/después se exige401 y ninguna invocación de negocio.
No actúa el reconciliador ni se cambia el reloj del host o del producto. Esta
comprobación cubre la frontera que los ensayos de drenaje no aislaban.

La variante de carga complementa esa IT observando la transición natural CADUCADA
de la generación original. La representación SQL del Instant se normaliza a seis
decimales con el redondeo de JDBC, manteniendo el valor público original en la
evidencia; se comprueban empates y acarreo de segundo/día. El cast textual directo
de PostgreSQL usa empate al par y puede diferir en medio microsegundo.
El helper privado de solo lectura comprueba
espacio/generación, un único evento RESERVADA, TTL exacto de60min en precisión
PostgreSQL y CADUCADA no anterior a expira_en. No modifica estados ni vencimientos.
Programa la pausa con recepción monotónica de reserva+TTL, sin mezclar UTC Windows
y Java. Tras ese plazo observa a intervalos de1s, durante un máximo de120s y siempre
dentro de65min; cualquier ausencia, incoherencia o error impide PASS. Confirmada
la transición, emite una única petición antigua que debe devolver401. No reintenta
esa petición. Registra observaciones y retraso del evento aparte del tráfico útil;
su coste en PostgreSQL queda incluido en los recursos del conjunto medido.

Esta barrera prueba ciclo natural y denegación posterior; no sustituye la IT de
frontera ni acredita por sí sola puntualidad del reconciliador. Se conservará el
contrato inicial y se fijará otro contrato versionado. Las cuatro pasadas nuevas
serán `carga-reloj-a1/a2/b1/b2`, con QA nuevas `ag016_restore_qa_reloj_a1/a2/b1/b2`,
declaradas antes de crearlas; no se reutiliza ni elimina la QA de A1 fallida.

## Continuación pública AG-017 — operador con VPS disponible

El usuario mantiene el cierre íntegro y autoriza operar en el VPS IONOS identificado.
La implementación pública acotada y su justificación figuran en
[ADR-0010](../../docs/decisiones/ADR-0010-configuracion-publica-controlada.md).
Orden: guardar fuentes originales, añadir puerta pública y configuración explícita,
verify y regresión, crear imágenes desde los artefactos verificados, transferir al
VPS, comprobar TLS/renovación/recuperación de contenedores y la API real, capturar
pantallas y devolver evidencia. El cierre Git y la aceptación de 008 se realizan
sobre el resultado revisado, no al preparar este plan. V1–V7 intactas.

Las cargas históricas de 65 minutos se conservan; no se repiten por rutina.
No sustituyen las comprobaciones de la configuración pública nueva. Las pruebas
visuales automáticas registran geometría y capturas, pero no certifican diseño
sin revisión. La copia inicial no sustituye la política periódica ni una
restauración global. Estos pendientes se mantienen hasta que tengan evidencia.
