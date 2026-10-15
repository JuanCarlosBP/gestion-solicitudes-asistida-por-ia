import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { prepararDirectorioEvidencias, raizProyecto } from './rutas-evidencia.mjs';
const evidencia = prepararDirectorioEvidencias();
const baseline = resolve(raizProyecto, 'qa/evidencias/ag014');
const entrada = JSON.parse(readFileSync(resolve(baseline,'entrada.json'),'utf8'));
const sha = datos => createHash('sha256').update(datos).digest('hex');
const inicial = new Map(entrada.archivos.map(a=>[a.ruta,a.sha256]));
const protegidos = entrada.protegidos.map(a=>({...a,observado:existsSync(resolve(raizProyecto,a.ruta))?sha(readFileSync(resolve(raizProyecto,a.ruta))):null}));
const alterados = protegidos.filter(a=>a.sha256!==a.observado);
const prefijo=readFileSync(resolve(baseline,'registro-entrada.csv'));
const csv=readFileSync(resolve(raizProyecto,'docs/trazabilidad/ejecuciones-agentes.csv'));
const prefijoConservado=csv.subarray(0,prefijo.length).equals(prefijo);
const excluir=new Set(['.git','node_modules','tmp','temp','target','dist','.angular','test-results','playwright-report','coverage']);
const autogenerados=new Set(['entrega-manifiesto.json','entrega-integridad.json','fuentes-finales.json','manifiesto-commits.json']);
const archivos=[], salidasExistentes=[];
function recorrer(dir) {
  for(const entrada of readdirSync(dir,{withFileTypes:true})) {
    if(excluir.has(entrada.name)||/^\.env(?:$|\.(?!example$))/.test(entrada.name)) continue;
    if(entrada.isSymbolicLink()) throw new Error('No seguir enlaces en manifiesto.');
    const absoluto=resolve(dir,entrada.name),ruta=relative(raizProyecto,absoluto).replaceAll('\\','/');
    if(entrada.isDirectory()){recorrer(absoluto);continue;}
    if(ruta.startsWith('qa/evidencias/ag014/')&&autogenerados.has(entrada.name)){salidasExistentes.push(ruta);continue;}
    if(/\.(?:pem|key|p12|pfx|keystore)$/.test(ruta))continue;
    if(ruta.endsWith('.log')&&!ruta.startsWith('qa/evidencias/'))continue;
    const contenido=readFileSync(absoluto);archivos.push({ruta,bytes:contenido.length,sha256:sha(contenido)});
  }
}
recorrer(raizProyecto);archivos.sort((a,b)=>a.ruta.localeCompare(b.ruta));
const rutas=new Set(archivos.map(a=>a.ruta));
// Este único preparador se escribió antes de tomar la fotografía de entrada.
const preparadoresIniciales=new Set(['qa/preparar-ag014.mjs']);
const creados=archivos.filter(a=>!inicial.has(a.ruta)||preparadoresIniciales.has(a.ruta));
const modificados=archivos.filter(a=>inicial.has(a.ruta)&&inicial.get(a.ruta)!==a.sha256);
const eliminados=[...inicial.keys()].filter(r=>!rutas.has(r));
const fecha=new Date().toISOString(),guardar=(n,v)=>writeFileSync(resolve(evidencia,n),JSON.stringify(v,null,2)+'\n');
guardar('entrega-integridad.json',{fecha,protegidos:protegidos.length,alterados,prefijoCsvBytes:prefijo.length,prefijoCsvConservado:prefijoConservado,resultado:alterados.length||!prefijoConservado?'FAIL':'PASS'});
guardar('entrega-manifiesto.json',{fecha,creados,modificados,eliminados,salidasAutogeneradas:[...autogenerados],preparadoresAntesDeFotografia:[...preparadoresIniciales],limite:'Comparación SHA256 desde entradaAG014 más preparador inicial conocido; no es diff Git.'});
guardar('fuentes-finales.json',{fecha,archivos:archivos.filter(a=>/^(?:backend|frontend|infraestructura|qa)\//.test(a.ruta)&&!a.ruta.startsWith('qa/evidencias/')||a.ruta==='.github/workflows/ci.yml')});
const pendientes=new Set([...creados,...modificados].map(a=>a.ruta));
for(const ruta of salidasExistentes)pendientes.add(ruta);
for(const n of autogenerados)pendientes.add(relative(raizProyecto,resolve(evidencia,n)).replaceAll('\\','/'));
const grupos=[
 ['docs: definir historial empresarial007 y decisiones de consulta',r=>r.startsWith('especificaciones/007-')||r.includes('ADR-0008')],
 ['feat: persistir historial atómico y proyectar decisiones V5',r=>r.startsWith('backend/')],
 ['feat: consultar historial y resumen autorizado en Angular',r=>r.startsWith('frontend/')],
 ['test: verificar historial y regresión en PostgreSQL y CI',r=>r.startsWith('.github/')||r.startsWith('qa/')&&!r.startsWith('qa/evidencias/')||r==='.gitignore'],
 ['docs: proponer demo operacion y entrega008 sin implementacion',r=>r.startsWith('especificaciones/008-')],
 ['docs: registrar validación y evidencias AG014',()=>true]
];
guardar('manifiesto-commits.json',{fecha,operacionesGit:['git status --short inicial antes de leer prohibición; salida vacía'],lecturaMetadatosGit:['.git/HEAD para confirmar rama, sin comando Git'],escriturasGit:false,grupos:grupos.map(([mensajeSugerido,seleccionar])=>{const seleccionados=[...pendientes].filter(seleccionar);seleccionados.forEach(r=>pendientes.delete(r));return{mensajeSugerido,archivos:seleccionados}}),nota:'Propuesta para selección y Git humanos; no acredita aceptación/integración/publicación.'});
console.log((alterados.length||!prefijoConservado?'FAIL':'PASS')+': '+protegidos.length+' protegidos/'+alterados.length+' alterados; CSV '+prefijoConservado+'; '+creados.length+' creados/'+modificados.length+' modificados/'+eliminados.length+' eliminados.');
process.exitCode=alterados.length||!prefijoConservado?1:0;
