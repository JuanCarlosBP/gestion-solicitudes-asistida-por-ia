# Preparación, ejecución y comprobación de 001, 002 y 003

**Estado:** Procedimientos comprobados con los límites indicados; revisión humana pendiente.
**Entorno observado:** Windows 11, PowerShell 7, Docker Desktop con contenedores Linux.
**Fecha:** AG-011, 2026-10-14. [Versiones y fuentes](versiones.md),
[resultados 001](../../especificaciones/001-base-verificable/validacion.md) y
[resultados 002](../../especificaciones/002-identidad-acceso/validacion.md) y
[resultados 003](../../especificaciones/003-proveedores/validacion.md).

## Contexto QA vigente

AG-016 exige contexto explícito a los verificadores Compose de 001–007 y a sus
ayudantes E2E. Los apartados posteriores conservan los procedimientos y resultados
históricos de cada incremento; sus ejemplos de invocación deben completarse con
este contexto al usar los scripts actuales. Los estados de aceptación vigentes y
las comprobaciones nuevas se consultan en el [informe AG-016](../trazabilidad/AG-016-informe.md).

[qa/docker-contexto.mjs](../../qa/docker-contexto.mjs) exige las cuatro variables
`COMPOSE_PROJECT_NAME`, `COMPOSE_FILE`, `QA_ENTORNO` y `QA_COMPOSE_OVERRIDE`.
Los tres archivos deben existir dentro del workspace; el override debe ser distinto
del Compose principal. No hay selección automática de proyecto ni de `.env.example`.
Antes de `exec`, `start`, `stop` o `restart`, el helper comprueba el ID completo,
la etiqueta de proyecto y el servicio, y opera sobre ese ID. `--contexto` solo
resuelve argumentos y rutas, sin llamar a Docker ni imprimir el contenido del entorno.

Para la regresión AG-016, desde la raíz y en una consola dedicada, con el laboratorio
ya preparado por su único operador:

```powershell
$env:COMPOSE_PROJECT_NAME = 'gestion-solicitudes-ag016-regresion'
$env:COMPOSE_FILE = Join-Path (Get-Location) 'infraestructura/compose.yaml'
$env:QA_ENTORNO = Join-Path (Get-Location) 'tmp/ag016/regresion.env'
$env:QA_COMPOSE_OVERRIDE = Join-Path (Get-Location) 'qa/ag016/compose-regresion.yaml'
$env:FRONTEND_PUERTO = '18087'
$env:BASE_URL = 'http://127.0.0.1:18087'
$env:QA_EVIDENCE_DIR = Join-Path (Get-Location) 'qa/evidencias/ag016/regresion-manual-001'
node qa/docker-contexto.mjs --contexto
```

Elegir un directorio de evidencia nuevo antes de cada ejecución; no reutilizar
`regresion-manual-001` si existe. Este contexto coincide exactamente con la lista
permitida del helper. `tmp/ag016/regresion.env` es configuración local preparada;
el ejemplo no la crea ni copia secretos. El complemento de
[regresión](../../qa/ag016/compose-regresion.yaml) utiliza las imágenes locales
AG-016 con el perfil y proxy de 001–007. El puerto y la URL deben coincidir con el
conjunto existente. La resolución de contexto se ha comprobado sin Docker;
el resultado de cada prueba real se registra por separado en su evidencia.

Con las precondiciones de cada verificador, los comandos
`node qa/verificar-sesiones-compose.mjs`,
`node qa/verificar-proveedores-compose.mjs` y
`node qa/verificar-solicitudes-compose.mjs` heredan este bloque completo.
Lo mismo se aplica a aprobaciones, concurrencia, historial, evolución SQL y
preparación de usuarios. El navegador de regresión debe heredar el contexto y
sus fixtures, con `E2E_DEMO` sin definir. Estas pruebas crean datos ficticios y
algunas reinician servicios: coordinar su ejecución con el operador Docker.

El job `compose` de [CI](../../.github/workflows/ci.yml) proporciona el contexto
equivalente en Ubuntu mediante estas variables de job:

