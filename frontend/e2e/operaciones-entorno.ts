import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

// Exclusivo para QA local ficticio, durante la ventana Compose coordinada.
const ejecutarProceso = promisify(execFile);
const raiz = resolve(__dirname, '../..');
const helper = resolve(raiz, 'qa/docker-contexto.mjs');

async function ejecutar(argumentos: string[], timeout: number): Promise<string> {
  try {
    // Node carga el helper como ESM; Playwright no debe transpilarlo como CommonJS.
    const salida = await ejecutarProceso(process.execPath, [helper, '--', ...argumentos], {
      cwd: raiz,
      windowsHide: true,
      shell: false,
      encoding: 'utf8',
      env: { ...process.env, QA_DOCKER_TIMEOUT_MS: String(timeout) },
      // El helper conserva el plazo de la operación y dos lecturas de identidad de 15 s.
      timeout: timeout + 35000,
      maxBuffer: 1024 * 1024,
    });
    return salida.stdout.trim();
  } catch {
    // execFile adjunta argumentos (incluido SQL) al error; no exponerlos al informe.
    throw new Error('Operación Docker QA no completada; diagnóstico sensible omitido.');
  }
}

export function uuidFixture(valor: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor))
    throw new Error('UUID de fixture inválido.');
  return valor;
}
export async function sqlFixture(texto: string): Promise<string> {
  return ejecutar(
    [
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
    15000,
  );
}
export async function reiniciarBackend(): Promise<void> {
  await ejecutar(['restart', 'backend'], 60000);
}
export async function restaurarSupervisor(id: string): Promise<void> {
  await sqlFixture(
    `INSERT INTO gestion.usuarios_roles(usuario_id,rol) VALUES ('${uuidFixture(id)}','SUPERVISOR') ON CONFLICT DO NOTHING;`,
  );
}
