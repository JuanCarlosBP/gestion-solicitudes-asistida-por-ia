param([Parameter(Mandatory=$true)][string]$Intento,[Parameter(Mandatory=$true)][ValidateSet('demo','regresion')][string]$Modo)
$ErrorActionPreference='Stop'
if($Intento -notmatch '^[a-z0-9-]+$'){throw 'Intento inválido'}
foreach($claveAg016 in @('COMPOSE_PROJECT_NAME','COMPOSE_FILE','BASE_URL')){
 if([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($claveAg016))){throw "Falta $claveAg016"}
}
if($Modo -eq 'regresion'){
 foreach($claveAg016 in @('QA_ENTORNO','QA_COMPOSE_OVERRIDE','E2E_AJENO_CORREO','E2E_MULTIPLE_CORREO','E2E_HISTORIAL_ANTERIOR_ID')){
  if([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($claveAg016))){throw "Falta fixture/contexto $claveAg016; no iniciar regresión incompleta"}
 }
}
$raizAg016=Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$env:E2E_RESULTS_DIR=Join-Path $raizAg016 "qa/evidencias/ag016/$Intento"
if(Test-Path -LiteralPath $env:E2E_RESULTS_DIR){throw 'Evidencia existente'}
New-Item -ItemType Directory -Path $env:E2E_RESULTS_DIR | Out-Null
$env:E2E_SCREENSHOTS_DIR=$env:E2E_RESULTS_DIR
$env:PLAYWRIGHT_BROWSERS_PATH=Join-Path $raizAg016 'tmp/playwright'
$env:TEMP=Join-Path $raizAg016 'tmp/ag016/frontend-temporal'
$env:TMP=$env:TEMP
New-Item -ItemType Directory -Path $env:TEMP -Force | Out-Null
if($Modo -eq 'demo'){$env:E2E_DEMO='1'}else{Remove-Item Env:E2E_DEMO -ErrorAction SilentlyContinue}
$inicioAg016=(Get-Date).ToString('o')
Push-Location (Join-Path $raizAg016 'frontend')
try{npm.cmd run test:e2e *> (Join-Path $env:E2E_RESULTS_DIR 'salida.txt');$codigoAg016=$LASTEXITCODE}finally{Pop-Location}
@{inicio=$inicioAg016;fin=(Get-Date).ToString('o');modo=$Modo;exitCode=$codigoAg016;reintentos=0} |
 ConvertTo-Json | Set-Content (Join-Path $env:E2E_RESULTS_DIR 'ejecucion.json')
Write-Output "E2E $Modo exit=$codigoAg016"
exit $codigoAg016
