#!/usr/bin/env bash
# Solo respaldo inicial del candidato. No implanta todavía una política de copias periódicas.
set -euo pipefail
umask 077
source /opt/jcbp-gestion/actual/servidor/comun.sh
exec 9>/var/lock/jcbp-gestion-respaldo.lock
flock -n 9 || fallar 'Otro respaldo está en curso.'
[[ ! -f $ESTADO/respaldo-inicial-completado ]] || fallar 'El respaldo inicial ya se ha ejecutado; no repetir.'
MARCA=$(date -u +%Y%m%d%H%M%S)
WORK=$(mktemp -d "$ESTADO/respaldo-$MARCA-XXXXXX")
mkdir "$WORK/datos"
: > "$ESTADO/mantenimiento/activo"
chmod 0644 "$ESTADO/mantenimiento/activo"
# Un fallo no borra volúmenes. La salida de mantenimiento intenta recuperarse por trap.
recuperar() {
 local rc=$?
 compose up -d backend provisionador || true
 rm -f -- "$ESTADO/mantenimiento/activo"
 if [[ $rc != 0 ]];then printf 'RESPALDO_DETENIDO: conservar %s y comprobar salud.\n' "$WORK" >&2;fi
}
trap recuperar EXIT
compose stop backend provisionador
P=$(identidad postgres)
for base in ag016_control ag016_demo_01 ag016_demo_02 ag016_demo_03;do
 docker exec "$P" pg_dump -U ag016_provision --format=custom --dbname="$base" > "$WORK/datos/$base.dump"
 [[ -s $WORK/datos/$base.dump ]] || fallar 'Volcado vacío.'
done
docker exec "$P" pg_dumpall -U ag016_provision --roles-only > "$WORK/datos/roles.sql"
cp "$ESTADO/instancia.json" "$WORK/datos/version.json"
# La configuración privada viaja solamente dentro del archivo cifrado; nunca en el ZIP del chat.
cp -a "$CONF/secretos" "$WORK/datos/secretos"
cp "$CONF/publica.env" "$WORK/datos/publica.env"
# Destino QA nuevo: la fuente no se sobrescribe, el rol runtime no obtiene acceso a QA.
DB="ag016_restore_qa_${MARCA}"
[[ $DB =~ ^ag016_restore_qa_[0-9]{14}$ ]] || fallar 'Destino QA inválido.'
[[ $(pg -c "SELECT count(*) FROM pg_database WHERE datname='$DB'") == 0 ]] || fallar 'Destino QA existente.'
pg -c "CREATE DATABASE \"$DB\""
pg -c "REVOKE ALL ON DATABASE \"$DB\" FROM PUBLIC"
docker exec -i "$P" pg_restore -U ag016_provision --exit-on-error --no-owner --no-privileges --dbname="$DB" < "$WORK/datos/ag016_demo_01.dump"
# Se comparan las tablas de negocio, no solamente el código de salida de pg_restore.
for tabla in proveedores solicitudes conceptos_solicitud decisiones_solicitud eventos_historial;do
 [[ $(docker exec "$P" psql -qAt -v ON_ERROR_STOP=1 -U ag016_provision -d ag016_demo_01 -c "SELECT to_regclass('gestion.$tabla') IS NOT NULL") == t ]] || fallar 'Falta una tabla de negocio esperada.'
 a=$(docker exec "$P" psql -qAt -v ON_ERROR_STOP=1 -U ag016_provision -d ag016_demo_01 -c "SELECT count(*) FROM gestion.$tabla")
 b=$(docker exec "$P" psql -qAt -v ON_ERROR_STOP=1 -U ag016_provision -d "$DB" -c "SELECT count(*) FROM gestion.$tabla")
 [[ $a == "$b" ]] || fallar 'Recuento restaurado diferente.'
 ha=$(docker exec "$P" psql -qAt -v ON_ERROR_STOP=1 -U ag016_provision -d ag016_demo_01 -c "SELECT row_to_json(t)::text FROM gestion.$tabla t ORDER BY id" | sha256sum | cut -d' ' -f1)
 hb=$(docker exec "$P" psql -qAt -v ON_ERROR_STOP=1 -U ag016_provision -d "$DB" -c "SELECT row_to_json(t)::text FROM gestion.$tabla t ORDER BY id" | sha256sum | cut -d' ' -f1)
 [[ $ha == "$hb" ]] || fallar 'El contenido restaurado no coincide.'
 printf '%s: filas=%s; contenido SHA256=%s\n' "$tabla" "$a" "$ha" >> "$WORK/recuentos.txt"
