# Operación local de la demo008

Este manual describe el laboratorio AG-016. El [informe](trazabilidad/AG-016-informe.md)
indica qué comprobaciones se han ejecutado. El único operador Docker debe
coordinar las pruebas para no alterar servicios durante otra ejecución.

## Componentes y credenciales

- `frontend`: Angular estático y nginx; un único origen para web y `/api`.
- `backend`: una instancia Java HTTP y pools acotados por espacio/generación.
- `postgres`: control operativo y tres bases de negocio separadas.
- `provisionador`: JVM auxiliar sin HTTP, con identidad administrativa separada.

El backend solo recibe configuración runtime, semilla HMAC e identidad RSA.
No recibe contraseña administrativa ni migradora. El provisionador necesita
sus credenciales privadas para migrar y recrear únicamente bases ficticias
inventariadas, sin reserva vigente ni conexiones.

Los archivos generados en `tmp/ag016/secrets` y las copias cifradas no se publican.
El generador rechaza sobreescrituras. No copie estos secretos a un entorno real.
La semilla y la clave RSA deben conservarse durante la vida de las reservas;
cambiarlas exige un procedimiento explícito de revocación.

## Contexto obligatorio

Ejemplo PowerShell desde la raíz del repositorio:

```powershell
$env:COMPOSE_PROJECT_NAME='gestion-solicitudes-ag016'
$env:COMPOSE_FILE=(Join-Path (Get-Location) 'infraestructura/demo/compose.yaml')
$env:AG016_ENTORNO_ARCHIVO=(Join-Path (Get-Location) 'tmp/ag016/local.env')
$env:AG016_EJECUCION='estado-operador-001'
node qa/ag016/operar.mjs estado
```

Cada ejecución requiere un identificador nuevo. El helper verifica ID completo,
etiqueta de proyecto y servicio antes de operar. No use comandos sin contexto,
`down -v`, `prune`, reinicios globales ni el proyecto histórico.

Para crear un laboratorio nuevo, el operador define además `DEMO_ENTORNO=local`,
`PERFIL_RECURSOS=A` o `B`, `FRONTEND_PUERTO=18086` y
`AG016_SECRETOS_DIR` dentro de `tmp/ag016`. Ejecuta
`node infraestructura/demo/preparar.mjs`; consulta el
[ejemplo de entorno](../infraestructura/demo/.env.example).
El código compilado y Angular deben existir antes de `operar.mjs construir`.
Las imágenes se construyen fuera de la envolvente de medición.

## Arranque y ciclo de vida

Tras compilar Java y Angular, ejecute `construir` fuera de cualquier medición.
La primera inicialización usa `iniciar-postgres`, `iniciar-provisionador`,
`provisionar` e `iniciar-web`, con una ejecución distinta por acción.
La provisión inicial es explícita. El supervisor permanente solo atiende
espacios RECICLABLE; no crea reservas ni repara automáticamente un bloqueo.

Transiciones: PREPARANDO → LISTO → RESERVADO → DRENANDO → RECICLABLE.
El siguiente lote crea otra generación y vuelve a LISTO. Un fallo deja BLOQUEADO.
El runtime deniega nuevas admisiones al caducar o liberar, espera las operaciones
admitidas y cierra el pool antes de declarar RECICLABLE. El provisionador verifica
también que PostgreSQL no conserve conexiones.

Para reiniciar un servicio concreto use `operar.mjs restart backend` con un
identificador nuevo; compruebe después salud y estados. Un reinicio conserva
las reservas vigentes si persisten control, bases y clave RSA. No considere un
comando aceptado como disponibilidad funcional.

`revocar-operador.mjs` retira las reservas ficticias del laboratorio mediante
DRENANDO y registra el motivo operativo. Está destinado a preparar QA.
No sustituye una política de administración pública.

## Límites y diagnóstico

Cupo, duración, pool, peticiones, autenticación y tamaño de base se configuran
en el archivo runtime. La configuración ensayada usa tres espacios, 60 minutos,
tres conexiones por pool y dos de control. El proxy limita cuerpo a128KiB,
autenticación costosa a90/min por IP y reservas a6/min por IP; el backend añade
límites por espacio. Cierres y liberaciones siguen disponibles al alcanzar cuota.

La cuota de almacenamiento impide nuevas escrituras y reservas elegibles;
no elimina auditoría. Es un umbral de admisión, no una reserva física de disco:
supervise también el volumen, las copias y los registros operativos.