```yaml
COMPOSE_PROJECT_NAME: gestion-solicitudes-ci-${{ github.run_id }}-${{ github.run_attempt }}
COMPOSE_FILE: ${{ github.workspace }}/infraestructura/compose.yaml
QA_ENTORNO: ${{ github.workspace }}/infraestructura/.env
QA_COMPOSE_OVERRIDE: ${{ github.workspace }}/qa/compose-ci.yaml
QA_EVIDENCE_DIR: ${{ github.workspace }}/tmp/evidencias/compose
FRONTEND_PUERTO: '18080'
BASE_URL: http://127.0.0.1:18080
```

El workflow prepara el archivo ficticio `.env`, valida con
`node qa/docker-contexto.mjs -- config --quiet` y crea el proyecto exclusivo del
job con los mismos archivos explícitos. Los verificadores heredan esas variables;
la parada utiliza `node qa/docker-contexto.mjs -- stop frontend backend postgres`.
[compose-ci.yaml](../../qa/compose-ci.yaml) es un complemento explícito sin cambios
de servicios. Este bloque describe el workflow actual; no acredita una nueva
ejecución remota ni sustituye sus resultados.

La demo008 usa su propio proyecto, configuración y helper, descritos en
[operación de la demo](../operacion-demo-008.md). Su contexto no sirve para ejecutar
la regresión 001–007; abrir una consola distinta evita mezclar ambas configuraciones.

## Requisitos

Java/javac Temurin 21.0.12.1, Node 24.13.0, npm 11.6.2,
Docker Client/Engine 29.1.3, Desktop 4.55.0 y Compose 2.40.3.
Maven 3.9.16 se descarga mediante Wrapper 3.3.4; no necesita instalación global.
Se necesita acceso a npm oficial, Maven Central y registros oficiales de imágenes.
La capacidad heredada del host era 309,37 GiB libres; no es una medición final.
Las descargas y cachés locales de AG-006 residen en `tmp/` salvo la incidencia
inicial de caché npm documentada en validación.
AG-010 conserva esas versiones y añade Bouncy Castle 1.86 estable para Argon2;
el starter Resource Server queda gestionado por el BOM de Boot 4.0.8.

Los comandos siguientes parten de la raíz del proyecto. No ejecutan Git.
Los bloques Windows usan PowerShell; las variables solo afectan esa consola.

## Arranque conjunto comprobado

```powershell
Copy-Item infraestructura/.env.example infraestructura/.env
docker compose --env-file infraestructura/.env -f infraestructura/compose.yaml config --quiet
docker compose --env-file infraestructura/.env -f infraestructura/compose.yaml up -d --build --wait --wait-timeout 120
```

Copiar el ejemplo crea configuración ficticia local: hacerlo solo si `.env` no
existe, para no sobrescribir una configuración propia. Las claves del ejemplo
no son válidas para producción. Compose exige que estén definidas.
`config --quiet` valida sin imprimir credenciales; `up` crea imágenes, red y volumen.
`--wait` confirma servicios en ejecución; la API puede necesitar unos segundos más.

