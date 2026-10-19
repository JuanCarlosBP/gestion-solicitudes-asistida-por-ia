/** Recuento independiente desde solicitudes reales. Sin I/O, Docker ni credenciales. */
export const VERSION_CADENCIA = 'AG016-cadencia-1';
export const FASES = Object.freeze([
  {nombre:'calentamiento',inicioMs:0,finMs:600000,intervaloMs:30000},
  {nombre:'nominal',inicioMs:600000,finMs:2400000,intervaloMs:30000},
  {nombre:'pico',inicioMs:2400000,finMs:2700000,intervaloMs:10000},
  {nombre:'operaciones',inicioMs:2700000,finMs:3900000,intervaloMs:30000},
]);
export const DESFASES = Object.freeze([0,1000,2000]);
export const CAMPOS = Object.freeze(['programados','iniciados','validos','fallidos','omitidosPorPausa','omitidosPorSobrecarga','truncadosAlCierre']);
const BASE = [
  'csrf','login-SOLICITANTE','lista-solicitante','proveedores','supervisores',
  'resumen-solicitante','crear','editar','presentar','presentar-replay','csrf','refresh',
  'logout','csrf','login-SUPERVISOR','lista-supervisor','detalle-supervisor','DECISION',
  'logout','csrf','login-AUDITOR','historial','resumen-auditor','detalle-auditor','logout',
];
const conocido = new Set([...BASE.filter(x=>x!=='DECISION'),'aprobar','rechazar']);
const finito = x => typeof x==='number' && Number.isFinite(x) && x>=0;
const exigir=(b,c)=>{if(!b)throw new Error(c);};

/** Reproduce literalmente la aritmética de la versión histórica, no su ejecución HTTP. */
export function agendaHistorica(origen,indice) {
  exigir(finito(origen)&&Number.isInteger(indice)&&indice>=0&&indice<3,'AGENDA_ARGUMENTOS');
  return FASES.map(f=>{
    const objetivos=[];
    for(let t=origen+f.inicioMs+DESFASES[indice];t<origen+f.finMs;t+=f.intervaloMs)objetivos.push(t);
    return {fase:f.nombre,objetivos};
  });
}
/** Agenda corregida: límites e incrementos enteros antes de sumar el origen fraccionario. */
export function agendaEntera(origen,indice) {
  exigir(finito(origen)&&Number.isInteger(indice)&&indice>=0&&indice<3,'AGENDA_ARGUMENTOS');
  return FASES.map(f=>{
    const objetivos=[];
    for(let relativo=f.inicioMs+DESFASES[indice];relativo<f.finMs;relativo+=f.intervaloMs)objetivos.push(origen+relativo);
    return {fase:f.nombre,objetivos};
  });
}
function errorEsperado(op){return op==='crear'?201:['csrf','logout'].includes(op)?204:200;}

/**
 * Primeros45min: 20+60+30 recorridos por visitante;25peticiones por recorrido.
 * Se comprueba CADA posición y slot. Un mero total de4500 no basta.
 * No se admite una petición retrasada al slot siguiente, un200por401 ni una fase alterada.
 */
