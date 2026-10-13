import { computed, Injectable, signal } from '@angular/core';
import { Acceso } from './identidad-modelo';

/** Credenciales efímeras: no se persisten ni se incluyen en la navegación. */
@Injectable({ providedIn: 'root' })
export class SesionStore {
  private readonly acceso = signal<Acceso | null>(null);
  private revision = 0;
  readonly usuario = computed(() => this.acceso()?.usuario ?? null);
  readonly autenticado = computed(() => this.acceso() !== null);

  get token(): string | null {
    return this.acceso()?.accessToken ?? null;
  }

  get epoca(): number {
    return this.revision;
  }

  establecer(acceso: Acceso, epoca: number): boolean {
    if (epoca !== this.revision) return false;
    this.acceso.set(acceso);
    return true;
  }

  limpiar(): number {
    this.revision++;
    this.acceso.set(null);
    return this.revision;
  }
}
