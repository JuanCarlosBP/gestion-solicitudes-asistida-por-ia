/** Reanálisis y auditoría en salida nueva. No sobrescribe ningún recibo histórico. */
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {evaluarDatos,VERSION} from './evaluador-v5.mjs';
import plan from './planificador-carga.cjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const exigir=(v,m)=>{if(!v)throw Error(m);};
try{
 const [run,perfil]=process.argv.slice(2);
 exigir(process.argv.length===4&&/^carga-reloj-[ab][12]$/.test(run??'')&&/^[a-z0-9-]+$/.test(perfil??''),'Argumentos de reanálisis no admitidos.');
 const root=fs.realpathSync('.'),dir=path.join(root,'qa/evidencias/ag016'),folder=path.join(dir,run);
 const original=path.join(root,'qa/ag016/evaluar.mjs');
 exigir(hash(fs.readFileSync(original))==='41932d9233e10310a21da1ce1cf6ffe51e7b4af6e0d5dcd0ec78b6dc5cea0230','Evaluador original distinto.');
 exigir(hash(fs.readFileSync(path.join(root,'qa/ag016/carga.mjs')))===plan.SHA_ORIGINAL,'Generador original distinto.');
 const out=path.join(folder,'evaluacion-revision-v5.json');exigir(!fs.existsSync(out),'El reanálisis v5 ya existe; no se sobrescribe.');
 const {leerPasada}=await import(pathToFileURL(original).href);
 const {datos,fuentes}=leerPasada(folder,path.join(dir,perfil,'perfil.json'));
 let tipo='historico',proof=null;
 if(/-b[12]$/.test(run)){
  const proofFile=path.join(folder,'generador-procedencia.json');
  proof=JSON.parse(fs.readFileSync(proofFile,'utf8'));plan.validarComprobante(root,proof);
  exigir(proof.ejecucion===run,'Procedencia del generador de otra pasada.');tipo='entero';
  fuentes.push({archivo:path.relative(root,proofFile).replaceAll('\\','/'),sha256:hash(fs.readFileSync(proofFile))});
 }
 const anteriores=['evaluacion.json','evaluacion-revision-v4.json'].map(n=>path.join(folder,n)).filter(fs.existsSync).map(f=>({
  archivo:path.relative(root,f).replaceAll('\\','/'),sha256:hash(fs.readFileSync(f)),estado:JSON.parse(fs.readFileSync(f,'utf8')).estado}));
 const salida={evaluadoEn:new Date().toISOString(),...evaluarDatos(datos,{planificador:tipo}),fuentes,
  reanalisis:{version:VERSION,evaluadorSHA256:hash(fs.readFileSync(new URL('./evaluador-v5.mjs',import.meta.url))),
    auditorSHA256:hash(fs.readFileSync(new URL('./auditar-cadencia.mjs',import.meta.url))),
    baseV4SHA256:hash(fs.readFileSync(new URL('./evaluador-v4.mjs',import.meta.url))),
    planificadorSHA256:hash(fs.readFileSync(new URL('./planificador-carga.cjs',import.meta.url))),
    evaluacionesAnteriores:anteriores,generador:proof,
    datosOriginalesModificados:false,nuevaCargaEjecutadaPorEsteComando:false}};
 for(const f of [...fuentes,...anteriores])exigir(hash(fs.readFileSync(path.join(root,f.archivo)))===f.sha256,'Fuente alterada durante lectura: '+f.archivo);
 fs.writeFileSync(out,JSON.stringify(salida,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({ejecucion:run,estado:salida.estado,version:VERSION,criterios:salida.criterios.length,
  problemas:salida.problemas,conciliacion:salida.reconciliacionHistorica.aplicada,archivo:path.relative(root,out)}));
 process.exitCode=salida.estado==='PASS'?0:salida.estado==='FAIL'?1:2;
}catch(e){console.error(e.message);process.exitCode=2;}
