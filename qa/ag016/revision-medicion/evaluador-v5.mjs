/** Evaluación offline: conserva v4; añade una reconstrucción independiente de la cadencia. */
import {evaluarDatos as base, recomendarPasadas as recomendarBase, VERSION as VERSION_BASE} from './evaluador-v4.mjs';
import {auditarCadencia,conciliarContadores,VERSION_CADENCIA} from './auditar-cadencia.mjs';
export const VERSION='AG016-evaluador-5';
export function evaluarDatos(datos,{sintetico=false,planificador='no-identificado'}={}) {
 const auditoria=auditarCadencia(datos);
 const conciliacion=conciliarContadores(datos,auditoria,{historico:planificador==='historico'});
 const r=base(conciliacion.datos,{sintetico});
 const original=conciliacion.aplicada?base(datos,{sintetico}):null;
 const extras=[
  {codigo:'CADENCIA_REAL_45_MINUTOS',estado:auditoria.estado,observado:auditoria.estado==='PASS'?{
    recorridos:auditoria.recorridos,nominal:auditoria.nominal,pico:auditoria.pico,peticiones:auditoria.peticiones,
    porVisitante:auditoria.porVisitante}:auditoria,
    esperado:'60calentamiento+180nominales+90pico;25peticiones por recorrido; orden/HTTP/slot exactos; no faltan ni se duplican slots reales.'},
  {codigo:'PLANIFICADOR_Y_CONTABILIDAD',estado:['historico','entero'].includes(planificador)&&
    (datos.carga?.resultado==='PASS'||conciliacion.aplicada)?'PASS':'FAIL',
    observado:{planificador,resultadoOriginal:datos.carga?.resultado??null,conciliacion:conciliacion.motivo},
    esperado:'Planificador identificado; no silenciar fallos. Solo se concilia el patrón histórico A2 demostrado por la traza y el origen exacto.'},
 ];
 if(conciliacion.aplicada)for(const c of r.criterios.filter(c=>['RESULTADO_ARNES','RECORRIDOS_NOMINALES','SLOTS_SIN_SOBRECARGA'].includes(c.codigo))){
   c.observacionHistorica=original.criterios.find(x=>x.codigo===c.codigo);
   c.fundamentoReanalisis='Recuento independiente por slots sobre la traza original; el resumen histórico no se reescribe.';
 }
 const criterios=[...r.criterios,...extras];
 const problemas=[...r.problemas,...extras.filter(x=>x.estado!=='PASS').map(x=>({codigo:x.codigo,estado:x.estado}))];
 const estado=problemas.some(x=>x.estado==='FAIL')?'FAIL':problemas.length?'INCOMPLETO':'PASS';
 return {...r,versionEvaluador:VERSION,criterios,problemas,estado,
   elegibleParaRecomendacion:estado==='PASS'&&!sintetico,evidenciaCompleta:!problemas.some(x=>x.estado==='INCOMPLETO'),
   auditoriaCadencia:auditoria,
   reconciliacionHistorica:{aplicada:conciliacion.aplicada,motivo:conciliacion.motivo,
     ...(conciliacion.aplicada?{original:conciliacion.original,pruebaAritmetica:conciliacion.pruebaAritmetica,problemasEvaluadorV4:original.problemas}:{}),
     medicionesOriginalesModificadas:false,umbralesModificados:false},
   procedenciaPlanificador:{tipo:planificador,agendaVerificada:VERSION_CADENCIA,
     nota:planificador==='entero'?'Se ejecuta copia externa con agenda por enteros; la huella carga.mjs del muestreador sigue siendo la fuente histórica, no el ejecutable corregido. Véase generador-procedencia.json.':'Generador histórico identificado por las fuentes; cadencia real contrastada desde la traza.'},
   limites:[...r.limites,'La conciliación no cambia HTTP, percentiles ni recursos. Se descarta el agregado de duración de ciclos mal etiquetado; no se inventa una duración corregida.']};
}
export function recomendarPasadas(results){
 if(results.length!==4||results.some(r=>r.versionEvaluador!==VERSION||r.auditoriaCadencia?.estado!=='PASS'||
   !['historico','entero'].includes(r.procedenciaPlanificador?.tipo)||r.procedenciaPlanificador.agendaVerificada!==VERSION_CADENCIA)){
  return {estado:'PENDIENTE',perfilCandidato:null,perfilRecomendado:null,pendientes:['Falta una pasada completa o su cadencia/procedencia válida.']};
 }
 const r=recomendarBase(results.map(x=>({...x,versionEvaluador:VERSION_BASE})));
 return {...r,comparacionArnes:'Mismo producto, datos, parámetros y agenda prevista. A usa generador histórico auditado por sus solicitudes; B usa planificador entero equivalente en copia externa documentada. No se afirma identidad de bytes entre esos ejecutables de QA.'};
}