export function auditarCadencia(datos) {
  try {
    exigir(Array.isArray(datos.peticiones)&&Array.isArray(datos.eventos),'TRAZA_AUSENTE');
    exigir(JSON.stringify(datos.inicio?.fases)===JSON.stringify(FASES),'FASES_DISTINTAS');
    const rows=datos.peticiones.map((p,i)=>({...p,linea:i+1}));
    for(const p of rows) {
      exigir(p && ['A','B','C','OPERADOR'].includes(p.visitante),'VISITANTE_TRAZA');
      if(p.fase==='semilla')continue;
      exigir(finito(p.relativaMs)&&finito(p.ms),'TIEMPO_TRAZA');
      const real=FASES.find(f=>p.relativaMs>=f.inicioMs&&p.relativaMs<f.finMs)?.nombre;
      exigir(p.fase===real,'FASE_NO_COINCIDE_TIEMPO');
    }
    const porVisitante=[], pruebasSlots=[];
    for(const [indice,visitante]of ['A','B','C'].entries()) {
      const originales=datos.carga?.recorridos?.filter(r=>r.visitante===visitante);
      exigir(originales?.length===1,'CONTADOR_VISITANTE_AUSENTE');
      const r=originales[0], fases=[];let numero=0;
      for(const f of FASES.slice(0,3)) {
        const cuenta=r.fases?.[f.nombre];
        exigir(cuenta && CAMPOS.every(k=>Number.isSafeInteger(cuenta[k])&&cuenta[k]>=0),'CONTADORES_INVALIDOS');
        exigir(cuenta.fallidos===0&&cuenta.omitidosPorPausa===0&&cuenta.truncadosAlCierre===0,'FALLO_REAL_O_PAUSA_EN_CARGA');
        const xs=rows.filter(p=>p.visitante===visitante&&p.fase===f.nombre);
        const esperado=(f.finMs-f.inicioMs)/f.intervaloMs;
        exigir(xs.length===esperado*25,'MEZCLA_O_RECORRIDO_AUSENTE');
        const detalles=[];
        for(let n=0;n<esperado;n++) {
          const segmento=xs.slice(n*25,n*25+25);
          const desde=f.inicioMs+DESFASES[indice]+n*f.intervaloMs;
          const hasta=Math.min(f.finMs,desde+f.intervaloMs);
          let anterior=-Infinity;
          for(let j=0;j<25;j++) {
            const p=segmento[j],op=BASE[j]==='DECISION'?(numero%2===0?'aprobar':'rechazar'):BASE[j];
            exigir(p.operacion===op&&conocido.has(p.operacion),'SECUENCIA_O_DECISION_ALTERADA');
            exigir(p.status===errorEsperado(op),'HTTP_NO_ESPERADO_EN_RECORRIDO');
            exigir(p.relativaMs>=desde&&p.relativaMs+p.ms<hasta,'SLOT_REAL_PERDIDO_O_DESBORDADO');
            exigir(p.relativaMs>=anterior,'ORDEN_MONOTONICO_INVALIDO');anterior=p.relativaMs;
          }
          const primero=segmento[0],ultimo=segmento[24];
          detalles.push({slot:n,numeroRecorrido:numero,desdeMs:desde,hastaMs:hasta,
            inicioHttpMs:primero.relativaMs,finHttpMs:ultimo.relativaMs+ultimo.ms,
            lineas:[primero.linea,ultimo.linea],peticiones:25});
          numero++;
        }
        fases.push({fase:f.nombre,programados:esperado,recorridosCompletos:esperado,
          peticiones:xs.length,slotsAusentes:0,slotsDuplicados:0,
          maximoRetrasoInicioMs:Math.max(...detalles.map(d=>d.inicioHttpMs-d.desdeMs))});
        pruebasSlots.push({visitante,fase:f.nombre,slots:detalles});
      }
      const op=r.fases?.operaciones;
      exigir(op&&CAMPOS.every(k=>Number.isSafeInteger(op[k])&&op[k]>=0),'OPERACIONES_CONTADORES_AUSENTES');
      // La fase operativa contiene pausas inducidas; no se inventan allí recorridos ausentes.
      exigir(op.programados===40&&op.iniciados===op.validos&&op.fallidos===0&&op.omitidosPorSobrecarga===0&&op.truncadosAlCierre===0&&op.validos+op.omitidosPorPausa===40,
        'FASE_OPERATIVA_FALLO_O_COBERTURA_INCOMPLETA');
      const obs=rows.filter(p=>p.visitante===visitante&&p.fase==='operaciones'&&p.operacion==='login-SOLICITANTE');
      exigir(obs.length===op.validos,'RECUENTO_OPERATIVO_NO_CORRESPONDE');
      porVisitante.push({visitante,fases,operaciones:op.validos,pausasOperativas:op.omitidosPorPausa});
    }
    return {version:VERSION_CADENCIA,estado:'PASS',primerosMinutos:45,recorridos:330,
      calentamiento:60,nominal:180,pico:90,peticiones:8250,
      metodo:'Cada recorrido de25peticiones con orden,estado exacto,alternancia y slot temporal; no inferido solo de contadores.',
      porVisitante,pruebasSlots};
  } catch(e) {return {version:VERSION_CADENCIA,estado:'FAIL',codigo:e.message};}
}

/**
 * Única conciliación histórica permitida: el patrón exacto observado A2.
 * No aceptar181nominales reales. Exigir180nominales+90pico REALES y el duplicado
 * aritmético del origen observado. Incidencias diferentes NO se eliminan.
 */
