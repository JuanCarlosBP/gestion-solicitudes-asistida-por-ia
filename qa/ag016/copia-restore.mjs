import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { raiz, config, sql, ejecutar, guardar } from './laboratorio.mjs';
export function copiaRestore(base,nombre,qa=process.env.AG016_BASE_QA){
 if(!['ag016_demo_01','ag016_demo_02','ag016_demo_03'].includes(base))throw Error('Fuente no inventariada.');
 if(!/^[a-z0-9-]+$/.test(nombre))throw Error('Identificador evidencia inválido.');
 if(!['ag016_restore_qa_funcional','ag016_restore_qa_funcional_02','ag016_restore_qa_a1','ag016_restore_qa_a2','ag016_restore_qa_b1','ag016_restore_qa_b2','ag016_restore_qa_c1','ag016_restore_qa_c2','ag016_restore_qa_reloj_a1','ag016_restore_qa_reloj_a2','ag016_restore_qa_reloj_b1','ag016_restore_qa_reloj_b2'].includes(qa))throw Error('Destino QA explícito no inventariado.');
 const inicio=new Date().toISOString(),mediciones={};
 if(sql('ag016_control',"SELECT count(*) FROM pg_database WHERE datname='"+qa+"';")!=='0')throw Error('Destino QA debe ser nuevo; no sobrescribir.');
 // Cotejar un snapshot coherente: la carga de ESTE espacio debe estar detenida
 // por el llamador durante copia/cotejo; los demás visitantes continúan.
 const huella=bd=>sql(bd,"SELECT tablename FROM pg_tables WHERE schemaname='gestion' AND tablename NOT IN ('sesiones_acceso','tokens_refresco') ORDER BY tablename;").split('\n').map(tabla=>{
   if(!/^[a-z_]+$/.test(tabla))throw Error('Tabla fuera de lista estructural.');
   return {tabla,datos:sql(bd,"SELECT count(*)||'|'||md5(coalesce(string_agg(row_to_json(t)::text,E'\\n' ORDER BY row_to_json(t)::text),'')) FROM gestion."+tabla+" t;")};
 });
 const antes=huella(base);let t=performance.now();
 const dump=ejecutar('postgres',['pg_dump','-U','ag016_provision','-d',base,'-Fc'],{encoding:null,maxBuffer:64*1024*1024});
 mediciones.copiaMs=performance.now()-t;
 const carpeta=resolve(raiz,'tmp/ag016/copias');mkdirSync(carpeta,{recursive:true});
 const claveRuta=resolve(config.env.AG016_SECRETOS_DIR,'copia.secret');
 if(!existsSync(claveRuta))writeFileSync(claveRuta,randomBytes(32),{mode:0o600,flag:'wx'});
 const key=readFileSync(claveRuta),iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);
 const ciphertext=Buffer.concat([cipher.update(dump),cipher.final()]);
 const cifrado=Buffer.concat([Buffer.from('AG016BACKUP1'),iv,cipher.getAuthTag(),ciphertext]);
 const destino=resolve(carpeta,nombre+'.enc');writeFileSync(destino,cifrado,{mode:0o600,flag:'wx'});
 const descifrar=createDecipheriv('aes-256-gcm',key,iv);descifrar.setAuthTag(cipher.getAuthTag());
 const recuperado=Buffer.concat([descifrar.update(ciphertext),descifrar.final()]);
 if(!dump.equals(recuperado))throw Error('Verificación cifrado fallida.');
 t=performance.now();
 sql('postgres',"CREATE DATABASE "+qa+" OWNER gestion_migracion; REVOKE ALL ON DATABASE "+qa+" FROM PUBLIC;");
 ejecutar('postgres',['pg_restore','-U','ag016_provision','-d',qa,'--exit-on-error'],{input:recuperado,encoding:null,maxBuffer:4*1024*1024});
 // QA no forma parte del registro runtime ni concede CONNECT a sus roles.
 sql(qa,"BEGIN; UPDATE gestion.sesiones_acceso SET revocado_en=clock_timestamp(),motivo_revocacion='CIERRE' WHERE revocado_en IS NULL; UPDATE gestion.tokens_refresco SET estado='REVOCADO',revocado_en=clock_timestamp(),motivo_revocacion='CIERRE' WHERE revocado_en IS NULL; COMMIT;");
 mediciones.restoreMs=performance.now()-t;
 const despues=huella(qa),fuenteDespues=huella(base);
 if(JSON.stringify(antes)!==JSON.stringify(despues))throw Error('Cotejo de negocio/historial/idempotencia no coincide.');
 if(JSON.stringify(antes)!==JSON.stringify(fuenteDespues))throw Error('Fuente cambió durante copia/restauración.');
 const vivas=sql(qa,"SELECT (SELECT count(*) FROM gestion.sesiones_acceso WHERE revocado_en IS NULL)||'|'||(SELECT count(*) FROM gestion.tokens_refresco WHERE estado='ACTIVO');");
 if(vivas!=='0|0')throw Error('Credenciales copiadas siguen activas.');
 const permisos=sql('ag016_control',"SELECT rolname||'|'||has_database_privilege(rolname,'"+qa+"','CONNECT') FROM pg_roles WHERE rolname LIKE 'ag016_app_%' ORDER BY rolname;");
 if(permisos.split('\n').some(l=>!l.endsWith('|false')))throw Error('Runtime puede conectar con QA.');
 const resultado={inicio,fin:new Date().toISOString(),base,qa,estado:'PASS',mediciones,tablas:despues,
   bytesDump:dump.length,bytesCifrado:cifrado.length,sha256Cifrado:createHash('sha256').update(cifrado).digest('hex'),
   sesionesVivasQA:vivas,permisos,fuenteIntacta:true,cifrado:'AES-256-GCM; clave separada fuera de Git',
   limite:'Cotejo excluye sesiones/refresh invalidados solo enQA. Datos/hash de filas se reducen a agregados, nunca se publican credenciales. RPO/RTO no contractuales.'};
 guardar(nombre+'/restore.json',resultado);return resultado;
}
if(process.argv[1]?.endsWith('copia-restore.mjs')){
 const base=process.env.AG016_BASE_COPIA,nombre=process.env.AG016_EJECUCION;
 console.log(JSON.stringify(copiaRestore(base,nombre)));
}
