import { sql, ejecutar, guardar } from './laboratorio.mjs';
const nombre=process.env.AG016_EJECUCION;
if(!nombre||!/^[a-z0-9-]+$/.test(nombre))throw Error('AG016_EJECUCION obligatorio.');
const controles=[];
const atributos=sql('ag016_control',"SELECT rolname||'|'||rolsuper||'|'||rolcreatedb||'|'||rolcreaterole||'|'||rolbypassrls||'|'||rolcanlogin FROM pg_roles WHERE rolname IN ('gestion_app','gestion_migracion','ag016_control_app','ag016_app_01','ag016_app_02','ag016_app_03') ORDER BY rolname;");
for(const fila of atributos.split('\n')){
  const [rol,...a]=fila.split('|');
  if(a.slice(0,4).some(v=>v!=='false')||a[4]!== (rol==='gestion_app'?'false':'true'))throw Error('Privilegio inesperado: '+rol);
}
const destinos=['ag016_demo_01','ag016_demo_02','ag016_demo_03','ag016_control','postgres','template1'];
for(let i=1;i<=3;i++)for(const destino of destinos){
  const rol='ag016_app_0'+i,propia='ag016_demo_0'+i;
  let conecta=false,diagnostico='conexion autorizada';
  try{
    const salida=ejecutar('postgres',['/bin/sh','-c',
      'export PGPASSWORD="$(cat /run/secrets/app0'+i+'.secret)"; exec psql --no-psqlrc -h 127.0.0.1 -U '+rol+' -d '+destino+" -v ON_ERROR_STOP=1 -tAc 'SELECT current_database()'"],{stdio:['pipe','pipe','pipe']}).trim();
    conecta=salida===destino;
  }catch(error){
    const texto=String(error.stderr??'');
    if(error.status!==2||!/pg_hba\.conf (?:rejects connection|entry)|no pg_hba\.conf entry|permission denied for database/.test(texto))
      throw Error('Fallo de conexión no atribuible a autorización; no se considera PASS.');
    diagnostico=/pg_hba\.conf/.test(texto)?'rechazo explícito HBA':'CONNECT denegado explícitamente';
  }
  if(conecta!==(destino===propia))throw Error('Aislamiento CONNECT incumplido: '+rol+' -> '+destino);
  controles.push({rol,destino,conexion:conecta,esperada:destino===propia,diagnostico,resultado:'PASS'});
}
const acl=sql('ag016_control',"SELECT rolname||'|'||datname||'|'||has_database_privilege(rolname,datname,'CONNECT') FROM pg_roles CROSS JOIN pg_database WHERE rolname LIKE 'ag016_app_%' AND datname IN ('ag016_control','ag016_demo_01','ag016_demo_02','ag016_demo_03','postgres','template1') ORDER BY rolname,datname;");
guardar(nombre+'/roles.json',{fecha:new Date().toISOString(),atributos,acl,controles,limite:'template1 ACL PUBLIC conservado por protocolo; acceso efectivo denegado por pg_hba. Prueba TCP local a PostgreSQL real; no equivale aún a validación HTTP de aislamiento.'});
console.log(JSON.stringify({controles:controles.length,resultado:'PASS'}));