export function conciliarContadores(datos,auditoria,{historico=false}={}) {
  if(auditoria.estado!=='PASS')return {aplicada:false,motivo:'AUDITORIA_NO_PASS',datos};
  const carga=datos.carga;
  if(carga?.resultado!=='FAIL')return {aplicada:false,motivo:'SIN_FALLO_DECLARADO',datos};
  try {
    exigir(historico===true,'NO_ES_PASADA_HISTORICA_ACREDITADA');
    exigir(carga.ejecucion==='carga-reloj-a2'&&carga.perfil==='A'&&carga.falloPrincipal===null,'NO_ES_EL_CASO_ACOTADO_A2');
    const codigos=['NOMINAL_NO_COMPLETO_100_POR_CIENTO','SLOTS_PERDIDOS_POR_SOBRECARGA'];
    exigir(carga.incidencias?.length===2&&carga.incidencias.every((x,i)=>x.visitante==='A'&&x.codigo===codigos[i]),'OTRAS_INCIDENCIAS_NO_CONCILIABLES');
    const evInc=datos.eventos.filter(x=>x.tipo==='INCIDENCIA');
    exigir(evInc.length===2&&evInc.every((x,i)=>x.visitante==='A'&&x.codigo===codigos[i]),'EVENTOS_INCIDENCIA_DIFERENTES');
    const om=datos.eventos.filter(x=>x.tipo==='RECORRIDO_OMITIDO'&&x.motivo==='SOBRECARGA');
    exigir(om.length===1&&om[0].visitante==='A'&&om[0].fase==='pico','SOBRECARGA_NO_ES_DUPLICADO_ACOTADO');
    const a=carga.recorridos.find(x=>x.visitante==='A');
    const valores=[['calentamiento',20,20,0],['nominal',60,61,0],['pico',30,29,1]];
    for(const [f,p,n,s]of valores)exigir(a.fases[f].programados===p&&a.fases[f].iniciados===n&&a.fases[f].validos===n&&a.fases[f].omitidosPorSobrecarga===s,'PATRON_CONTADORES_NO_COINCIDE');
    for(const v of carga.recorridos.filter(x=>x.visitante!=='A'))for(const f of FASES.slice(0,3)){
      const c=v.fases[f.nombre],n=(f.finMs-f.inicioMs)/f.intervaloMs;
      exigir(c.programados===n&&c.iniciados===n&&c.validos===n&&c.omitidosPorSobrecarga===0,'OTRO_VISITANTE_DISCREPA');
    }
    const origen=datos.inicio.origenMonoMs;
    const h=agendaHistorica(origen,0),e=agendaEntera(origen,0);
    exigir(h.map(x=>x.objetivos.length).join(',')==='20,61,30,40'&&e.map(x=>x.objetivos.length).join(',')==='20,60,30,40','NO_REPRODUCE_CAUSA_ARITMETICA');
    const nominalExtra=h[1].objetivos.at(-1),picoPrimero=h[2].objetivos[0];
    exigir(nominalExtra<picoPrimero&&picoPrimero-nominalExtra<0.000001,'NO_ES_FRONTERA_DE_REDONDEO');
    const slot=auditoria.pruebasSlots.find(x=>x.visitante==='A'&&x.fase==='pico').slots[0];
    const filaFinal=datos.peticiones[slot.lineas[1]-1];
    // El evento de omisión sigue a la última respuesta del mismo recorrido.
    exigir(Number.isFinite(Date.parse(om[0].fecha))&&om[0].fecha===filaFinal.fecha,'OMISION_NO_CORRELACIONA_CON_DUPLICADO');
    const nuevo=structuredClone(carga);
    const aNuevo=nuevo.recorridos.find(x=>x.visitante==='A');
    for(const f of ['nominal','pico']) {
      const n=f==='nominal'?60:30,c=aNuevo.fases[f];
      c.iniciados=n;c.validos=n;c.omitidosPorSobrecarga=0;c.proporcionValidaProgramada=1;
      // No inventar duración exacta del ciclo a partir del contador mal etiquetado.
      c.latenciaRecorridoDeclaradaAntes=c.latenciaRecorrido;c.latenciaRecorrido=null;
      c.notaLatencia='El agregado histórico por contador pertenece a una fase mal etiquetada. Consultar percentiles HTTP crudos, conservados sin cambios.';
    }
    nuevo.resultado='PASS';nuevo.incidencias=[];
    return {aplicada:true,motivo:'FRONTERA_NOMINAL_PICO_CONTADA_DOS_VECES_POR_FLOAT',
      original:{resultado:carga.resultado,incidencias:carga.incidencias,recorridos:carga.recorridos},
      pruebaAritmetica:{origenMonoMs:origen,nominalExtra,picoPrimero,diferenciaMs:picoPrimero-nominalExtra,
        agendaAnterior:h.map(x=>({fase:x.fase,cantidad:x.objetivos.length})),agendaCorregida:e.map(x=>({fase:x.fase,cantidad:x.objetivos.length}))},
      datos:{...datos,carga:nuevo}};
  }catch(e){return {aplicada:false,motivo:e.message,datos};}
}
