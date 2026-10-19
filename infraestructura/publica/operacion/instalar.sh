#!/usr/bin/env bash
# Instalación del candidato ya construido en el PC. No contiene credenciales ni clona main antiguo.
set -euo pipefail
umask 077
DOMINIO=gestion-empresarial.jcbpsoftware.com
IP=217.154.99.106
BASE=/opt/jcbp-gestion
ESTADO=/var/lib/jcbp-gestion
CONF=/etc/jcbp-gestion
ENTREGA=${1:?Directorio de entrega verificado obligatorio}
[[ $EUID == 0 ]] || { echo 'DETENIDO: requiere sudo.'; exit 1; }
[[ -f /var/lib/jcbp-vps-base/ssh-confirmado ]] || { echo 'DETENIDO: falta confirmación del acceso SSH.'; exit 1; }
[[ $ENTREGA =~ ^/var/lib/jcbp-recepciones/publico-[0-9]{14}$ ]] || { echo 'DETENIDO: ubicación de entrega no autorizada.'; exit 1; }
[[ -f $ENTREGA/MANIFIESTO.json && -f $ENTREGA/version.json ]] || exit 12
. /etc/os-release
[[ $VERSION_ID == 24.04 && $(uname -m) == x86_64 ]] || { echo 'DETENIDO: plataforma distinta.'; exit 13; }
ID=$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["id"])' "$ENTREGA/version.json")
[[ $ID =~ ^publico-[0-9]{14}$ && $ENTREGA == /var/lib/jcbp-recepciones/$ID ]] || exit 14
exec 9>/var/lock/jcbp-gestion-publicacion.lock
flock -n 9 || { echo 'DETENIDO: otra publicación está activa.'; exit 15; }
if [[ -e $ESTADO/instalacion-iniciada ]]; then
 echo 'DETENIDO: ya existe una instalación iniciada. No se repite ni se destruye. Revisar el recibo.'
 exit 16
fi
# Todos los ficheros de la recepción son regulares y están acotados/verificados antes de ejecutar.
python3 - "$ENTREGA" <<'PY'
import hashlib,json,pathlib,sys
root=pathlib.Path(sys.argv[1]);m=json.loads((root/'MANIFIESTO.json').read_text())
expected=set()
for x in m['archivos']:
 p=root/x['ruta']
 if not p.resolve().is_relative_to(root.resolve()) or p.is_symlink() or not p.is_file():raise SystemExit('Ruta no regular')
 if x['ruta'] in expected:raise SystemExit('Ruta duplicada')
 expected.add(x['ruta'])
 h=hashlib.sha256()
 with p.open('rb') as f:
  for b in iter(lambda:f.read(2**20),b''):h.update(b)
 if p.stat().st_size!=x['bytes'] or h.hexdigest()!=x['sha256']:raise SystemExit('Huella distinta: '+x['ruta'])
