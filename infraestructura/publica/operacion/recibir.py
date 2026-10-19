#!/usr/bin/env python3
"""Recibe una entrega de hash explícito. Se envía por SSH, no se obtiene ejecutando un URL."""
import hashlib,os,pathlib,re,subprocess,sys,tarfile

def extraer(archivo,base):
    with tarfile.open(archivo,'r:gz') as tar:
        miembros=tar.getmembers()
        if len(miembros)>1000 or sum(m.size for m in miembros)>6*1024**3:raise RuntimeError('Archivo excede límites')
        usados=set()
        for m in miembros:
            nombre=m.name
            while nombre.startswith('./'):nombre=nombre[2:]
            if nombre in ('','.'):continue
            if '\\' in nombre or '\x00' in nombre:raise RuntimeError('Ruta no admisible')
            p=pathlib.PurePosixPath(nombre)
            if p.is_absolute() or '..' in p.parts or nombre in usados:raise RuntimeError('Ruta insegura o repetida')
            usados.add(nombre)
            if not (m.isdir() or m.isfile()):raise RuntimeError('Enlaces o entradas especiales no admitidos')
            destino=base.joinpath(*p.parts)
            if not destino.resolve().is_relative_to(base.resolve()):raise RuntimeError('Salida del directorio')
            if m.isdir():destino.mkdir(parents=True,exist_ok=True,mode=0o700)
            else:
                destino.parent.mkdir(parents=True,exist_ok=True,mode=0o700)
                with tar.extractfile(m) as entrada,destino.open('xb') as salida:
                    while bloque:=entrada.read(2**20):salida.write(bloque)
                os.chmod(destino,0o600)

def main():
    if os.geteuid()!=0 or len(sys.argv)!=3:raise RuntimeError('Se requiere sudo e identidad explícita')
    identidad,sha=sys.argv[1:]
    if not re.fullmatch(r'publico-\d{14}',identidad) or not re.fullmatch(r'[0-9a-f]{64}',sha):raise RuntimeError('Identidad inválida')
    archivo=pathlib.Path('/home/jcbpops')/(identidad+'.tar.gz')
    if archivo.is_symlink() or not archivo.is_file():raise RuntimeError('Entrega no regular')
    if archivo.stat().st_size>4*1024**3:raise RuntimeError('Entrega demasiado grande')
    h=hashlib.sha256()
    with archivo.open('rb') as f:
        while b:=f.read(2**20):h.update(b)
    if h.hexdigest()!=sha:raise RuntimeError('Huella de transferencia incorrecta')
    raiz=pathlib.Path('/var/lib/jcbp-recepciones');raiz.mkdir(mode=0o700,exist_ok=True)
    if raiz.is_symlink():raise RuntimeError('Directorio de recepción no regular')
    base=raiz/identidad;base.mkdir(mode=0o700)
    extraer(archivo,base)
    os.execv('/bin/bash',['bash',str(base/'servidor/instalar.sh'),str(base)])
if __name__=='__main__':main()
