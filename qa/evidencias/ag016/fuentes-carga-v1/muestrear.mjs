import { existsSync, readFileSync, appendFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { raiz, config, identidad, docker, guardar } from './laboratorio.mjs';
import { muestraRecursos, limitesActuales } from './metricas.mjs';
import { parametrosPublicos } from './parametros-publicos.mjs';
const nombre=process.env.AG016_EJECUCION;
if(!nombre||!/^[a-z0-9-]+$/.test(nombre))throw Error('Ejecución obligatoria.');
const carpeta=resolve(raiz,'qa/evidencias/ag016',nombre);
const salida=resolve(carpeta,'recursos.jsonl');
const inicio=new Date().toISOString();
// Capturar antes de la ventana; el generador prepara los datos por separado.
const fuentes=['qa/evidencias/ag016/contrato-carga.json','qa/ag016/carga.mjs','qa/ag016/recorrido.mjs',
 'qa/ag016/cliente.mjs','qa/ag016/metricas.mjs','qa/ag016/muestrear.mjs','qa/ag016/perfil.mjs','qa/ag016/parametros-publicos.mjs',
 'qa/ag016/plazo-arranque.mjs','qa/ag016/laboratorio.mjs','qa/ag016/copia-restore.mjs','qa/ag016/operar.mjs',
 'infraestructura/demo/compose.yaml','infraestructura/demo/nginx-local.conf','infraestructura/demo/inicializar.sh',
 'infraestructura/demo/pg_hba.conf','backend/target/gestion-solicitudes-0.0.1.jar'];
function incluir(directorio){for(const entrada of readdirSync(resolve(raiz,directorio),{withFileTypes:true})){
 const ruta=directorio+'/'+entrada.name;if(entrada.isDirectory())incluir(ruta);else fuentes.push(ruta);
}}
incluir('frontend/dist/gestion-solicitudes-frontend/browser');
const huellas={fecha:inicio,perfil:config.env.PERFIL_RECURSOS,parametros:parametrosPublicos(config.env.AG016_SECRETOS_DIR),archivos:fuentes.sort().map(ruta=>({ruta,sha256:createHash('sha256').update(readFileSync(resolve(raiz,ruta))).digest('hex')}))};
// Señal explícita del generador; el preseed no cuenta dentro de los65min.
const senal=resolve(carpeta,'inicio-medicion.json');
const limiteEspera=Date.now()+15*60000;
while(!existsSync(senal)){if(Date.now()>limiteEspera)throw Error('Carga no inició medición en15min.');await new Promise(r=>setTimeout(r,1000));}
if(existsSync(salida))throw Error('Muestras ya existentes.');
writeFileSync(salida,'',{flag:'wx'});
guardar(nombre+'/huellas-version.json',huellas);
guardar(nombre+'/cuotas-inicio.json',{fecha:new Date().toISOString(),perfil:config.env.PERFIL_RECURSOS,limites:limitesActuales(),reservaSO_MiB:Number(config.env.RESERVA_SO_MIB)});
const contrato=JSON.parse(readFileSync(senal,'utf8'));
const desde=Date.parse(contrato.inicio),hasta=desde+65*60000;
if(!Number.isFinite(desde))throw Error('Señal inicio inválida.');
while(Date.now()<hasta){
 const t=Date.now();
 try{appendFileSync(salida,JSON.stringify(muestraRecursos())+'\n');}
 catch(error){appendFileSync(salida,JSON.stringify({fecha:new Date().toISOString(),error:error.message})+'\n');}
 await new Promise(r=>setTimeout(r,Math.max(1,10000-(Date.now()-t))));
}
guardar(nombre+'/cuotas-fin.json',{fecha:new Date().toISOString(),limites:limitesActuales(),parametros:parametrosPublicos(config.env.AG016_SECRETOS_DIR)});
const i=identidad('backend');
const logs=docker(['logs','--since',new Date(desde).toISOString(),i.id],{stdio:['pipe','pipe','pipe'],maxBuffer:16*1024*1024});
writeFileSync(resolve(carpeta,'jvm-metricas.txt'),logs.split('\n').filter(l=>l.includes('DEMO_METRICAS')).join('\n')+'\n',{flag:'wx'});
// NMT del reinicio controlado: reservado/comprometido, distinto de RSS físico.
// Conservar el bloque permite cuantificar nativa sin sumar dos veces heap/cache.
const nmt=[];let bloque=false;
for(const linea of logs.split('\n')){
 if(linea.includes('Native Memory Tracking:'))bloque=true;
 if(bloque&&/^\d{4}-\d{2}-\d{2}T/.test(linea))bloque=false;
 if(bloque)nmt.push(linea);
}
writeFileSync(resolve(carpeta,'jvm-nmt.txt'),nmt.join('\n')+'\n',{flag:'wx'});
console.log(JSON.stringify({estado:'MUESTREO_COMPLETO',inicio:contrato.inicio,fin:new Date().toISOString()}));