Ante BLOQUEADO, lea estado, evento y conexiones; preserve los datos para diagnóstico.
No cambie a RECICLABLE sin identificar la causa y comprobar las precondiciones.
Los scripts de QA que inyectan fallos documentan su reparación privada particular;
no son una receta para reparar incidentes desconocidos.

## Medición reproducible

Las pasadas oficiales requieren que hayan pasado aislamiento y regresión. Detenga
los servicios del laboratorio separado de regresión mediante su contexto QA;
compruebe que ningún otro proceso de compilación o ensayo propio compita con la
carga. Conserve los recursos anteriores. El generador y el navegador quedan fuera
del presupuesto de servidor.

Prepare tres espacios LISTO con `revocar-operador.mjs`, usando una ejecución nueva.
A continuación establezca `AG016_PERFIL=A` o `B` y una ejecución como `perfil-reloj-a1`,
y ejecute `node qa/ag016/perfil.mjs`. Este paso detiene y arranca únicamente los
cuatro servicios identificados, aplica cuotas efectivas y mide el arranque conjunto.
No purga cachés del host ni simula hardware concreto de un proveedor.

En dos terminales con el mismo contexto obligatorio, establezca
`AG016_EJECUCION=carga-reloj-a1` y `AG016_BASE_QA=ag016_restore_qa_reloj_a1`.
Ejecute `node qa/ag016/muestrear.mjs` en una y `node qa/ag016/carga.mjs` en otra.
El muestreador espera la señal posterior a la semilla; las ventanas son de65min
completos. El modo `AG016_PRUEBA_ARNES=true` es una comprobación previa y nunca
cuenta como benchmark. Para una pasada oficial esa variable debe estar ausente
o valer `false`.

Use sufijos nuevos `a1`, `a2`, `b1`, `b2`, secuencialmente y con su perfil correcto.
Estos nombres identifican las cuatro pasadas de la variante reloj del encargo.
Una vez consumidos sus directorios o destinos QA, no se pueden reutilizar: una
repetición posterior requiere declarar otra variante y sus destinos nuevos en el
inventario y las listas cerradas del arnés. Conserve las salidas anteriores.
No modifique producto, imágenes, configuración funcional ni arnés entre pasadas.
El candado `tmp/ag016/carga-activa.lock` bloquea cargas simultáneas y cambios
operativos incompatibles; si queda tras una interrupción, investigue el proceso y
conserve la evidencia antes de decidir cómo recuperar. No lo borre a ciegas.

La copia y el reinicio controlado los solicita el generador en la fase operativa.
Al terminar ambos procesos, evalúe con
`node qa/ag016/evaluar.mjs carga-reloj-a1 perfil-reloj-a1`. La evaluación conserva las muestras
crudas y rechaza sobrescribir resultados. La matriz se obtiene con
`node qa/ag016/evaluar.mjs --matriz carga-reloj-a1 carga-reloj-a2 carga-reloj-b1 carga-reloj-b2`.
La matriz entrega un candidato. Antes de recomendarlo, revise técnicamente CPU
sostenida, throttling, duración de recorridos, cola y slots perdidos, además de los
umbrales numéricos ya fijados. Documente esa interpretación sin inventar después
un umbral para aprobar. Solo puede recomendarse un perfil con dos pasadas completas
favorables y versiones, imágenes, mezcla y parámetros comparables. Un resultado
incompleto no equivale a PASS; una recomendación técnica no es aceptación humana.

La RAM agrega `memory.current` de los cuatro servicios más la reserva SO/Docker,
sin restar caché para aparentar margen. RSS/PSS, heap, memoria nativa NMT, caché,
CPU/throttling, conexiones, swap e I/O se conservan por separado. La reserva del
SO es una aproximación explícita sobre Docker Desktop compartido; cualquier
recomendación requiere verificación posterior en el VPS real.

## Copias, restauración y rollback

`copia-restore.mjs` exige fuente demo inventariada y destino QA nuevo de lista
cerrada. Pause la actividad de esa fuente durante el cotejo; otros visitantes
pueden continuar. Usa pg_dump consistente, cifra con AES-256-GCM y conserva la
clave fuera de la copia. Restaura en otra base, invalida sesiones/refresh copiados,
compara negocio/historial/idempotencia y comprueba que la fuente no cambió.
La QA queda fuera del registro runtime y sin CONNECT de roles de aplicación.