done
# Invalidación solo en la copia QA, respetando los CHECK de V2; nunca en la fuente.
docker exec -i "$P" psql -q -v ON_ERROR_STOP=1 -U ag016_provision -d "$DB" <<'SQL' >/dev/null
BEGIN;
UPDATE gestion.tokens_refresco SET estado='REVOCADO',revocado_en=clock_timestamp(),motivo_revocacion='CIERRE' WHERE estado <> 'REVOCADO';
UPDATE gestion.sesiones_acceso SET revocado_en=clock_timestamp(),motivo_revocacion='CIERRE' WHERE revocado_en IS NULL;
COMMIT;
SQL
[[ $(docker exec "$P" psql -qAt -v ON_ERROR_STOP=1 -U ag016_provision -d "$DB" -c "SELECT (SELECT count(*) FROM gestion.sesiones_acceso WHERE revocado_en IS NULL)+(SELECT count(*) FROM gestion.tokens_refresco WHERE estado='ACTIVO')") == 0 ]] || fallar 'La QA conserva credenciales vigentes.'
# Cifrado estándar age. Segundo destinatario efímero solo para verificar la integridad del archivo cifrado.
age-keygen -o "$WORK/comprobacion.key" 2> "$WORK/generacion-key.txt"
RECIP=$(age-keygen -y "$WORK/comprobacion.key")
PUB=$(cat "$CONF/respaldo-destinatario.pub")
tar -czf "$WORK/respaldo.tar.gz" -C "$WORK/datos" .
age -r "$PUB" -r "$RECIP" -o "$WORK/respaldo.tar.gz.age" "$WORK/respaldo.tar.gz"
age -d -i "$WORK/comprobacion.key" -o "$WORK/verificacion.tar.gz" "$WORK/respaldo.tar.gz.age"
[[ $(sha256sum < "$WORK/respaldo.tar.gz") == $(sha256sum < "$WORK/verificacion.tar.gz") ]] || fallar 'El descifrado de comprobación difiere.'
OUT=/home/jcbpops/gestion-resultados
install -o jcbpops -g jcbpops -m 0600 "$WORK/respaldo.tar.gz.age" "$OUT/RESPALDO_INICIAL_PRIVADO.age"
sha256sum "$OUT/RESPALDO_INICIAL_PRIVADO.age" | awk '{print $1}' > "$OUT/respaldo-sha256.txt"
chown jcbpops:jcbpops "$OUT/respaldo-sha256.txt";chmod 0600 "$OUT/respaldo-sha256.txt"
printf 'cifrado y descifrado de prueba correctos; base QA=%s; respaldo externo pendiente de descarga\n' "$DB" > "$OUT/RESPALDO_RESUMEN.txt"
cat "$WORK/recuentos.txt" >> "$OUT/RESPALDO_RESUMEN.txt"
chown jcbpops:jcbpops "$OUT/RESPALDO_RESUMEN.txt";chmod 0600 "$OUT/RESPALDO_RESUMEN.txt"
# Eliminación únicamente de ficheros temporales generados por esta operación, nunca de bases o volúmenes.
rm -f -- "$WORK/comprobacion.key" "$WORK/generacion-key.txt" "$WORK/respaldo.tar.gz" "$WORK/verificacion.tar.gz"
rm -rf -- "$WORK/datos"
printf '%s\n' "$MARCA" > "$ESTADO/respaldo-inicial-completado"
compose up -d backend provisionador
rm -f -- "$ESTADO/mantenimiento/activo"
esperar_api
trap - EXIT
printf 'RESPALDO_INICIAL_CIFRADO_Y_QA_RESTAURADA; DESCARGA_EXTERNA_PENDIENTE\n'