real={str(p.relative_to(root)) for p in root.rglob('*') if p.is_file()}
if real!=expected|{'MANIFIESTO.json'}:raise SystemExit('Hay archivos fuera del manifiesto')
print('INTEGRIDAD_ENTREGA_PASS')
PY
[[ $(ssh-keygen -lf "$ENTREGA/administrador.pub" -E sha256) == *'SHA256:6PTXu0HwnFCdKKUpRYEY3HtZnFbV0cbI5JhTEzmoLdU'* ]] || { echo 'DETENIDO: destinatario público de copias no coincide.'; exit 17; }
[[ $(dig +short A "$DOMINIO" | sort -u) == "$IP" ]] || { echo 'DETENIDO: DNS A diferente del VPS.'; exit 18; }
[[ -z $(dig +short AAAA "$DOMINIO") ]] || { echo 'DETENIDO: existe AAAA sin validar.'; exit 19; }
[[ -z $(ss -H -ltn '( sport = :80 or sport = :443 )') ]] || { echo 'DETENIDO: 80/443 ya están usados; no se sustituye el servicio.'; exit 20; }
[[ -z $(docker ps -a --filter label=com.docker.compose.project=gestion-solicitudes-publica --format '{{.ID}}') ]] || { echo 'DETENIDO: ya existe el proyecto público.'; exit 21; }
[[ -z $(docker volume ls --filter label=com.docker.compose.project=gestion-solicitudes-publica --format '{{.Name}}') ]] || { echo 'DETENIDO: volumen público previo; no se reutiliza a ciegas.'; exit 22; }
mkdir -p "$ESTADO";chmod 0700 "$ESTADO"
printf '%s\n' "$ID" > "$ESTADO/instalacion-iniciada"
trap 'rc=$?; if [[ $rc != 0 ]]; then printf "INSTALACION_DETENIDA codigo=%s; conservar /var/lib/jcbp-gestion y la recepción. No reinstalar ni borrar.\n" "$rc" >&2; fi' EXIT
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends certbot age openssl
printf '\nCARGANDO IMAGENES COMPROBADAS\n'
docker load -i "$ENTREGA/imagenes.tar.gz"
python3 - "$ENTREGA/version.json" <<'PY'
import json,subprocess,sys
v=json.load(open(sys.argv[1]))
for k,i in v['imagenes'].items():
 j=json.loads(subprocess.check_output(['docker','image','inspect',i['id']]))[0]
 if j['Id']!=i['id'] or j['Architecture']!='amd64' or j['Os']!='linux':raise SystemExit('Imagen inesperada '+k)
 if k!='postgres' and j['Config']['Labels'].get('jcbp.fuentes')!=v['fuentesSHA256']:raise SystemExit('Imagen sin correspondencia con fuentes')
