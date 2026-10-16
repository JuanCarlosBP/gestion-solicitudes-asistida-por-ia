param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('historial', 'completo')]
    [string]$Alcance,
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[0-9]{2}$')]
    [string]$Intento
)

$ErrorActionPreference = 'Stop'
$raizProyecto = Split-Path -Parent $PSScriptRoot
$evidencia = Join-Path $raizProyecto 'qa/evidencias/ag014/reanudacion'
$prefijo = 'backend-' + $Alcance + '-' + $Intento
$log = Join-Path $evidencia ($prefijo + '.log')
if (Test-Path -LiteralPath $log) { throw 'La evidencia de este intento ya existe' }

function Guardar-Inventario([string]$Momento) {
    $contenedores = @(docker ps -aq --no-trunc)
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo inventariar contenedores' }
    $volumenes = @(docker volume ls -q)
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo inventariar volúmenes' }
    $imagenes = @(docker image ls -aq --no-trunc | Sort-Object -Unique)
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo inventariar imágenes' }
    $conservados = @(docker ps -aq --no-trunc --filter 'label=gestion.qa.conservar=true')
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo inventariar QA' }
    $detalles = foreach ($id in $conservados) {
        $linea = docker inspect --format '{{json .Id}}|{{json .State.Status}}|{{json .Config.Labels}}|{{json .Mounts}}' $id
        if ($LASTEXITCODE -ne 0) { throw 'No se pudo inspeccionar contenedor QA' }
        $partes = $linea -split '\|', 4
        [ordered]@{
            id = ($partes[0] | ConvertFrom-Json)
            estado = ($partes[1] | ConvertFrom-Json)
            etiquetas = ($partes[2] | ConvertFrom-Json)
            volumenes = @(($partes[3] | ConvertFrom-Json) | Where-Object Type -eq 'volume' | Select-Object -ExpandProperty Name)
        }
    }
    $inventario = [ordered]@{
        fecha = (Get-Date).ToString('o')
        contenedores = $contenedores
        volumenes = $volumenes
        imagenes = $imagenes
        qaConservados = @($detalles)
    }
    $inventario | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $evidencia ($prefijo + '-' + $Momento + '.json')) -Encoding utf8
    return $inventario
}

$env:JAVA_HOME = 'C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot'
$env:MAVEN_USER_HOME = Join-Path $raizProyecto 'tmp/maven-user'
$env:TEMP = Join-Path $raizProyecto 'tmp/pruebas-backend'
$env:TMP = $env:TEMP
$env:GESTION_QA_CONSERVAR_CONTENEDORES = 'true'
$env:TESTCONTAINERS_REUSE_ENABLE = 'true'
$env:TESTCONTAINERS_RYUK_DISABLED = 'false'
$agente = (Join-Path $raizProyecto 'tmp/m2/org/mockito/mockito-core/5.20.0/mockito-core-5.20.0.jar').Replace('\', '/')
$hogarPruebas = $env:TEMP.Replace('\', '/')
$argumentos = @('-B')
if ($Alcance -eq 'historial') {
    $argumentos += @('test-compile', 'failsafe:integration-test', 'failsafe:verify', '-Dit.test=HistorialIT')
} else {
    $argumentos += 'verify'
}
$argumentos += "-DargLine=-javaagent:$agente -Duser.home=$hogarPruebas"

$antes = Guardar-Inventario 'antes'
[ordered]@{
    fecha = (Get-Date).ToString('o')
    directorio = $PSScriptRoot
    argumentosMaven = $argumentos
    javaHome = $env:JAVA_HOME
    mavenUserHome = $env:MAVEN_USER_HOME
    temp = $env:TEMP
    conservar = $env:GESTION_QA_CONSERVAR_CONTENEDORES
    reuse = $env:TESTCONTAINERS_REUSE_ENABLE
    ryukDisabled = $env:TESTCONTAINERS_RYUK_DISABLED
} | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $evidencia ($prefijo + '-comando.json')) -Encoding utf8

$salida = -1
Push-Location $PSScriptRoot
try {
    & .\mvnw.cmd @argumentos *> $log
    $salida = $LASTEXITCODE
} finally {
    Pop-Location
    $despues = Guardar-Inventario 'despues'
    $faltantes = [ordered]@{}
    foreach ($tipo in @('contenedores', 'volumenes', 'imagenes')) {
        $faltantes[$tipo] = @($antes[$tipo] | Where-Object { $_ -notin $despues[$tipo] })
    }
    [ordered]@{
        fecha = (Get-Date).ToString('o')
        salidaMaven = $salida
        recursosPreviosAusentes = $faltantes
        contenedoresNuevos = @($despues.contenedores | Where-Object { $_ -notin $antes.contenedores })
        volumenesNuevos = @($despues.volumenes | Where-Object { $_ -notin $antes.volumenes })
    } | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $evidencia ($prefijo + '-resultado.json')) -Encoding utf8
}
Get-Content -LiteralPath $log -Tail 35
if (@($faltantes.Values | ForEach-Object { $_ }).Count -gt 0) {
    throw 'El inventario posterior tiene recursos previos ausentes; revisar evidencia'
}
exit $salida
