'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const P=require('./planificador-carga.cjs');
const original=fs.readFileSync(path.join(process.cwd(),'qa/ag016/carga.mjs'));
function fixture(fn){const root=fs.mkdtempSync(path.join(os.tmpdir(),'prueba-planificador-'));try{
 fs.mkdirSync(path.join(root,'qa/ag016'),{recursive:true});fs.writeFileSync(path.join(root,'qa/ag016/carga.mjs'),original);
 const own=path.join(root,'tmp/ag016/cierre-chat-lote3');fs.mkdirSync(own,{recursive:true});return fn(root,own);
}finally{fs.rmSync(root,{recursive:true,force:true});}}
test('Generador externo y procedencia coherentes, fuente original intacta',()=>fixture((root,own)=>{
 const r=P.prepararGenerador(root,own);assert(P.validarComprobante(root,r.comprobante));
 assert.equal(P.sha(fs.readFileSync(path.join(root,'qa/ag016/carga.mjs'))),P.SHA_ORIGINAL);
 assert.equal(P.sha(fs.readFileSync(r.archivo)),r.comprobante.ejecutableSHA256);
}));
test('Reabrir preparación idéntica no cambia bytes',()=>fixture((root,own)=>{
 const r=P.prepararGenerador(root,own),b=fs.readFileSync(r.archivo);assert.deepEqual(P.prepararGenerador(root,own),r);assert.deepEqual(fs.readFileSync(r.archivo),b);
}));
test('No sobrescribe copia externa editada',()=>fixture((root,own)=>{
 const r=P.prepararGenerador(root,own);fs.appendFileSync(r.archivo,'\n// editado');const b=fs.readFileSync(r.archivo);
 assert.throws(()=>P.prepararGenerador(root,own));assert.deepEqual(fs.readFileSync(r.archivo),b);
}));
test('Rechaza origen modificado',()=>fixture((root,own)=>{
 fs.appendFileSync(path.join(root,'qa/ag016/carga.mjs'),'\n');assert.throws(()=>P.prepararGenerador(root,own));
}));
for(const k of ['originalSHA256','canonicoSHA256','ejecutableSHA256'])test('Rechaza comprobante falso: '+k,()=>fixture((root,own)=>{
 const r=P.prepararGenerador(root,own);r.comprobante[k]='0'.repeat(64);assert.throws(()=>P.validarComprobante(root,r.comprobante));
}));
test('Rechaza ruta de comprobante fuera de la copia autorizada',()=>fixture((root,own)=>{
 const r=P.prepararGenerador(root,own);r.comprobante.ejecutableRelativo='../../otro';assert.throws(()=>P.validarComprobante(root,r.comprobante));
}));
test('Rechaza archivo ejecutable cambiado tras preparación',()=>fixture((root,own)=>{
 const r=P.prepararGenerador(root,own);fs.appendFileSync(r.archivo,'\n');assert.throws(()=>P.validarComprobante(root,r.comprobante));
}));