print('IMAGENES_IDENTIFICADAS_PASS')
PY
PG=$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["imagenes"]["postgres"]["id"])' "$ENTREGA/version.json")
PGUID=$(docker run --rm --network none --cap-drop ALL --security-opt no-new-privileges --entrypoint id "$PG" -u postgres)
python3 "$ENTREGA/servidor/generar_configuracion.py" "$PGUID" "$ENTREGA/version.json"
mkdir -p "$BASE/versiones/$ID" "$ESTADO/mantenimiento" "$ESTADO/publico" "$CONF/web" "$CONF/tls" /var/lib/jcbp-acme/.well-known/acme-challenge
chmod 0755 "$CONF/web" "$ESTADO/mantenimiento" "$ESTADO/publico" /var/lib/jcbp-acme /var/lib/jcbp-acme/.well-known /var/lib/jcbp-acme/.well-known/acme-challenge
chown root:101 "$CONF/tls";chmod 0750 "$CONF/tls"
cp -a "$ENTREGA/infraestructura" "$BASE/versiones/$ID/"
cp -a "$ENTREGA/servidor" "$BASE/versiones/$ID/"
cp "$ENTREGA/version.json" "$BASE/versiones/$ID/version.json"
# La recepción era privada (0600/0700); estos son ficheros PÚBLICOS de configuración.
# Los inicializadores montados deben poder leerse por el UID no root de PostgreSQL.
find "$BASE/versiones/$ID" -type d -exec chmod 0755 {} +
find "$BASE/versiones/$ID" -type f -exec chmod 0644 {} +
[[ ! -e $BASE/actual && ! -L $BASE/actual ]] || { echo 'DETENIDO: ya hay versión actual.'; exit 23; }
ln -s "$BASE/versiones/$ID" "$BASE/actual"
cp "$ENTREGA/version.json" "$ESTADO/instancia.json"
cp "$ENTREGA/administrador.pub" "$CONF/respaldo-destinatario.pub"
install -o root -g root -m 0444 "$BASE/actual/infraestructura/publica/nginx-bootstrap.conf" "$CONF/web/nginx.conf"
python3 - "$ENTREGA/version.json" "$ESTADO/publico/version.json" <<'PY'
import json,sys,os
v=json.load(open(sys.argv[1]));out={'version':v['id'],'fuentesSHA256':v['fuentesSHA256'],'estado':'CANDIDATO_EN_REVISION','git008Integrado':False}
with open(sys.argv[2],'x') as f:json.dump(out,f)
os.chmod(sys.argv[2],0o444)
PY
COMPOSE=(docker compose --project-name gestion-solicitudes-publica --env-file "$CONF/publica.env" -f "$BASE/actual/infraestructura/publica/compose.yaml")
"${COMPOSE[@]}" config --quiet
"${COMPOSE[@]}" up -d --no-deps frontend
# Verifica HTTP antes de solicitar el certificado; aún no se sirve la aplicación.
printf 'jcbp-validacion-http\n' > /var/lib/jcbp-acme/.well-known/acme-challenge/preparacion
chmod 0644 /var/lib/jcbp-acme/.well-known/acme-challenge/preparacion
for i in $(seq 1 30); do
 if [[ $(curl -fsS --max-time 3 -H "Host: $DOMINIO" http://127.0.0.1/.well-known/acme-challenge/preparacion 2>/dev/null || true) == 'jcbp-validacion-http' ]]; then break; fi
 sleep 1
done
[[ $(curl -fsS --max-time 5 -H "Host: $DOMINIO" http://127.0.0.1/.well-known/acme-challenge/preparacion) == 'jcbp-validacion-http' ]]
printf '\nCERTIFICADO: validación pública. Si falla, revisar reglas TCP 80/443 de IONOS, sin abrir puertos internos.\n'
# Consentimiento para el servicio gratuito solicitado por el lanzador antes de transferir.
certbot certonly --non-interactive --agree-tos --register-unsafely-without-email --webroot -w /var/lib/jcbp-acme --cert-name "$DOMINIO" -d "$DOMINIO" --keep-until-expiring
install -o root -g 101 -m 0640 "/etc/letsencrypt/live/$DOMINIO/fullchain.pem" "$CONF/tls/fullchain.pem"
install -o root -g 101 -m 0640 "/etc/letsencrypt/live/$DOMINIO/privkey.pem" "$CONF/tls/privkey.pem"
"${COMPOSE[@]}" up -d --no-deps postgres
for i in $(seq 1 90);do P=$("${COMPOSE[@]}" ps -q postgres);[[ -n $P && $(docker inspect -f '{{.State.Health.Status}}' "$P") == healthy ]] && break;sleep 1;done
[[ $(docker inspect -f '{{.State.Health.Status}}' "$P") == healthy ]] || { echo 'DETENIDO: PostgreSQL no inicia.'; exit 24; }
printf '\nPROVISION INICIAL: tres espacios ficticios independientes\n'
"${COMPOSE[@]}" run --no-deps -T --name "jcbp-bootstrap-$ID" --entrypoint java provisionador -Xmx96m -jar /aplicacion/aplicacion.jar --demo-provisionar
printf 'bootstrap terminado\n' > "$ESTADO/bootstrap-completado"
"${COMPOSE[@]}" up -d backend provisionador
install -o root -g root -m 0444 "$BASE/actual/infraestructura/publica/nginx.conf" "$CONF/web/nginx.conf"
F=$("${COMPOSE[@]}" ps -q frontend)
docker exec "$F" nginx -t -c /etc/nginx/jcbp/nginx.conf
docker exec "$F" nginx -s reload -c /etc/nginx/jcbp/nginx.conf
source "$BASE/actual/servidor/comun.sh"
esperar_api
# El instalador no modifica sshd ni UFW; los controles de la base se mantienen.
for servicio in postgres backend provisionador;do CID=$(identidad "$servicio");[[ $(docker inspect -f '{{json .HostConfig.PortBindings}}' "$CID") == '{}' || $(docker inspect -f '{{json .HostConfig.PortBindings}}' "$CID") == null ]] || fallar 'Puerto interno publicado';done
install -o root -g root -m 0755 "$BASE/actual/servidor/renovar_tls.sh" /etc/letsencrypt/renewal-hooks/deploy/jcbp-gestion
systemctl enable --now certbot.timer
certbot renew --cert-name "$DOMINIO" --dry-run --run-deploy-hooks
printf '\nREINICIO CONTROLADO DE CONTENEDORES PROPIOS (no del VPS)\n'
"${COMPOSE[@]}" stop frontend backend provisionador postgres
"${COMPOSE[@]}" up -d
esperar_api
printf 'instalación y reinicio de contenedores comprobados\n' > "$ESTADO/instalacion-completa"
printf '\nDESPLIEGUE_HTTPS_LISTO_PARA_PRUEBAS\n'
printf 'https://%s/demo\n' "$DOMINIO"
bash "$BASE/actual/servidor/informe.sh"