Abrir [inicio local](http://127.0.0.1:18080/inicio) y
[Swagger local](http://127.0.0.1:18080/swagger-ui/index.html).
Se comprobaron apertura directa, recarga y redirección desde la raíz.
Solo el frontend publica un puerto; PostgreSQL no se expone al host.

002 añade [acceso](http://127.0.0.1:18080/acceso) y
[mi cuenta](http://127.0.0.1:18080/mi-cuenta). Compose activa explícitamente `local`.
El ejemplo `.env.example` contiene cuatro grupos DEMO ficticios con sufijos
CORREO/NOMBRE/CLAVE para SOLICITANTE, SUPERVISOR, AUDITOR y ADMINISTRADOR.
No son credenciales para un entorno público. Si ya existe `.env`, añadir los
grupos ficticios de forma consciente sin sobrescribir configuración propia.
No imprimir `docker compose config` completo: contiene variables sensibles;
usar siempre `config --quiet` para validación.

El aprovisionamiento crea cuentas ausentes y no cambia las contraseñas ni los
roles de cuentas existentes. Cambiar el ejemplo después del primer arranque no
actualiza automáticamente una cuenta; no existe todavía CRUD de usuarios.
Sin configuración DEMO no se crean cuentas; un grupo parcial impide el arranque.
El perfil normal tampoco las crea. Cada contraseña se valida y almacena como Argon2id.

## Parada y persistencia comprobadas

```powershell
docker compose --env-file infraestructura/.env -f infraestructura/compose.yaml stop
docker compose --env-file infraestructura/.env -f infraestructura/compose.yaml start
```

Estos comandos conservan el volumen y sus datos. No usar opciones de borrado
de volúmenes ni limpiezas globales; no forman parte de este procedimiento.
En Compose 2.40.3, `start --wait` no está disponible: se usa `start` y espera HTTP.
Cambiar las claves en `.env` después del primer arranque no cambia los roles
ya guardados en PostgreSQL; requiere un procedimiento administrativo posterior.

## Backend en Windows

```powershell
$env:JAVA_HOME = 'C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot'
$env:MAVEN_USER_HOME = Join-Path (Get-Location) 'tmp/maven-user'
$env:TEMP = Join-Path (Get-Location) 'tmp/pruebas-backend'
$env:TMP = $env:TEMP
New-Item -ItemType Directory -Path $env:TEMP -Force | Out-Null
Set-Location backend
.\mvnw.cmd -B -ntp verify
```

Adaptar JAVA_HOME a una instalación Java 21 comprobada. En este equipo `java`
del PATH era 21, pero JAVA_HOME apuntaba a 17; Maven utiliza JAVA_HOME.
La caché Maven se fija por `.mvn/maven.config` en `../tmp/m2`.

**Resultado actual del comando obligatorio:** PASS en AG-011 sin omisiones:
Spotless,61 pruebas unitarias/HTTP,37 IT PostgreSQL y SpotBugs. Incluye001/002/003.
El fallo de formato de AG-006 y su diagnóstico AG-007 permanecen en los informes
históricos; no son el estado actual. Docker es obligatorio para las integraciones.

Para generar el inventario de dependencias después de verify:

```powershell
.\mvnw.cmd -B -ntp dependency:list '-DoutputFile=target/dependencias.txt' '-DappendOutput=false'
```

Los informes están en `backend/target/surefire-reports` y `failsafe-reports`.
Los informes nuevos de esta ejecución están en `qa/evidencias/ag011/backend-*`.

El arranque sin variables DB se comprobó con una instancia Docker propia sin red:
falló con salida 1, identificó DB_URL y no necesitó secretos reales.
No se publica una receta de PostgreSQL nativo no comprobada.

## Frontend en Windows

Desde la raíz, en una consola nueva para evitar directorios relativos ambiguos:

```powershell
$env:npm_config_cache = Join-Path (Get-Location) 'tmp/npm-cache'
$env:NG_CLI_ANALYTICS = 'false'
$env:TEMP = Join-Path (Get-Location) 'tmp/pruebas-frontend'
$env:TMP = $env:TEMP
New-Item -ItemType Directory -Path $env:TEMP -Force | Out-Null
Set-Location frontend
npm ci --no-audit --no-fund
npm run typecheck
npm run lint
npm run format:check
npm test -- --reporters=junit --output-file=test-results/unitarias.xml
npm run build
npm audit --omit=dev --json
npm audit --json
```

AG-011 repitió tipos, lint, formato,130 pruebas Angular y build con PASS.
La instalación y auditorías npm de AG-006 conservan su fecha y alcance;
no se presentan como auditorías nuevas. El lockfile no se modificó.
Los tests necesitan poder crear procesos/temporales; el sandbox provocó EPERM
y errores de resolución, resueltos ejecutando el comando autorizado con temporales
locales. No modificar node_modules, usar force, overrides ni legacy-peer-deps.
`npm run format` escribe formato; `format:check` solo comprueba.
`npm start` está configurado para desarrollo con proxy a 127.0.0.1:8080;
ese modo con servidor backend nativo no fue probado y no acredita el arranque conjunto.

## Navegador y caída real

Instalación comprobada desde `frontend/`, con navegador dentro del workspace:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path (Split-Path (Get-Location) -Parent) 'tmp/playwright'
.\node_modules\.bin\playwright.cmd install chromium
npm run test:e2e
```

Con Compose activo, desde la raíz:

```powershell
$env:QA_EVIDENCE_DIR = 'tmp/evidencias/local'
./qa/verificar-compose.ps1 -ArchivoEntorno infraestructura/.env
```

`-DirectorioEvidencias` permite elegir la salida explícitamente; en su ausencia
se usa `QA_EVIDENCE_DIR` y después `tmp/evidencias/local`. La utilidad crea el
directorio e imprime la ruta. Rechaza destinos AG-003–AG-010 y rutas fuera del proyecto.
La prioridad del puerto es `-PuertoFrontend`, variable `FRONTEND_PUERTO`, valor
del archivo indicado por `-ArchivoEntorno` y, por último, 18080.
El script calcula `BASE_URL=http://127.0.0.1:<puerto>` y lo transmite al navegador.
El conjunto debe haberse creado con ese mismo puerto; cambiarlo requiere recrear
el frontend mediante `docker compose ... up -d --build --wait` con la configuración elegida.
Para ejecutar E2E por separado en otro puerto, definir `BASE_URL` en esa consola
antes de `npm run test:e2e`. AG-009 probó realmente 18080 y 18081.

Detiene/arranca solo los servicios de este proyecto; verifica historial idéntico,
503 real al parar PostgreSQL, error visible en Chromium y recuperación 200.
No borra datos. Las pruebas E2E ordinarias prueban además navegación, foco,
ancho móvil, mensajes, cabeceras, OpenAPI y consulta desde Swagger.

## Dependencias y auditoría sin envío de inventarios

`node qa/verificar-dependencias-preliminares.mjs` lee el lockfile completo.
AG-006 hizo un único inventario; una futura ejecución de CI vuelve a verificarlo.
El JSON distingue clasificación estática de instalación/auditoría/QA externas.
Los 16 preliminares son transitivos controlados, sin uso/importación directa.

Tras generar `backend/target/dependencias.txt`, desde la raíz:

```powershell
.\qa\preparar-auditoria.ps1
node qa/auditar-maven.mjs
```

El preparador descarga OSV-Scanner 2.7.0, verifica su SHA-256 y descarga la base
pública completa Maven. El auditor usa exclusivamente `--offline`; no envía
dependencias ni código. OSV 2.7.0 usa `tmp/osv-cache/osv-scalibr/Maven/all.zip`;
la documentación externa consultada aún indicaba `osv-scanner`, ruta antigua.
Salida 1 indica hallazgos que deben evaluarse, no bloqueo global automático.
Salida distinta por fallo del servicio/preparación deja aceptación pendiente.
Los parches Tomcat/Jackson eliminaron las 17 coincidencias iniciales del análisis.
No se afirma cobertura de CVE desconocidas, plugins Maven ni sistema operativo de imágenes.

El auditor y los verificadores de navegador, entrega y documentación escriben en
`QA_EVIDENCE_DIR`, con `tmp/evidencias/local` como destino predeterminado.
`qa/verificar-entrega.mjs` lee `QA_BASELINE_DIR` (por defecto `qa/evidencias/ag006`)
sin modificarlo: conserva los controles históricos específicos de AG-006 y no
sustituye un inventario del cambio actual. AG-009 aporta su propio manifiesto y
comparación SHA-256 de la historia. Las rutas de lectura y escritura se imprimen.

## CI, depuración y límites

`.github/workflows/ci.yml` prepara backend, frontend y Compose en Ubuntu 24.04.
Actions por SHA, permisos mínimos, sin publicación de imágenes ni despliegue.
Actionlint 1.7.12 pasó localmente. La rama y PR borrador #1 ya fueron publicadas.
La primera CI (runs 38388926539 y 38389011007) pasó frontend y falló backend
por `21.0.12.1+1` en setup-java y Compose por `COPY public` sobre una carpeta vacía.
AG-009 usa `21.0.12.1`, retira esa copia y atiende R-01 a R-04 de REV-001.
El workflow se dispara por PR y por push solo a main, con salidas nuevas por job
en `tmp/evidencias/backend` y `tmp/evidencias/compose`; no publica evidencias históricas.
La segunda CI está pendiente del siguiente push humano; 001 no está aceptada ni integrada.
El Wrapper Linux y los builds multietapa pasaron en Docker; no equivalen a haber
ejecutado el workflow remoto. El conjunto de pruebas en un runner Linux queda pendiente.

## Configuración de identidad y comprobaciones AG-010

Local/test generan un par RSA efímero al arrancar. Tras reiniciar, el JWT anterior
deja de validar y el refresh persistido permite obtener uno nuevo. El perfil
`test` no aprovisiona usuarios de demostración. Fuera de esos perfiles son
obligatorias ambas claves, cada una mediante una sola fuente:

- `IDENTIDAD_CLAVE_PRIVADA_RUTA` o `IDENTIDAD_CLAVE_PRIVADA_PEM`: PKCS8 RSA.
- `IDENTIDAD_CLAVE_PUBLICA_RUTA` o `IDENTIDAD_CLAVE_PUBLICA_PEM`: X509 RSA.

No usar claves reales en Git ni ejemplos. Se valida el par y su tamaño mínimo
2048 bits; faltantes/inválidas producen un error controlado de arranque.
Valores predeterminados: `identidad.duracion-acceso=PT10M` y
`identidad.duracion-refresco=PT8H`. Duraciones positivas, enteras en segundos,
con acceso menor o igual que la familia. La renovación no prolonga la familia.

En el navegador los JWT viven solo en memoria. Recargar restaura mediante
cookie refresh HttpOnly y XSRF. No abrir la aplicación mediante una IP de red
para forzar HTTP: el modo sin Secure solo admite loopback local. Un entorno
público requiere HTTPS, Secure y secretos distintos, todavía no acreditados.

AG-010 dirige toda evidencia nueva a `qa/evidencias/ag010/`; los verificadores
rechazan AG-003–AG-009. Las pruebas de identidad en Compose se invocan desde raíz
con `node qa/verificar-sesiones-compose.mjs`, `BASE_URL` del puerto real y
el [contexto QA vigente](#contexto-qa-vigente) completo; la ejecución histórica usó
el ejemplo ficticio como `QA_ENTORNO`. Reinicia únicamente backend,
comprueba cuatro roles, JWT invalidado/refresh conservado, rotación, reuse y logout.
Su estado ejecutado se registra en validación; no sustituye E2E del navegador.

Las auditorías npm de producción y completas requieren enviar metadatos al
registro público; la persona responsable lo autorizó expresamente durante AG-010.
La alternativa `node qa/auditar-npm-offline.mjs` compara dos SBOM locales con
OSV-Scanner 2.7.0 y el volcado público completo npm en
`tmp/osv-cache/osv-scalibr/npm/all.zip`, sin enviar inventarios. No se presenta
como ejecución de npm audit. La fecha y huella del volcado quedan en evidencias.

La CI de 002 fija Docker 29.1.3 mediante Action oficial por SHA y Compose 2.40.3
con SHA-256 del binario Linux. Incluye reinicio/sesiones, E2E 001/002, documentación
y actionlint 1.7.12. Resultados remotos pendientes del push humano; los jobs
publican exclusivamente salidas propias de esa ejecución.

Errores reales registrados: Docker denegado en sandbox, DNS restringido,
JAVA_HOME 17, caché npm mal asignada inicialmente, exports/formateador, temporales
Vitest, compatibilidad de imagen por digest en Testcontainers, falta de unzip,
`start --wait` no admitido y foco del enlace de salto. Sus evidencias se conservan.
Para depurar, revisar la ejecución correspondiente en `qa/evidencias/` y los informes
JUnit; no habilitar trazas públicas ni imprimir la configuración completa de Compose.
No se ha usado Full Access ni se han actualizado herramientas globales.

## Comprobaciones de proveedores — AG-011

La orden AG-011 autoriza consultas a npm/Maven y registros públicos de vulnerabilidades
con solo nombres, versiones y metadatos; sin código, secretos ni datos privados.
Todas las salidas nuevas se dirigen a qa/evidencias/ag011 o temporales ignorados.
Los verificadores rechazan destinos históricos AG-003–AG-010.

El contrato y los datos de ejemplo están en especificación 003. El catálogo usa
V3 sobre el volumen existente, sin borrar V1/V2 ni datos. Los usuarios ficticios
siguen siendo los cuatro de infraestructura/.env.example. La comprobación API
propia, desde raíz con Compose listo, requiere el
[contexto QA vigente](#contexto-qa-vigente) y `QA_EVIDENCE_DIR` exclusivo:
`node qa/verificar-proveedores-compose.mjs`. Pasan78 controles REST, junto a88 de
sesiones,9 E2E y persistencia/caída503/recuperación200 en imágenes definitivas.
La validación conserva resultados y primeros fallos antes de correcciones.

El verificador solo permite loopback HTTP y datos QA-AG011 ficticios. Crea registros
que conserva sin borrado físico, comprueba permisos, duplicados, carreras reales,
versiones, búsquedas/páginas, reinicio de backend y logs acotados en memoria.
No publica tokens, cookies, cuerpos ni logs completos. No acredita carga de 50.000.

`node qa/verificar-entrega-ag011.mjs` compara baseline/huellas protegidas y prefijo
CSV sin Git, y genera inventario de archivos y agrupaciones de commits sugeridas.
La CI añade API y navegador 003 a 001/002. Cada job conserva evidencias exclusivas,
Actions por SHA, permisos mínimos e imágenes/versiones fijadas. CI remota queda
pendiente del push humano; actionlint local no equivale a una CI remota ejecutada.

## Solicitudes y comprobaciones AG-012

AG-012 mantiene las versiones y usa únicamente el entorno ficticio
`infraestructura/.env.example`. Las salidas nuevas se guardan en
`qa/evidencias/ag012/` o temporales del workspace; el resolutor rechaza ahora
AG-003–AG-011. No se ejecutan comandos Git. Las consultas públicas autorizadas
envían solo metadatos; OSV Maven compara el inventario local sin conexión.

Con Compose listo, ejecutar `node qa/verificar-solicitudes-compose.mjs` con
el [contexto QA vigente](#contexto-qa-vigente) y `QA_EVIDENCE_DIR` exclusivo.
AG-012 usó históricamente `QA_ENTORNO=infraestructura/.env.example`. Comprueba
API004, cálculos, visibilidad, referencias, conflictos, idempotencia y reinicio.
El preparador crea usuarios ficticios únicos copiando internamente el hash del
solicitante demo; no imprime hashes ni devuelve credenciales. El descriptor
`usuarios-solicitudes.json` contiene solo UUID, correo ficticio y tipo de fixture.
El E2E requiere `E2E_AJENO_CORREO` del descriptor y falla si falta esa precondición.
Los registros QA permanecen en el volumen; no se elimina información para aislar
pruebas. Los filtros de pruebas usan UUID completos.

El backend nuevo incorpora V4. Durante AG-012 se corrigió una restricción de esa
migración todavía no publicada después de aplicarla al volumen local ficticio.
Con backend detenido, se alineó únicamente esa restricción y se ejecutó reparación
oficial Flyway: conteos y huellas de datos, y checksums V1–V3, permanecieron iguales;
la validación de las cuatro migraciones pasó. Evidencia:
`qa/evidencias/ag012/ajuste-v4-local.log`. Este hecho documenta esa corrección
local; no autoriza editar migraciones publicadas ni reparar otros entornos.

La CI incluye API/E2E004, conserva Actions por SHA y un único disparo por PR.
Los resultados consolidados están en la validación004 y el informe AG-012;
la ejecución remota de estos cambios queda pendiente del push humano.

## Aprobaciones y comprobaciones 005

La continuación autorizada conserva el volumen ficticio y aplica únicamente V5
después de congelar V4. `node qa/verificar-aprobaciones-compose.mjs`, con las mismas
variables de entorno y un directorio de evidencia nuevo, verifica permisos,
versiones, decisiones concurrentes, evento único, replay y autorización vigente.
Puede retirar/restaurar temporalmente rol y habilitación de su propio usuario
ficticio; no opera cuentas reales. Los cuerpos de sesión permanecen en memoria.

Su descriptor `usuarios-aprobaciones.json` aporta `ajeno.correo` y
`multiple.correo` para `E2E_AJENO_CORREO` y `E2E_MULTIPLE_CORREO`. Ambos son
precondiciones obligatorias de los E2E. Las contraseñas ficticias se toman del
ejemplo local, sin copiarlas al descriptor ni a las evidencias. La CI ejecuta
API y navegador 001–005, con salidas por job y parada sin eliminar volúmenes.

El cierre de 004 en `qa/evidencias/ag012/cierre004/` permanece inmutable; incluye
fuentes comprimidas y SHA-256 para revisar por separado los incrementos. Los
resultados de 005 se guardan con nombres y directorios propios. Véase
[validación 005](../../especificaciones/005-aprobaciones/validacion.md).

## Concurrencia y comprobaciones AG-013

El resolutor de evidencias protege ahora AG-003–AG-012. Usar un directorio nuevo
mediante `QA_EVIDENCE_DIR`; nunca reutilizar una evidencia histórica. V6 evoluciona
la tabla de operaciones sin editar V1–V5. `qa/verificar-evolucion-v6.mjs antes`
captura V5; ejecutar `despues` tras aplicar V6 y antes de cualquier mutación de QA.
Se comparan checksums y todas las columnas heredadas de siete tablas, sin guardar filas.

`node qa/verificar-concurrencia-compose.mjs` verifica siete POST, recuperación,
veinte peticiones iguales/distintas, versiones, espera, revocación, reinicio y
PostgreSQL caído. Opera exclusivamente en loopback y con cuentas ficticias; restaura
roles y servicios en finally. No ejecutarlo simultáneamente con otros verificadores
que cambien los mismos servicios o permisos.

Los E2E de 006 simulan la pérdida de una respuesta después de que el backend
complete la petición. Incluyen dos pestañas, recarga/reapertura y recuperación
después de reiniciar el backend. `E2E_RESULTS_DIR` permite separar capturas/XML;
los usuarios ajeno y multirrol proceden del descriptor de QA de aprobaciones.
Los ayudantes Docker de navegador solo operan el Compose ficticio y restauran estado.

La CI ejecuta API y navegador 001–006, sin reintentos E2E, con Actions por SHA y
evidencias por job. El log histórico enlazado `qa/evidencias/ag011/backend-verify-final.log`
se incluye mediante una excepción exacta de `.gitignore`, conservando sus bytes.
La corrección del fallo remoto se reprodujo localmente; requiere commit/push humano
y nueva ejecución remota. Véase [AG-013](../trazabilidad/AG-013-informe.md).

## Verificación007 — AG-014

Usar destinos nuevos dentro de qa/evidencias/ag014 o tmp/evidencias, nunca AG003–013.
El resolvedor rechaza estos directorios históricos incluso si se indican a mano.
No ejecutar los verificadores de entrega de sesiones anteriores con escritura
sobre sus carpetas; qa/verificar-entrega-ag014.mjs compara huellas de entrada.

Antes de aplicar V7 al volumen ficticio local, qa/verificar-evolucion-v7.mjs antes
conserva conteos/huellas de siete tablas y checksumsV1–V6, más IDs mínimosV5.
Después de migrar y antes de nuevas acciones, modo despues comprueba preservación
y tablaV7 vacía. No se usa este procedimiento sobre datos reales.
QA_HISTORIAL_ANTERIOR puede apuntar a historial-anterior.json para las pruebas API;
E2E_HISTORIAL_ANTERIOR_ID identifica ese recurso ficticio en navegador.
Para acreditar decisiones V5 anteriores en navegador, ese recurso debe tener una
decisión previa real en el volumen ficticioV6 y debe activarse
E2E_HISTORIAL_ANTERIOR_DECISION=true. La variante sintética de CI, que omite esa
condición, no acredita esta conservación ni cierra HA-01/03/09 por sí sola.
En CI desde base nueva se usa un recurso fixture sin creación registrada, declarado
artificial; la evolución real previa se verifica con PostgreSQL IT.

Comandos adicionales previstos: node qa/verificar-historial-compose.mjs,
node qa/verificar-entrega-ag014.mjs. El primero comprueba eventos/proyección/
permisos/filtros/resumen y mide20 GET locales; no es benchmark productivo.
Los comandos Maven/Angular/Compose heredados siguen siendo obligatorios.
Un socket Docker inaccesible requiere resolver el entorno: no sustituir PostgreSQL
por base en memoria ni declarar integraciones que no se ejecutaron.

En la reanudación AG-014 el usuario reinició WSL y abrió Docker Desktop. El motor
29.1.3 y Compose2.40.3 respondieron; el acceso desde el aislamiento devolvía
`permission denied` sobre el pipe Docker y funcionó con permiso de herramienta.
El agente no eliminó el socket ni usó restablecimiento de fábrica.

Para conservar también los contenedores existentes, se usa el proyecto separado
`COMPOSE_PROJECT_NAME=gestion-solicitudes-ag014` con la misma configuración Compose.
La base ficticiaV6 se copió con pg_dump/pg_restore a su volumen de QA: siete tablas,
sus columnas y checksums coincidieron antes de arrancar007. Los recursos originales
permanecen detenidos. Todos los verificadores y E2E deben heredar ese nombre de
proyecto; solo se admiten start/stop/restart, sin recrear ni eliminar contenedores.
Las imágenes se construyeron sin caché bajo los nombres del proyecto de QA.

Las correcciones de frontend se prueban conservando cada contenedor anterior
detenido. `qa/compose-frontend-conservado.yaml` define el frontend final como
proyecto `gestion-solicitudes-ag014-ui06`, conectado a la red web ya existente,
sin declarar otra base de datos ni volúmenes. Para E2E se mantiene
COMPOSE_PROJECT_NAME=gestion-solicitudes-ag014, porque sus ayudantes SQL/reinicio
operan el backend y PostgreSQL de esa copia. BASE_URL sigue siendo el loopback18080.
El primer montajeui02 con configuración combinada creó además una red y un volumen
vacíos; se conservan por la prohibición humana de borrar recursos. No forman
parte de la arquitectura de aplicación ni se presentan como despliegue público.

Para las IT de esta sesión, `backend/verificar-conservando.ps1` admite
`-Alcance historial` o `-Alcance completo` y un `-Intento` de dos cifras nuevo.
Activa el helper de pruebas con GESTION_QA_CONSERVAR_CONTENEDORES=true,
TESTCONTAINERS_REUSE_ENABLE=true y TESTCONTAINERS_RYUK_DISABLED=false.
El modo exige Testcontainers2.0.5 y conserva cada contenedor detenido con etiqueta
de instancia única; mantiene los asserts y comprueba los inventarios de recursos.
Fuera de ese modo optativo, el ciclo de vida de pruebas existente se conserva.

La auditoría npm de la reanudación usa explícitamente
`--registry=https://registry.npmjs.org`, autorizada por el usuario para enviar
solo el inventario necesario. Los fallos de DNS y el rechazo automático anteriores
se conservan por separado; no se presentan como ejecuciones superadas.

El cierre final se comprueba con `qa/verificar-compose-conservado-ag014.ps1`:
solo start/stop/exec sobre los proyectos QA y ui06, huellas de nueve tablas,
503 por caída real de PostgreSQL y recuperación200 en navegador. El script usa
un directorio exclusivo y rechaza sobrescribir ese intento. Todos los recursos
se conservan detenidos al terminar. No ejecutar el start global de la configuración
base junto al frontend separado: activaría también su frontend anterior en el mismo puerto.

Tras AG-014 hay30 contenedores detenidos,17 volúmenes y20 imágenes, incluidos todos
los recursos previos. Para reabrir únicamente la aplicación QA conservada desde
la raíz del workspace, sin reconstruir ni recrear:

```powershell
docker compose -p gestion-solicitudes-ag014 --env-file infraestructura/.env -f infraestructura/compose.yaml start postgres backend
docker compose -p gestion-solicitudes-ag014-ui06 -f qa/compose-frontend-conservado.yaml start frontend
```

La URL local es http://127.0.0.1:18080. Esto usa datos ficticios de QA; no es un
procedimiento aprobado de producción. Una futura limpieza de estos recursos
requiere autorización humana nueva.
