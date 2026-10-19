param([Parameter(Mandatory=$true)][string]$Intento,[ValidateSet('demo','caducidad','completo')][string]$Alcance='completo')
$ErrorActionPreference='Stop'
if($Intento -notmatch '^[a-z0-9-]+$'){throw 'Intento inválido'}
$raizAg016=Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$destinoAg016=Join-Path $raizAg016 "qa/evidencias/ag016/backend-$Intento"
if(Test-Path -LiteralPath $destinoAg016){throw 'Evidencia existente'}
New-Item -ItemType Directory -Path $destinoAg016 | Out-Null
$env:JAVA_HOME='C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot'
$env:MAVEN_USER_HOME=Join-Path $raizAg016 'tmp/maven-user'
$env:TEMP=Join-Path $raizAg016 'tmp/ag016/backend-temporal'
$env:TMP=$env:TEMP
New-Item -ItemType Directory -Path $env:TEMP -Force | Out-Null
$env:GESTION_QA_CONSERVAR_CONTENEDORES='true'
$env:GESTION_QA_PROYECTO_AG016='gestion-solicitudes-ag016'
$env:TESTCONTAINERS_REUSE_ENABLE='true'
$env:TESTCONTAINERS_RYUK_DISABLED='false'
$env:DEMO_QA_ORIGEN='http://127.0.0.1:18086'
$agenteAg016=(Join-Path $raizAg016 'tmp/m2/org/mockito/mockito-core/5.20.0/mockito-core-5.20.0.jar').Replace('\','/')
$argumentosAg016=@('-B','-ntp')
if($Alcance -eq 'demo'){$argumentosAg016+=@('test-compile','failsafe:integration-test','failsafe:verify','-Dit.test=DemoIT')}
elseif($Alcance -eq 'caducidad'){$argumentosAg016+=@('test-compile','failsafe:integration-test','failsafe:verify','-Dit.test=CaducidadDemoIT')}
else{$argumentosAg016+='verify'}
$argumentosAg016+="-DargLine=-javaagent:$agenteAg016 -Duser.home=$($env:TEMP.Replace('\','/'))"
$inicioAg016=(Get-Date).ToString('o')
Get-ChildItem -LiteralPath (Join-Path $raizAg016 'backend/src') -Recurse -File | ForEach-Object {
 @{ruta=[IO.Path]::GetRelativePath($raizAg016,$_.FullName).Replace('\','/');sha256=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLower()}
} | ConvertTo-Json | Set-Content (Join-Path $destinoAg016 'fuentes.json')
Push-Location (Join-Path $raizAg016 'backend')
try{& ./mvnw.cmd @argumentosAg016 *> (Join-Path $destinoAg016 'salida.txt');$codigoAg016=$LASTEXITCODE}finally{Pop-Location}
@{inicio=$inicioAg016;fin=(Get-Date).ToString('o');alcance=$Alcance;argumentos=$argumentosAg016;exitCode=$codigoAg016;conservacion=$true} |
 ConvertTo-Json | Set-Content (Join-Path $destinoAg016 'ejecucion.json')
foreach($carpetaAg016 in @('surefire-reports','failsafe-reports')){
 $salidaAg016=Join-Path $destinoAg016 $carpetaAg016
 New-Item -ItemType Directory -Path $salidaAg016 | Out-Null
 Get-ChildItem -LiteralPath (Join-Path $raizAg016 "backend/target/$carpetaAg016") -Filter 'TEST-*.xml' -ErrorAction SilentlyContinue |
  Where-Object {$_.LastWriteTime -ge [DateTime]::Parse($inicioAg016)} | Copy-Item -Destination $salidaAg016
}
$jarAg016=Join-Path $raizAg016 'backend/target/gestion-solicitudes-0.0.1.jar'
if(Test-Path -LiteralPath $jarAg016){Get-FileHash -LiteralPath $jarAg016 -Algorithm SHA256 | Select-Object Hash | ConvertTo-Json | Set-Content (Join-Path $destinoAg016 'jar.json')}
Write-Output "backend-$Intento exit=$codigoAg016"
exit $codigoAg016
