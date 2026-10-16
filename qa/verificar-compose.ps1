param(
    [string]$ArchivoEntorno = 'infraestructura/.env',
    [string]$DirectorioEvidencias,
    [ValidateRange(1, 65535)][int]$PuertoFrontend,
    [switch]$OmitirNavegador
)
$ErrorActionPreference = 'Stop'
$raizProyecto = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $raizProyecto
$archivoConfiguracion = if ([IO.Path]::IsPathFullyQualified($ArchivoEntorno)) {
    [IO.Path]::GetFullPath($ArchivoEntorno)
} else {
    [IO.Path]::GetFullPath((Join-Path $raizProyecto $ArchivoEntorno))
}
if (-not $archivoConfiguracion.StartsWith($raizProyecto + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'El archivo de entorno debe estar dentro del proyecto.'
}
if (-not (Test-Path -LiteralPath $archivoConfiguracion -PathType Leaf)) { throw 'No existe el archivo de entorno seleccionado.' }

# La prioridad coincide con Compose; el parámetro explícito es la primera opción.
$puerto = if ($PSBoundParameters.ContainsKey('PuertoFrontend')) { [string]$PuertoFrontend } else { $env:FRONTEND_PUERTO }
if ([string]::IsNullOrWhiteSpace($puerto)) {
    foreach ($linea in Get-Content -LiteralPath $archivoConfiguracion) {
        if ($linea -match '^\s*(?:export\s+)?FRONTEND_PUERTO\s*=\s*(.*?)\s*$') {
            $puerto = ($Matches[1] -replace '\s+#.*$', '').Trim().Trim('"', "'")
        }
    }
}
if ([string]::IsNullOrWhiteSpace($puerto)) { $puerto = '18080' }
$numeroPuerto = 0
if (-not [int]::TryParse($puerto, [ref]$numeroPuerto) -or $numeroPuerto -lt 1 -or $numeroPuerto -gt 65535) {
    throw 'FRONTEND_PUERTO debe ser un entero entre 1 y 65535.'
}
$env:FRONTEND_PUERTO = [string]$numeroPuerto
$env:BASE_URL = "http://127.0.0.1:$numeroPuerto"
if ($PSBoundParameters.ContainsKey('DirectorioEvidencias')) {
    $directorio = & node qa/rutas-evidencia.mjs $DirectorioEvidencias
} else {
    $directorio = & node qa/rutas-evidencia.mjs
}
if ($LASTEXITCODE -ne 0) { throw 'El directorio de evidencias fue rechazado.' }
$env:QA_EVIDENCE_DIR = $directorio
Write-Output "URL base: $env:BASE_URL; evidencias: $directorio; archivo de entorno: $archivoConfiguracion"
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path $raizProyecto 'tmp/playwright'
$env:TEMP = Join-Path $raizProyecto 'tmp/pruebas-frontend'
$env:TMP = $env:TEMP
New-Item -ItemType Directory -Path $env:TEMP -Force | Out-Null
$argumentosCompose = @('compose', '--env-file', $archivoConfiguracion, '-f', 'infraestructura/compose.yaml')
$resultadosCompose = [System.Collections.Generic.List[object]]::new()

function Ejecutar-Compose {
    param([string[]]$Operacion)
    $salida = & docker @argumentosCompose @Operacion
    if ($LASTEXITCODE -ne 0) { throw "Fallo Compose en $($Operacion[0])" }
    return $salida
}

function Esperar-Salud {
    $limite = [DateTime]::UtcNow.AddSeconds(60)
    do {
        try {
            $respuesta = Invoke-WebRequest -Uri "$env:BASE_URL/api/salud" -TimeoutSec 8 -SkipHttpErrorCheck
            if ($respuesta.StatusCode -eq 200 -and $respuesta.Content -eq '{"estado":"DISPONIBLE"}') { return }
        } catch { }
        Start-Sleep -Seconds 1
    } while ([DateTime]::UtcNow -lt $limite)
    throw 'La API no quedó disponible en el plazo de 60 segundos.'
}

function Leer-Historial {
    $sql = "SELECT version || ':' || checksum || ':' || installed_on::text FROM gestion.flyway_schema_history WHERE success ORDER BY installed_rank"
    return (Ejecutar-Compose @('exec', '-T', 'postgres', 'psql', '-U', 'administrador_local', '-d', 'gestion', '-tAc', $sql) | Out-String).Trim()
}

try {
    Ejecutar-Compose @('config', '--quiet') | Out-Null
    Ejecutar-Compose @('start') | Out-Null
    Esperar-Salud
    $antes = Leer-Historial
    if (-not $antes.StartsWith('1:')) { throw 'No se encuentra la migración inicial.' }
    Ejecutar-Compose @('stop') | Out-Null
    Ejecutar-Compose @('start') | Out-Null
    Esperar-Salud
    $despues = Leer-Historial
    if ($antes -ne $despues) { throw 'El historial no se conservó entre parada y arranque.' }
    $resultadosCompose.Add(@{ control='Persistencia tras stop/start'; resultado='PASS'; antes=$antes; despues=$despues })
    Ejecutar-Compose @('stop', 'postgres') | Out-Null
    $reloj = [Diagnostics.Stopwatch]::StartNew()
    $respuesta = Invoke-WebRequest -Uri "$env:BASE_URL/api/salud" -TimeoutSec 10 -SkipHttpErrorCheck
    $reloj.Stop()
    if ($respuesta.StatusCode -ne 503 -or $respuesta.Content -ne '{"estado":"NO_DISPONIBLE"}') { throw 'La caída real no devolvió el contrato 503.' }
    $resultadosCompose.Add(@{ control='Caída real de PostgreSQL'; resultado='PASS'; http=503; cuerpo=$respuesta.Content; milisegundos=$reloj.ElapsedMilliseconds })
    if (-not $OmitirNavegador) {
        & node qa/verificar-estado-navegador.mjs error
        if ($LASTEXITCODE -ne 0) { throw 'El navegador no reflejó el error real.' }
    }
} finally {
    Ejecutar-Compose @('start') | Out-Null
}
Esperar-Salud
if (-not $OmitirNavegador) {
    & node qa/verificar-estado-navegador.mjs disponible
    if ($LASTEXITCODE -ne 0) { throw 'El navegador no reflejó la recuperación real.' }
}
$resultadosCompose.Add(@{ control='Recuperación de PostgreSQL'; resultado='PASS'; http=200 })
@{ fecha=[DateTimeOffset]::Now.ToString('o'); baseUrl=$env:BASE_URL; controles=$resultadosCompose; destructivo=$false; navegadorEjecutado=(-not $OmitirNavegador) } |
    ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $directorio 'compose-persistencia-caida.json') -Encoding utf8
Write-Output "PASS: historial persistente, HTTP 503 real y recuperación 200. Navegador ejecutado: $(-not $OmitirNavegador). Evidencias: $directorio. Sin borrar volúmenes."
