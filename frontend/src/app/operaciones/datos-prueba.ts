import { TestBed } from '@angular/core/testing';
import { defer, of } from 'rxjs';
import { prefijoOperaciones } from './operacion-modelo';
import { PLATAFORMA_OPERACIONES, PlataformaOperaciones } from './plataforma-operaciones';

/** Las pruebas de API son síncronas; E2E comprueba Web Locks y SHA-256 nativos. */
export const plataformaOperacionesPrueba: PlataformaOperaciones = {
  ambito: (usuarioId) => of(usuarioId ?? 'cuenta-prueba'),
  coordinar: <T>(_nombre: string, reclamar: () => T) => defer(() => of(reclamar())),
};
export function prepararOperacionesPrueba(): void {
  for (const clave of Object.keys(localStorage)) {
    if (clave.startsWith(prefijoOperaciones)) localStorage.removeItem(clave);
  }
  TestBed.configureTestingModule({
    providers: [{ provide: PLATAFORMA_OPERACIONES, useValue: plataformaOperacionesPrueba }],
  });
}
