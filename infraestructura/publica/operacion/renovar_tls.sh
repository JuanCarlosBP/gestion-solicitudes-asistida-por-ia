#!/usr/bin/env bash
set -euo pipefail
[[ $EUID == 0 ]] || exit 10
DOMINIO=gestion-empresarial.jcbpsoftware.com
ORIGEN=/etc/letsencrypt/live/$DOMINIO
DESTINO=/etc/jcbp-gestion/tls
[[ ${RENEWED_LINEAGE:-$ORIGEN} == "$ORIGEN" ]] || exit 0
[[ -d $DESTINO && -f $ORIGEN/fullchain.pem && -f $ORIGEN/privkey.pem ]] || exit 11
openssl x509 -in "$ORIGEN/fullchain.pem" -noout -checkhost "$DOMINIO" >/dev/null
openssl x509 -in "$ORIGEN/fullchain.pem" -noout -checkend 3600 >/dev/null
cert=$(openssl x509 -in "$ORIGEN/fullchain.pem" -pubkey -noout | openssl pkey -pubin -outform DER 2>/dev/null | sha256sum)
priv=$(openssl pkey -in "$ORIGEN/privkey.pem" -pubout -outform DER 2>/dev/null | sha256sum)
[[ $cert == "$priv" ]] || exit 12
# Se monta el directorio, no el inode de cada fichero: la sustitución se ve dentro de Nginx.
install -o root -g 101 -m 0640 "$ORIGEN/fullchain.pem" "$DESTINO/fullchain.pem.nuevo"
install -o root -g 101 -m 0640 "$ORIGEN/privkey.pem" "$DESTINO/privkey.pem.nuevo"
mv "$DESTINO/fullchain.pem.nuevo" "$DESTINO/fullchain.pem"
mv "$DESTINO/privkey.pem.nuevo" "$DESTINO/privkey.pem"
mapfile -t ids < <(docker ps --no-trunc --filter label=com.docker.compose.project=gestion-solicitudes-publica --filter label=com.docker.compose.service=frontend --filter label=com.docker.compose.oneoff=False --format '{{.ID}}')
[[ ${#ids[@]} == 1 ]] || exit 13
docker exec "${ids[0]}" nginx -t -c /etc/nginx/jcbp/nginx.conf
docker exec "${ids[0]}" nginx -s reload -c /etc/nginx/jcbp/nginx.conf
printf 'CERTIFICADO_COPIADO_Y_NGINX_RECARGADO\n'
