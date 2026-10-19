import type { ExecFileOptions } from 'node:child_process';

/** Declaraciones para los helpers Playwright que comparten el control Docker de QA. */
export function argumentosCompose(): string[];
export function ejecutarDocker(
  comando: string,
  argumentos: string[],
  opciones?: ExecFileOptions,
): Promise<{ stdout: string; stderr: string }>;

export function ejecutarDockerSync(
  comando: string,
  argumentos: string[],
  opciones: ExecFileOptions & { encoding: 'utf8' },
): string;
