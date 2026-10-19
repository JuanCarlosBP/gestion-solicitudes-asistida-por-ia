'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {createHash}=require('node:crypto');
const SHA_ORIGINAL='3df56cccba1b279462a97b467aa7b29204c1fb779ecef47460af2f77e7826359';
const VERSION='AG016-planificador-entero-1';
const viejo='    for (let objetivo = origen + fase.inicioMs + DESFASES_VISITANTES_MS[indice]; objetivo < origen + fase.finMs; objetivo += fase.intervaloMs) {';
const nuevo=[
 '    // La agenda usa milisegundos relativos enteros; sumar origen solo al esperar.',
 '    // Evita que un redondeo en objetivo+=intervalo duplique una frontera de fase.',
 '    for (let relativoMs = fase.inicioMs + DESFASES_VISITANTES_MS[indice]; relativoMs < fase.finMs; relativoMs += fase.intervaloMs) {',
 '      const objetivo = origen + relativoMs;',
].join('\n');
const sha=b=>createHash('sha256').update(b).digest('hex');
const exigir=(v,m)=>{if(!v)throw Error(m);};
function corregirFuente(bytes){
 exigir(sha(bytes)===SHA_ORIGINAL,'Generador original distinto: no se aplica un parche aproximado.');
 const text=bytes.toString('utf8');exigir(text.split(viejo).length===2,'No hay una sola frontera de planificación para corregir.');
 return text.replace(viejo,nuevo);
}
function componerEjecutable(canonico,root){
 const esperados=['laboratorio.mjs','metricas.mjs','caducidad-carga.mjs','recorrido.mjs'];
 const vistos=[];
 const codigo=canonico.replace(/from '\.\/([a-z-]+\.mjs)'/g,(_,nombre)=>{
   exigir(esperados.includes(nombre)&&!vistos.includes(nombre),'Import local no reconocido.');vistos.push(nombre);
   return 'from '+JSON.stringify(pathToFileURL(path.join(root,'qa/ag016',nombre)).href);
 });
 exigir(vistos.length===4,'El generador no referencia los cuatro módulos originales previstos.');
 return codigo;
}
function escribirSinCambiar(file,b){
 if(fs.existsSync(file))exigir(sha(fs.readFileSync(file))===sha(b),'La copia externa del generador ya existe con otros bytes.');
 else fs.writeFileSync(file,b,{flag:'wx'});
}
function prepararGenerador(root,own){
 const original=fs.readFileSync(path.join(root,'qa/ag016/carga.mjs'));
 const canonico=Buffer.from(corregirFuente(original));
 const dir=path.join(own,'generador');fs.mkdirSync(dir,{recursive:true});
 const archivo=path.join(dir,'carga-planificador-entero.mjs');
 const codigo=Buffer.from(componerEjecutable(canonico.toString('utf8'),root));
 escribirSinCambiar(archivo,codigo);
 escribirSinCambiar(path.join(dir,'carga-canonica-corregida.mjs'),canonico);
 return {archivo,comprobante:{version:VERSION,originalRuta:'qa/ag016/carga.mjs',originalSHA256:SHA_ORIGINAL,
  canonicoSHA256:sha(canonico),ejecutableSHA256:sha(codigo),ejecutableRelativo:path.relative(root,archivo).replaceAll('\\','/'),
  cambios:'Solo agenda por offsets enteros; imports redirigidos a los cuatro módulos originales del repositorio. No cambia HTTP, datos, parámetros, plazos, ni aserciones.',
  productoModificado:false,fuenteOriginalModificada:false}};
}
function validarComprobante(root,proof){
 exigir(proof?.version===VERSION&&proof.originalRuta==='qa/ag016/carga.mjs'&&proof.originalSHA256===SHA_ORIGINAL,'Procedencia del generador no reconocida.');
 const canonico=corregirFuente(fs.readFileSync(path.join(root,'qa/ag016/carga.mjs')));
 const codigo=componerEjecutable(canonico,root);
 exigir(proof.canonicoSHA256===sha(canonico)&&proof.ejecutableSHA256===sha(codigo),'El comprobante no corresponde al cambio mínimo de planificador.');
 exigir(proof.ejecutableRelativo==='tmp/ag016/cierre-chat-lote3/generador/carga-planificador-entero.mjs','Ubicación de ejecutable no autorizada.');
 const p=path.join(root,proof.ejecutableRelativo);
 exigir(!fs.lstatSync(p).isSymbolicLink()&&sha(fs.readFileSync(p))===proof.ejecutableSHA256,'El generador ejecutado ya no coincide.');
 exigir(proof.productoModificado===false&&proof.fuenteOriginalModificada===false,'Declaración de procedencia inesperada.');
 return true;
}
module.exports={SHA_ORIGINAL,VERSION,viejo,nuevo,sha,corregirFuente,componerEjecutable,prepararGenerador,validarComprobante};
