import { randomUUID } from 'node:crypto';
export class ClienteDemo {
  constructor(base,medir=()=>{}) {this.base=base;this.cookies=new Map();this.contexto=null;this.token=null;this.medir=medir;}
  copiar(){const c=new ClienteDemo(this.base,this.medir);c.cookies=new Map(this.cookies);c.contexto=this.contexto?{...this.contexto}:null;c.token=this.token;return c;}
  selector(){const c=this.contexto;return c?c.espacio+':'+c.generacion+':'+c.reservaId:null;}
  async pedir(ruta,{metodo='GET',cuerpo,clave,selector=this.selector(),bearer=this.token,csrf=true,cookies=true,operacion=ruta}={}){
    // Conexión nueva: las operaciones Docker síncronas pueden impedir que Node
    // procese el cierre keep-alive remoto; no reintentar mutaciones inciertas.
    const headers={Connection:'close'};
    if(cookies){
      const pares=[...this.cookies].filter(([,v])=>ruta===v.path||ruta.startsWith(v.path.endsWith('/')?v.path:v.path+'/')).map(([k,v])=>k+'='+v.valor);
      if(pares.length)headers.Cookie=pares.join('; ');
    }
    if(selector)headers['X-Demo-Contexto']=selector;
    const bootstrap=ruta.startsWith('/api/demo')||ruta.startsWith('/api/autenticacion/')||ruta==='/api/salud';
    if(bearer&&!bootstrap)headers.Authorization='Bearer '+bearer;
    if(metodo!=='GET'&&csrf&&this.cookies.has('XSRF-TOKEN'))headers['X-XSRF-TOKEN']=decodeURIComponent(this.cookies.get('XSRF-TOKEN').valor);
    if(cuerpo!==undefined)headers['Content-Type']='application/json';
    if(clave)headers['Idempotency-Key']=clave;
    const inicio=performance.now();
    let respuesta;
    try{
      const r=await fetch(this.base+ruta,{method:metodo,headers,body:cuerpo===undefined?undefined:JSON.stringify(cuerpo),signal:AbortSignal.timeout(15000),redirect:'error'});
      for(const cookie of r.headers.getSetCookie()){
        const [par,...atributos]=cookie.split(';'),i=par.indexOf('='),nombre=par.slice(0,i),valor=par.slice(i+1);
        const path=atributos.find(a=>a.trim().toLowerCase().startsWith('path='))?.trim().slice(5)??'/';
        if(!valor||atributos.some(a=>a.trim().toLowerCase()==='max-age=0'))this.cookies.delete(nombre);
        else this.cookies.set(nombre,{valor,path});
      }
      const texto=await r.text();let json=null;try{json=texto?JSON.parse(texto):null;}catch{/* Proxy produce errores sin JSON. */}
      respuesta={estado:r.status,json,ms:performance.now()-inicio,cabeceras:r.headers};
      this.medir({operacion,metodo,estado:r.status,ms:respuesta.ms,fecha:new Date().toISOString()});
      return respuesta;
    }catch(error){this.medir({operacion,metodo,estado:0,ms:performance.now()-inicio,fecha:new Date().toISOString(),fallo:error.name});throw error;}
  }
  async csrf(){return this.pedir('/api/autenticacion/csrf',{operacion:'csrf'});}
  async reservar(){
    await this.csrf();const r=await this.pedir('/api/demo/reservas',{metodo:'POST',operacion:'reserva'});
    if(r.estado===201||r.estado===200)this.contexto=r.json;
    return r;
  }
  async login(rol){
    if(this.token){const cierre=await this.pedir('/api/autenticacion/cerrar-sesion',{metodo:'POST',operacion:'logout'});if(cierre.estado!==204)throw Error('Cierre previo falló: '+cierre.estado);this.token=null;}
    await this.csrf();const r=await this.pedir('/api/demo/acceso',{metodo:'POST',cuerpo:{rol},operacion:'login-'+rol});
    if(r.estado===200)this.token=r.json.accessToken;
    return r;
  }
  async renovar(){
    await this.csrf();const r=await this.pedir('/api/autenticacion/renovar',{metodo:'POST',operacion:'refresh'});
    if(r.estado===200)this.token=r.json.accessToken;return r;
  }
  async liberar(){const r=await this.pedir('/api/demo/reserva/liberar',{metodo:'POST',operacion:'liberar'});this.token=null;this.contexto=null;return r;}
  async crear(asunto){return this.pedir('/api/solicitudes',{metodo:'POST',cuerpo:{asunto},clave:randomUUID(),operacion:'crear'});}
}
export function editable(s){return {asunto:s.asunto,descripcion:s.descripcion,proveedorId:s.proveedorId,supervisorId:s.supervisorId,version:s.version,
 conceptos:s.conceptos.map(({id,descripcion,cantidad,unidad,precioUnitario,posicion})=>({id,descripcion,cantidad,unidad,precioUnitario,posicion}))};}
export function exigir(r,estado,etiqueta){if(r.estado!==estado)throw Error(etiqueta+': esperado '+estado+', observado '+r.estado);return r.json;}
