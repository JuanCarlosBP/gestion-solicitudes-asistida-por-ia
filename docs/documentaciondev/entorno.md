# Preparación, ejecución y comprobación de 001

**Estado:** Procedimientos comprobados con los límites indicados; revisión humana pendiente.
**Entorno observado:** Windows 11, PowerShell 7, Docker Desktop con contenedores Linux.
**Fecha:** 2026-10-13. [Versiones y fuentes](versiones.md), [resultados](../../especificaciones/001-base-verificable/validacion.md).

## Requisitos

Java/javac Temurin 21.0.12.1, Node 24.13.0, npm 11.6.2,
Docker Client/Engine 29.1.3, Desktop 4.55.0 y Compose 2.40.3.
Maven 3.9.16 se descarga mediante Wrapper 3.3.4; no necesita instalación global.
Se necesita acceso a npm oficial, Maven Central y registros oficiales de imágenes.
La capacidad heredada del host era 309,37 GiB libres; no es una medición final.
Las descargas y cachés locales de AG-006 residen en `tmp/` salvo la incidencia
inicial de caché npm documentada en validación.

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

**Resultado actual del comando obligatorio:** PASS en AG-008 y repetido en AG-009,
sin omisiones: Spotless, 10 pruebas unitarias/HTTP, 3 Testcontainers y SpotBugs.
El fallo de formato de AG-006 y su diagnóstico AG-007 permanecen en los informes
históricos; no son el estado actual. Docker es obligatorio para las integraciones.

Para generar el inventario de dependencias después de verify:

```powershell
.\mvnw.cmd -B -ntp dependency:list '-DoutputFile=target/dependencias.txt' '-DappendOutput=false'
```

Los informes están en `backend/target/surefire-reports` y `failsafe-reports`.
Los informes conservados de esta ejecución están en `qa/evidencias/ag009/informes-backend/`.

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

AG-009 repitió tipos, lint, formato, 11 pruebas Angular y build con PASS.
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
directorio e imprime la ruta. Rechaza destinos AG-003–AG-008 y rutas fuera del proyecto.
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

Errores reales registrados: Docker denegado en sandbox, DNS restringido,
JAVA_HOME 17, caché npm mal asignada inicialmente, exports/formateador, temporales
Vitest, compatibilidad de imagen por digest en Testcontainers, falta de unzip,
`start --wait` no admitido y foco del enlace de salto. Sus evidencias se conservan.
Para depurar, revisar la ejecución correspondiente en `qa/evidencias/` y los informes
JUnit; no habilitar trazas públicas ni imprimir la configuración completa de Compose.
No se ha usado Full Access ni se han actualizado herramientas globales.
