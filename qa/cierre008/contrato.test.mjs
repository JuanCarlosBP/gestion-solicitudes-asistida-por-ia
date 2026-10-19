import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { comprobarContrato } from './verificar-openapi.mjs';
const esperado = JSON.parse(fs.readFileSync(new URL('./operaciones-esperadas.json', import.meta.url)));
function fixture() {
  const doc = { openapi: '3.1.0', paths: {}, components: { schemas: { Salida: { type: 'object' } } } };
  for (const e of esperado) (doc.paths[e.ruta] ??= {})[e.metodo.toLowerCase()] = { responses: { '200': { content: { 'application/json': { schema: { $ref: '#/components/schemas/Salida' } } } } } };
  return doc;
}
test('25 operaciones y 21 rutas del código', () => { const r=comprobarContrato(fixture(),esperado);assert.equal(r.operaciones,25);assert.equal(r.rutas,21);assert.equal(r.referenciasResueltas,25); });
test('rechaza una operación que desaparece', () => {const d=fixture();delete d.paths['/api/proveedores'].post;assert.throws(()=>comprobarContrato(d,esperado),/Inventario/);});
test('rechaza un endpoint no inventariado', () => {const d=fixture();d.paths['/api/extra']={get:{responses:{200:{}}}};assert.throws(()=>comprobarContrato(d,esperado),/Inventario/);});
test('rechaza método cambiado aunque conserve ruta', () => {const d=fixture();d.paths['/api/proveedores'].delete=d.paths['/api/proveedores'].post;delete d.paths['/api/proveedores'].post;assert.throws(()=>comprobarContrato(d,esperado),/Inventario/);});
test('no confunde metadatos de path con métodos', () => {const d=fixture();d.paths['/api/salud'].parameters=[];assert.equal(comprobarContrato(d,esperado).estado,'PASS');});
test('rechaza referencia rota', () => {const d=fixture();delete d.components.schemas.Salida;assert.throws(()=>comprobarContrato(d,esperado),/sin destino/);});
test('rechaza referencia externa no prevista', () => {const d=fixture();d.components.schemas.Salida={$ref:'https://example.invalid/esquema'};assert.throws(()=>comprobarContrato(d,esperado),/externa/);});
test('rechaza documento inválido', () => assert.throws(()=>comprobarContrato({openapi:'2.0'},esperado),/inválido/));
test('rechaza operación sin respuestas', () => {const d=fixture();d.paths['/api/salud'].get.responses={};assert.throws(()=>comprobarContrato(d,esperado),/sin respuestas/);});
test('rechaza inventario duplicado', () => assert.throws(()=>comprobarContrato(fixture(),[...esperado,esperado[0]]),/Inventario/));
test('referencias internas recursivas no crean un bucle de resolución', () => {const d=fixture();d.components.schemas.Salida.properties={otra:{$ref:'#/components/schemas/Salida'}};assert.equal(comprobarContrato(d,esperado).estado,'PASS');});
