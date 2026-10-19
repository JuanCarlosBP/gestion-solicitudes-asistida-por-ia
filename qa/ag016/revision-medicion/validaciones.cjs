'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const exigir = (v, m) => { if (!v) throw new Error(m); };
const json = b => JSON.parse(b.toString('utf8').replace(/^\uFEFF/, ''));
function rutaSegura(root, rel) {
  exigir(typeof rel === 'string' && rel.length > 0 && !/[\\\0\r\n:]/.test(rel) && !rel.startsWith('/') &&
    !rel.split('/').some(s => !s || s === '.' || s === '..'), 'Ruta no admisible.');
  const p = path.resolve(root, rel);
  exigir(!path.relative(root, p).startsWith('..') && !path.isAbsolute(path.relative(root, p)), 'Ruta fuera de carpeta.');
  let here = root;
  for (const part of rel.split('/')) {
    here = path.join(here, part);
    if (fs.existsSync(here)) exigir(!fs.lstatSync(here).isSymbolicLink(), 'Enlace/junction no admitido: '+rel);
  }
  return p;
}
function comprobarFuentes(root, ref) {
  exigir(Array.isArray(ref.archivos) && ref.archivos.length === 460, 'Referencia de 460 fuentes no reconocida.');
  const vistos = new Set(), diferencias = [];
  for (const f of ref.archivos) {
    exigir(!vistos.has(f.ruta.toLowerCase()), 'Ruta repetida.'); vistos.add(f.ruta.toLowerCase());
    const p = rutaSegura(root, f.ruta);
    if (!fs.existsSync(p)) { diferencias.push(f.ruta); continue; }
    const b = fs.readFileSync(p);
    if (b.length !== f.bytes || sha(b) !== f.sha256) diferencias.push(f.ruta);
  }
  exigir(!diferencias.length, 'Las fuentes han cambiado desde el ZIP: '+diferencias.slice(0,10).join(', '));
  return {archivos: vistos.size, diferencias: 0};
}
function parseEnv(b) {
  const r = Object.create(null);
  for (const line of b.toString('utf8').replace(/^\uFEFF/, '').split(/\r?\n/)) {
    if (!line.trim() || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    exigir(i > 0, 'Formato del entorno no reconocido.');
    const k = line.slice(0,i), v = line.slice(i+1);
    exigir(/^[A-Z][A-Z0-9_]*$/.test(k) && !Object.hasOwn(r,k), 'Clave de entorno repetida o inválida.');
    r[k] = v;
  }
  exigir(r.COMPOSE_PROJECT_NAME === 'gestion-solicitudes-ag016' && r.DEMO_ENTORNO === 'local', 'No es el laboratorio AG-016 local.');
  return r;
}
function resumenXml(texto) {
  const m = /<testsuite\s([^>]+)>/.exec(texto);
  exigir(m, 'No se reconoce una suite JUnit.');
  const a = Object.fromEntries([...m[1].matchAll(/([A-Za-z]+)="([^"]*)"/g)].map(x=>[x[1],x[2]]));
  const r = {};
  for (const k of ['tests','failures','errors','skipped']) {
    exigir(/^\d+$/.test(a[k] ?? ''), 'Recuento JUnit ausente: '+k);r[k] = Number(a[k]);
  }
  exigir(r.tests >= r.failures+r.errors+r.skipped, 'Recuentos JUnit incoherentes.');
  return r;
}
function validarRecibo(v, etiqueta) {
  exigir(v && v.exitCode === 0 && typeof v.inicio === 'string' && typeof v.fin === 'string' &&
    Number.isFinite(Date.parse(v.inicio)) && Number.isFinite(Date.parse(v.fin)) && Date.parse(v.fin) >= Date.parse(v.inicio),
    'Recibo no satisfactorio o incompleto: '+etiqueta);
}
function soloLimiteCapacidad(evaluacion) {
  return evaluacion?.estado === 'FAIL' && evaluacion.evidenciaCompleta === true && evaluacion.problemas?.length > 0 &&
    evaluacion.problemas.every(p => p.estado === 'FAIL' && (p.codigo === 'RAM_NOMINAL' || /^LATENCIA_/.test(p.codigo)));
}
function extraerHashJar(j) {
  const x = Array.isArray(j) && j.length===1 ? j[0] : j;
  const h = x?.Hash ?? x?.hash ?? x?.sha256;
  exigir(typeof h === 'string' && /^[a-f0-9]{64}$/i.test(h), 'Huella JAR histórica no reconocida.');return h.toLowerCase();
}
function redactar(s, valores=[]) {
  let t = String(s);
  for (const v of valores.filter(v=>typeof v==='string' && v.length>=8).sort((a,b)=>b.length-a.length)) t=t.split(v).join('[SECRETO_OMITIDO]');
  return t.replace(/-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/g,'[CLAVE_PRIVADA_OMITIDA]')
    .replace(/\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|sk-(?:proj-|svcacct-)[A-Za-z0-9_-]{30,})\b/g,'[TOKEN_OMITIDO]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,'[JWT_OMITIDO]')
    .replace(/(Authorization\s*[:=]\s*Bearer\s+)\S+/gi,'$1[OMITIDO]')
    .replace(/((?:REFRESH-TOKEN|DEMO-RESERVA|XSRF-TOKEN)\s*[=:]\s*)[^\s;,"}]+/gi,'$1[OMITIDO]');
}
module.exports = {sha, exigir, json, rutaSegura, comprobarFuentes, parseEnv, resumenXml, validarRecibo, soloLimiteCapacidad, extraerHashJar, redactar};
