#!/usr/bin/env bash
set -euo pipefail
source /opt/jcbp-gestion/actual/servidor/comun.sh
OUT=/home/jcbpops/gestion-resultados
install -d -o jcbpops -g jcbpops -m 0700 "$OUT"
python3 - "$ESTADO/instancia.json" "$OUT/INFORME_PUBLICACION.json" <<'PY'
import json,os,subprocess,sys,datetime
v=json.load(open(sys.argv[1]));rows=[]
def run(args):return subprocess.check_output(args,text=True).strip()
for name in ('postgres','backend','provisionador','frontend'):
 ids=run(['docker','ps','-a','--no-trunc','--filter','label=com.docker.compose.project=gestion-solicitudes-publica','--filter','label=com.docker.compose.service='+name,'--filter','label=com.docker.compose.oneoff=False','--format','{{.ID}}']).splitlines()
 if len(ids)!=1:raise SystemExit('No hay un contenedor único de '+name)
 data=json.loads(run(['docker','inspect',ids[0]]))[0];h=data['HostConfig'];state=data['State']
 rows.append({'servicio':name,'id':data['Id'],'imagen':data['Image'],'estado':state['Status'],'salud':state.get('Health',{}).get('Status'),'reinicios':data['RestartCount'],'memoriaLimite':h['Memory'],'nanoCPUs':h['NanoCpus'],'puertos':h.get('PortBindings'),'soloLectura':h['ReadonlyRootfs'],'capacidadesRetiradas':h['CapDrop'],'reinicio':h['RestartPolicy']})
result={'fecha':datetime.datetime.now(datetime.timezone.utc).isoformat(),'version':v['id'],'fuentesSHA256':v['fuentesSHA256'],'url':'https://gestion-empresarial.jcbpsoftware.com/demo','runtime':rows,'certificado':run(['openssl','x509','-in','/etc/jcbp-gestion/tls/fullchain.pem','-noout','-issuer','-subject','-dates']), 'renovacionTemporizador':run(['systemctl','is-active','certbot.timer']),'relojSincronizado':run(['timedatectl','show','--property=NTPSynchronized','--value']), 'memoria':run(['free','-m']),'disco':run(['df','-h','/']), 'estado':'CANDIDATO_DESPLEGADO_PENDIENTE_REVISION','pendientes':['Revisión de pantallas por el propietario y el tutor','Revisión y cierre de GitHub 008','Copia externa y recuperación global de operador','Prueba final con PC apagado y reinicio completo del VPS']}
with open(sys.argv[2],'w') as f:json.dump(result,f,indent=2,ensure_ascii=False)
os.chown(sys.argv[2],1000,1000);os.chmod(sys.argv[2],0o600)
print(json.dumps(result,indent=2,ensure_ascii=False))
PY
