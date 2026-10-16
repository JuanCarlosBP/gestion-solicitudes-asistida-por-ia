import { execFile } from 'node:child_process';
import { resolve, relative, isAbsolute } from 'node:path';
import { promisify } from 'node:util';

// Exclusivo para QA local ficticio, durante la ventana Compose coordinada.
const ejecutar = promisify(execFile);
const raiz = resolve(__dirname, '../..');
const entorno = resolve(raiz, process.env['QA_ENTORNO'] ?? 'infraestructura/.env.example');
const relativo = relative(raiz, entorno);
if (relativo.startsWith('..') || isAbsolute(relativo))
  throw new Error('Entorno QA fuera del workspace.');
const compose = ['compose', '--env-file', entorno, '-f', 'infraestructura/compose.yaml'];
export function uuidFixture(valor: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor))
    throw new Error('UUID de fixture inválido.');
  return valor;
}
export async function sqlFixture(texto: string): Promise<string> {
  const salida = await ejecutar(
    'docker',
    [
      ...compose,
      'exec',
      '-T',
      'postgres',
      'psql',
      '-U',
      'administrador_local',
      '-d',
      'gestion',
      '-v',
      'ON_ERROR_STOP=1',
      '-tAc',
      texto,
    ],
    { cwd: raiz, windowsHide: true, timeout: 15000, maxBuffer: 1024 * 1024 },
  );
  return salida.stdout.trim();
}
export async function reiniciarBackend(): Promise<void> {
  await ejecutar('docker', [...compose, 'restart', 'backend'], {
    cwd: raiz,
    windowsHide: true,
    timeout: 60000,
    maxBuffer: 1024 * 1024,
  });
}
export async function restaurarSupervisor(id: string): Promise<void> {
  await sqlFixture(
    `INSERT INTO gestion.usuarios_roles(usuario_id,rol) VALUES ('${uuidFixture(id)}','SUPERVISOR') ON CONFLICT DO NOTHING;`,
  );
}