Ejemplo del ensayo, después de cargar el contexto obligatorio anterior y de
comprobar que el destino todavía no existe:

```powershell
$env:AG016_BASE_COPIA='ag016_demo_01'
$env:AG016_BASE_QA='ag016_restore_qa_funcional'
$env:AG016_EJECUCION='copia-operador-001'
node qa/ag016/copia-restore.mjs
```

El ejemplo exige una entrada libre de la lista cerrada; no se puede repetir sobre
las QA ya creadas por AG-016. El llamador debe impedir nuevas escrituras en la fuente
y esperar sus operaciones en vuelo durante todo el cotejo. El arnés de carga lo hace
para su visitante; una invocación manual no establece ese bloqueo automáticamente.
La copia cifrada queda en `tmp/ag016/copias/copia-operador-001.enc`, la clave separada
en el directorio privado de secretos y la evidencia sanitizada en
`qa/evidencias/ag016/copia-operador-001/restore.json`.

El resultado esperado es `estado=PASS`, `fuenteIntacta=true`, `sesionesVivasQA=0|0`,
CONNECT denegado a los tres roles runtime y agregados iguales para todas las tablas
cotejadas. Un error deja sus recursos para diagnóstico; no autoriza sobrescribirlos.
Este helper genera una copia y restaura el contenido descifrado en la misma ejecución;
no acepta un archivo de copia anterior como entrada.

Para recuperar un archivo ya guardado se usa el helper independiente siguiente,
fuera de cualquier ventana de carga y con los espacios sin actividad. El destino
fijo `ag016_restore_qa` debe ser nuevo: el ensayo AG-016 ya lo creó y el comando
rechazará reutilizarlo. Este ejemplo describe aquella ejecución, no autoriza
sobrescribir sus datos:

```powershell
$env:AG016_COPIA_EJECUCION='carga-final-a1-copia'
$env:AG016_EJECUCION='recuperacion-archivo-01'
$env:AG016_BASE_QA='ag016_restore_qa'
node qa/ag016/restaurar-archivo.mjs
```

El helper lee el `.enc`, su metadata y la clave separada; verifica formato, SHA-256
y autenticación GCM antes de crear la QA. Compara la restauración con la huella del
snapshot guardado y la fuente actual consigo misma antes/después. La fuente puede
haber evolucionado legítimamente desde la copia. No crea otra copia ni guarda el
contenido descifrado en disco. Comprueba ACL de conexión y ausencia del destino en
el registro runtime; esa comprobación no se presenta como una conexión efectiva
con cada rol.

La [recuperación observada](../qa/evidencias/ag016/recuperacion-archivo-01/restauracion-archivo.json)
pasó en 16,68 s de procedimiento completo (6,93 s para restaurar e invalidar).
Snapshot, fuente actual, control, copia y metadata coinciden en sus cotejos;
sesiones y refresh activos en QA: cero. Las 12 pruebas offline también pasaron,
incluida la captura de salidas sensibles ante fallos de herramientas.

No restaure sobre una fuente activa. Conserve las bases QA de cada ensayo.
Una propuesta inicial de RPO24h y RTO30min requiere decisión humana; los tiempos
medidos del informe no son un compromiso de servicio.

El rollback es un procedimiento propuesto, no un downgrade ensayado en AG-016.
Antes de ejecutarlo debe existir una imagen identificada por digest y comprobada
contra el esquema y los contratos demo actuales en una QA separada. El operador
impedirá nuevas admisiones y esperará las operaciones en vuelo; conservará copia,
control y eventos; aplicará únicamente esa imagen compatible y comprobará salud,
reservas, permisos, idempotencia e historial antes de reabrir. El helper de actualización
comprueba identidad Docker, pero no acredita por sí solo compatibilidad de datos.
No retroceda V1–V7 ni borre registros para hacer compatible una versión antigua.

## Preparación pública

[compose.public.yaml](../infraestructura/demo/compose.public.yaml) exige un bind
HTTPS y directorio de certificados explícitos. Activa cookies seguras y nginxTLS.
Es una preparación local; no publica el sistema. Proveedor, dominio, DNS,
certificados reales, secretos de producción, retención, acceso del operador y
validación en VPS requieren intervención humana. La provisión destructiva actual
está limitada al laboratorio local: no cambiar `entorno` para eludir esa guarda.
