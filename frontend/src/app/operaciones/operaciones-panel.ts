import {
  afterNextRender,
  Component,
  effect,
  ElementRef,
  inject,
  Injector,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { SesionStore } from '../identidad/sesion-store';
import { DescriptorOperacion, nombresOperacion } from './operacion-modelo';
import { OperacionesSeguras } from './operaciones-seguras';

@Component({
  selector: 'app-operaciones-panel',
  imports: [RouterLink],
  templateUrl: './operaciones-panel.html',
  styleUrl: './operaciones-panel.css',
})
export class OperacionesPanel {
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly consultaManual = signal<string | null>(null);
  readonly servicio = inject(OperacionesSeguras);
  readonly sesion = inject(SesionStore);
  readonly nombres = nombresOperacion;
  constructor() {
    effect(() => this.servicio.cambiarUsuario(this.sesion.usuario()?.id ?? null));
    effect(() => {
      const clave = this.consultaManual();
      if (
        clave &&
        this.servicio
          .operaciones()
          .some(
            (vista) =>
              vista.descriptor.clave === clave && vista.estado === 'COMPLETADA' && vista.resultado,
          )
      ) {
        this.consultaManual.set(null);
        afterNextRender(
          () =>
            this.elemento.nativeElement
              .querySelector<HTMLAnchorElement>(`#resultado-operacion-${clave}`)
              ?.focus(),
          { injector: this.injector },
        );
      }
    });
  }
  consultar(descriptor: DescriptorOperacion): void {
    this.consultaManual.set(descriptor.clave);
    this.servicio.recuperar(descriptor);
  }
}
