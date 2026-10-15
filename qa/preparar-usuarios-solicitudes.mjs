import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { prepararDirectorioEvidencias, raizProyecto, rutaDelProyecto } from './rutas-evidencia.mjs';

const ejecutar = promisify(execFile);

/** Cuentas exclusivas de QA sobre Compose local; nunca devuelve ni imprime hashes. */
export async function prepararUsuariosSolicitudes() {
  const entorno = rutaDelProyecto(process.env.QA_ENTORNO || 'infraestructura/.env.example');
  const usuarios = Object.fromEntries(['ajeno', 'multiple', 'inhabilitado'].map((tipo) => {
    const id = randomUUID();
    return [tipo, { id, correo: `qa-${tipo}-${id}@demo.invalid` }];
  }));
  // Los valores interpolados son UUID generados aquí y constantes, nunca entrada externa.
  // Copiar el hash de la cuenta ficticia permite autenticar sin guardar otro secreto.
  // Identidad persiste fechas a segundos: un fixture subsegundo recién creado
  // infringiría fechas_usuario al autenticarse dentro del mismo segundo.
  const sql = ['BEGIN;', ...Object.entries(usuarios).flatMap(([tipo, u]) => [
    `INSERT INTO gestion.usuarios(id,correo,nombre_visible,clave_hash,habilitado,creado_en,actualizado_en)
     SELECT '${u.id}','${u.correo}','QA ${tipo} ${u.id}',clave_hash,${tipo !== 'inhabilitado'},date_trunc('second',now()),date_trunc('second',now())
     FROM gestion.usuarios WHERE correo='solicitante@demo.invalid';`,
    ...((tipo === 'multiple') ? ['SOLICITANTE', 'SUPERVISOR', 'AUDITOR', 'ADMINISTRADOR']
      : [tipo === 'inhabilitado' ? 'SUPERVISOR' : 'SOLICITANTE']).map((rol) =>
      `INSERT INTO gestion.usuarios_roles(usuario_id,rol) VALUES ('${u.id}','${rol}');`),
  ]), 'COMMIT;'].join('\n');
  await ejecutar('docker', ['compose', '--env-file', entorno, '-f', 'infraestructura/compose.yaml',
    'exec', '-T', 'postgres', 'psql', '-U', 'administrador_local', '-d', 'gestion', '-v', 'ON_ERROR_STOP=1', '-c', sql],
  { cwd: raizProyecto, windowsHide: true, timeout: 15000, maxBuffer: 1024 * 1024 });
  return usuarios;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const usuarios = await prepararUsuariosSolicitudes();
    const evidencia = prepararDirectorioEvidencias();
    writeFileSync(resolve(evidencia, 'usuarios-solicitudes.json'), JSON.stringify(usuarios, null, 2) + '\n');
    console.log('PASS: tres cuentas ficticias exclusivas; descriptor sin credenciales.');
  } catch {
    console.error('FAIL: no se pudieron preparar las cuentas ficticias; no se vuelcan datos internos.');
    process.exitCode = 1;
  }
}
