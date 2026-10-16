$ErrorActionPreference = 'Stop'
$raizProyecto = Split-Path -Parent $PSScriptRoot
$herramientas = Join-Path $raizProyecto 'tmp/herramientas'
$baseLocal = Join-Path $raizProyecto 'tmp/osv-cache/osv-scalibr/Maven'
New-Item -ItemType Directory -Path $herramientas, $baseLocal -Force | Out-Null
$nombrePublicado = if ($IsWindows) { 'osv-scanner_windows_amd64.exe' } else { 'osv-scanner_linux_amd64' }
$nombreLocal = if ($IsWindows) { 'osv-scanner.exe' } else { 'osv-scanner' }
$origenPublicado = 'https://github.com/google/osv-scanner/releases/download/v2.7.0/'
$ejecutable = Join-Path $herramientas $nombreLocal
$sumas = Join-Path $herramientas 'osv-scanner-SHA256SUMS'
Invoke-WebRequest -Uri ($origenPublicado + $nombrePublicado) -OutFile $ejecutable -TimeoutSec 120
Invoke-WebRequest -Uri ($origenPublicado + 'osv-scanner_SHA256SUMS') -OutFile $sumas -TimeoutSec 30
$sumaEsperada = (Select-String -LiteralPath $sumas -SimpleMatch $nombrePublicado).Line.Trim().Split(' ')[0]
if ((Get-FileHash -LiteralPath $ejecutable -Algorithm SHA256).Hash -ne $sumaEsperada) { throw 'Integridad OSV-Scanner incorrecta.' }
if (-not $IsWindows) { & chmod +x $ejecutable; if ($LASTEXITCODE -ne 0) { throw 'No se pudo preparar el ejecutable.' } }
# Descarga completa pública: nunca envía coordenadas o código del proyecto.
Invoke-WebRequest -Uri 'https://osv-vulnerabilities.storage.googleapis.com/Maven/all.zip' -OutFile (Join-Path $baseLocal 'all.zip') -TimeoutSec 120
Write-Output 'OSV-Scanner 2.7.0 verificado; base pública local preparada para --offline.'
