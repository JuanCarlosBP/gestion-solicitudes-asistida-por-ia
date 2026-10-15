# QA local de AG-014: backend/PG originales de QA y frontend final separado.
# Solo start/stop: conserva todos los contenedores, imágenes y volúmenes.
$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $raiz
$destino = Join-Path $raiz 'qa/evidencias/ag014/reanudacion/compose-final-01'
if (Test-Path -LiteralPath $destino) { throw 'La evidencia de este intento ya existe.' }
New-Item -ItemType Directory -Path $destino | Out-Null
$env:QA_EVIDENCE_DIR = $destino
$env:BASE_URL = 'http://127.0.0.1:18080'
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path $raiz 'tmp/playwright'
$env:TEMP = Join-Path $raiz 'tmp/pruebas-frontend'
$env:TMP = $env:TEMP
$base = @('compose', '-p', 'gestion-solicitudes-ag014', '--env-file', 'infraestructura/.env', '-f', 'infraestructura/compose.yaml')
$ui = @('compose', '-p', 'gestion-solicitudes-ag014-ui06', '-f', 'qa/compose-frontend-conservado.yaml')
function Ejecutar([string[]]$Argumentos) {
    $salida = & docker @Argumentos
    if ($LASTEXITCODE -ne 0) { throw 'Falló una operación Docker de comprobación.' }
    return $salida
}
function Esperar-Salud {
    $limite = [DateTime]::UtcNow.AddSeconds(60)
    do {
        try {
            $respuesta = Invoke-WebRequest "$env:BASE_URL/api/salud" -TimeoutSec 8 -SkipHttpErrorCheck
            if ($respuesta.StatusCode -eq 200 -and $respuesta.Content -eq '{"estado":"DISPONIBLE"}') { return }
        } catch { }
        Start-Sleep -Seconds 1
    } while ([DateTime]::UtcNow -lt $limite)
    throw 'No se recuperó la salud en 60 segundos.'
}
function Leer-Huellas {
    $tablas = @('usuarios','usuarios_roles','proveedores','solicitudes','conceptos_solicitud','operaciones_idempotentes_solicitud','decisiones_solicitud','eventos_historial','flyway_schema_history')
    $huellas = [ordered]@{}
    foreach ($tabla in $tablas) {
        $sql = "SELECT count(*)::text || ':' || md5(coalesce(string_agg(row_to_json(t)::text, E'\n' ORDER BY row_to_json(t)::text),'')) FROM gestion.$tabla t"
        $huellas[$tabla] = (Ejecutar ($base + @('exec','-T','postgres','psql','-U','administrador_local','-d','gestion','-v','ON_ERROR_STOP=1','-tAc',$sql)) | Out-String).Trim()
    }
    return $huellas
}
Esperar-Salud
$antes = Leer-Huellas
$antes | ConvertTo-Json | Set-Content (Join-Path $destino 'huellas-antes.json') -Encoding utf8
try {
    Ejecutar ($ui + @('stop','frontend')) | Out-Null
    Ejecutar ($base + @('stop','backend','postgres')) | Out-Null
    Ejecutar ($base + @('start','postgres','backend')) | Out-Null
    Ejecutar ($ui + @('start','frontend')) | Out-Null
    Esperar-Salud
    $despues = Leer-Huellas
    $despues | ConvertTo-Json | Set-Content (Join-Path $destino 'huellas-despues.json') -Encoding utf8
    if (($antes | ConvertTo-Json -Compress) -ne ($despues | ConvertTo-Json -Compress)) { throw 'Los datos cambiaron al reiniciar.' }
    Ejecutar ($base + @('stop','postgres')) | Out-Null
    $reloj = [Diagnostics.Stopwatch]::StartNew()
    $respuesta = Invoke-WebRequest "$env:BASE_URL/api/salud" -TimeoutSec 10 -SkipHttpErrorCheck
    $reloj.Stop()
    if ($respuesta.StatusCode -ne 503 -or $respuesta.Content -ne '{"estado":"NO_DISPONIBLE"}') { throw 'Contrato503 incorrecto.' }
    & node qa/verificar-estado-navegador.mjs error
    if ($LASTEXITCODE -ne 0) { throw 'La interfaz no reflejó la caída.' }
} finally {
    Ejecutar ($base + @('start','postgres','backend')) | Out-Null
    Ejecutar ($ui + @('start','frontend')) | Out-Null
}
Esperar-Salud
& node qa/verificar-estado-navegador.mjs disponible
if ($LASTEXITCODE -ne 0) { throw 'La interfaz no reflejó la recuperación.' }
@{fecha=(Get-Date).ToString('o');resultado='PASS';tablasConservadas=$antes.Count;caidaHttp=503;caidaMs=$reloj.ElapsedMilliseconds;recuperacionHttp=200;navegadorEjecutado=$true;frontend='ui06';eliminaciones=$false} |
    ConvertTo-Json | Set-Content (Join-Path $destino 'resultado.json') -Encoding utf8
Write-Output 'PASS: datos persistentes, HTTP503 real y recuperación200 en frontend final, sin eliminar recursos.'
