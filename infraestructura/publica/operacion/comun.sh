#!/usr/bin/env bash
# Operaciones limitadas al despliegue inventariado; no se carga código del entorno del usuario.
set -euo pipefail
DOMINIO=gestion-empresarial.jcbpsoftware.com
PROYECTO=gestion-solicitudes-publica
BASE=/opt/jcbp-gestion
ESTADO=/var/lib/jcbp-gestion
CONF=/etc/jcbp-gestion
fallar() { printf 'DETENIDO: %s\n' "$*" >&2; exit 1; }
[[ $EUID == 0 ]] || fallar 'Se requiere sudo para administrar este despliegue.'
[[ -f /var/lib/jcbp-vps-base/ssh-confirmado ]] || fallar 'La base y la segunda conexión SSH no constan como confirmadas.'
[[ -f $ESTADO/instancia.json && -f $CONF/publica.env ]] || fallar 'Instancia pública no preparada.'
[[ -f $BASE/actual/infraestructura/publica/compose.yaml ]] || fallar 'Referencia de versión no preparada.'
compose() { docker compose --project-name "$PROYECTO" --env-file "$CONF/publica.env" -f "$BASE/actual/infraestructura/publica/compose.yaml" "$@"; }
identidad() {
 local servicio=$1 id
 [[ $servicio =~ ^(postgres|backend|provisionador|frontend)$ ]] || fallar 'Servicio no autorizado.'
 mapfile -t ids < <(docker ps -a --no-trunc --filter "label=com.docker.compose.project=$PROYECTO" --filter "label=com.docker.compose.service=$servicio" --filter 'label=com.docker.compose.oneoff=False' --format '{{.ID}}')
 [[ ${#ids[@]} == 1 && ${ids[0]} =~ ^[a-f0-9]{64}$ ]] || fallar "No hay un único contenedor de $servicio"
 id=${ids[0]}
 [[ $(docker inspect --format '{{index .Config.Labels "com.docker.compose.project"}}/{{index .Config.Labels "com.docker.compose.service"}}' "$id") == "$PROYECTO/$servicio" ]] || fallar 'Identidad Docker cambió.'
 printf '%s' "$id"
}
pg() { local id; id=$(identidad postgres); docker exec -i "$id" psql --no-psqlrc -qAt -v ON_ERROR_STOP=1 -U ag016_provision -d ag016_control "$@"; }
esperar_api() {
 local i contenido
 for i in $(seq 1 90); do
  contenido=$(curl --silent --show-error --fail --max-time 4 --resolve "$DOMINIO:443:127.0.0.1" "https://$DOMINIO/api/salud" 2>/dev/null || true)
  if [[ $contenido == '{"estado":"DISPONIBLE"}' ]]; then return 0; fi
  sleep 1
 done
 fallar 'La API no está disponible por HTTPS después de la espera acotada.'
}
