#!/usr/bin/env python3
"""Configuración privada NUEVA, sin imprimir valores. No lee ni copia secretos del PC."""
from pathlib import Path
import base64, json, os, re, secrets, subprocess, sys

CONFIRMACION = 'RECREAR_SOLO_BASES_DEMO_FICTICIAS'

def propiedades(claves):
    comun = ('entorno=publico\ncontrol.url=jdbc:postgresql://postgres:5432/ag016_control\n'
             'control.usuario=ag016_control_app\ncontrol.clave='+claves['control']+'\n'
             'semilla.ruta=/run/secrets/semilla.secret\n'
             'espacios=ag016_demo_01,ag016_demo_02,ag016_demo_03\n'
             'cupo=3\nduracion.minutos=60\npool.maximo=3\npeticiones.minuto=240\n'
             'autenticacion.minuto=30\nreservas.minuto=12\n'
             'almacenamiento.bytes=268435456\nmetricas.segundos=0\n')
    for n in range(1,4):
        k=f'ag016_demo_0{n}'
        comun+=f'espacio.{k}.url=jdbc:postgresql://postgres:5432/{k}\n'
        comun+=f'espacio.{k}.usuario=ag016_app_0{n}\nespacio.{k}.clave={claves[f"app0{n}"]}\n'
    provision=comun+'provision.autorizacion='+CONFIRMACION+'\n'
    provision+='admin.url=jdbc:postgresql://postgres:5432/postgres\nadmin.usuario=ag016_provision\nadmin.clave='+claves['admin']+'\n'
    provision+='migracion.usuario=gestion_migracion\nmigracion.clave='+claves['migracion']+'\n'
    return comun,provision

def main():
    if os.geteuid()!=0: raise RuntimeError('Se requiere administración del VPS')
    if len(sys.argv)!=3: raise RuntimeError('Uso interno: uid postgres e inventario')
    pguid=int(sys.argv[1]); manifest=json.loads(Path(sys.argv[2]).read_text())
    if not 100 <= pguid < 65000: raise RuntimeError('UID PostgreSQL no válido')
    conf=Path('/etc/jcbp-gestion'); secreto=conf/'secretos'
    if secreto.exists(): raise RuntimeError('Ya existen secretos: no sobrescribir ni rotar a ciegas')
    conf.mkdir(mode=0o700,exist_ok=True); secreto.mkdir(mode=0o700)
    def escribir(nombre,contenido,uid):
        f=secreto/nombre
        fd=os.open(f,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o400)
        with os.fdopen(fd,'w') as out: out.write(contenido)
        os.chown(f,uid,uid); os.chmod(f,0o400)
    claves={k:secrets.token_urlsafe(32) for k in ('admin','migracion','control','app01','app02','app03')}
    for k,v in claves.items(): escribir(k+'.secret',v,pguid)
    escribir('semilla.secret',base64.b64encode(secrets.token_bytes(32)).decode(),10001)
    runtime,provision=propiedades(claves)
    escribir('runtime.properties',runtime,10001);escribir('provision.properties',provision,10001)
    privada=secreto/'identidad-privada.pem';publica=secreto/'identidad-publica.pem'
    subprocess.run(['openssl','genpkey','-algorithm','RSA','-pkeyopt','rsa_keygen_bits:3072','-out',str(privada)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    subprocess.run(['openssl','pkey','-in',str(privada),'-pubout','-out',str(publica)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    for f in (privada,publica): os.chown(f,10001,10001);os.chmod(f,0o400)
    imagenes=manifest['imagenes']
    for k in ('backend','frontend','postgres'):
        i=imagenes[k]
        if not re.fullmatch(r'sha256:[a-f0-9]{64}',i['id']): raise RuntimeError('ID de imagen inválido')
    # Los IDs inmutables impiden que una etiqueta posterior altere la ejecución.
    env='BACKEND_IMAGEN='+imagenes['backend']['id']+'\nFRONTEND_IMAGEN='+imagenes['frontend']['id']+'\nPG_IMAGEN='+imagenes['postgres']['id']+'\n'
    fd=os.open(conf/'publica.env',os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
    with os.fdopen(fd,'w') as f: f.write(env)
    print('CONFIGURACION_PUBLICA_GENERADA. Valores privados omitidos.')

if __name__=='__main__': main()
