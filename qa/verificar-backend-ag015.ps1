param(
    [Parameter(Mandatory = $true)][string]$Intento,
    [ValidateSet('regresion', 'identidad', 'completo', 'formato')][string]$Alcance = 'regresion'
)
$ErrorActionPreference = 'Stop'
if ($Intento -notmatch '^[a-z0-9-]+$') { throw 'Identificador de intento inválido.' }
$raizAg015 = Split-Path -Parent $PSScriptRoot
$destinoAg015 = Join-Path $raizAg015 "qa/evidencias/ag015/backend-$Intento"
if (Test-Path -LiteralPath $destinoAg015) { throw 'La evidencia ya existe.' }
New-Item -ItemType Directory -Path $destinoAg015 | Out-Null
$env:JAVA_HOME = 'C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot'
$env:MAVEN_USER_HOME = Join-Path $raizAg015 'tmp/maven-user'
$env:TEMP = Join-Path $raizAg015 'tmp/ag015/backend-temporal'
$env:TMP = $env:TEMP
New-Item -ItemType Directory -Path $env:TEMP -Force | Out-Null
$env:GESTION_QA_CONSERVAR_CONTENEDORES = 'true'
$env:TESTCONTAINERS_REUSE_ENABLE = 'true'
$env:TESTCONTAINERS_RYUK_DISABLED = 'false'
$agenteAg015 = (Join-Path $raizAg015 'tmp/m2/org/mockito/mockito-core/5.20.0/mockito-core-5.20.0.jar').Replace('\', '/')
$argumentosAg015 = @('-B', '-ntp')
switch ($Alcance) {
    'formato' { $argumentosAg015 += 'spotless:apply' }
    'completo' { $argumentosAg015 += 'verify' }
    'identidad' { $argumentosAg015 += @('test-compile','failsafe:integration-test','failsafe:verify','-Dit.test=IdentidadAccesoIT') }
    'regresion' { $argumentosAg015 += @('test-compile','failsafe:integration-test','failsafe:verify','-Dit.test=IdentidadAccesoIT#csrfPermaneceEstableEntreLecturasBearerConcurrentes+csrfRotaEnLoginYCierreRealesSinExponerloEnElCuerpo') }
}
$argumentosAg015 += "-DargLine=-javaagent:$agenteAg015 -Duser.home=$($env:TEMP.Replace('\', '/'))"
$inicioAg015 = (Get-Date).ToString('o')
Get-ChildItem -LiteralPath (Join-Path $raizAg015 'backend/src') -Recurse -File | ForEach-Object {
    @{ruta=[IO.Path]::GetRelativePath($raizAg015,$_.FullName).Replace('\','/');sha256=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLower()}
} | ConvertTo-Json | Set-Content (Join-Path $destinoAg015 'fuentes.json')
Push-Location (Join-Path $raizAg015 'backend')
try {
    & ./mvnw.cmd @argumentosAg015 *> (Join-Path $destinoAg015 'salida.txt')
    $codigoAg015 = $LASTEXITCODE
} finally { Pop-Location }
@{inicio=$inicioAg015;fin=(Get-Date).ToString('o');alcance=$Alcance;argumentos=$argumentosAg015;exitCode=$codigoAg015;conservacion=$true;sistema='Windows; PostgreSQL Linux en Docker'} | ConvertTo-Json | Set-Content (Join-Path $destinoAg015 'ejecucion.json')
if ($Alcance -ne 'formato') {
    foreach ($carpetaAg015 in @('surefire-reports','failsafe-reports')) {
        $origenAg015 = Join-Path $raizAg015 "backend/target/$carpetaAg015"
        $salidaAg015 = Join-Path $destinoAg015 $carpetaAg015
        New-Item -ItemType Directory -Path $salidaAg015 | Out-Null
        Get-ChildItem -LiteralPath $origenAg015 -Filter 'TEST-*.xml' -ErrorAction SilentlyContinue |
            Where-Object { $_.LastWriteTime -ge [DateTime]::Parse($inicioAg015) } |
            Copy-Item -Destination $salidaAg015
    }
}
Write-Output "backend-$Intento exit=$codigoAg015"
exit $codigoAg015
