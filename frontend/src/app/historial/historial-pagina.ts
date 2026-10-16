import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HistorialTimeline } from './historial-timeline';
import { TipoRecurso } from './historial-modelo';

@Component({
  selector: 'app-historial-pagina',
  imports: [HistorialTimeline, RouterLink],
  template: `
    @if (tipo) {
      <a
        [routerLink]="[
          tipo === 'SOLICITUD' ? '/solicitudes' : '/proveedores',
          parametros()?.get('id'),
        ]"
        >Volver al detalle</a
      >
    }
    <h1>
      {{
        tipo
          ? 'Historial de ' + (tipo === 'SOLICITUD' ? 'solicitud' : 'proveedor')
          : 'Historial de actividad'
      }}
    </h1>
    <p>Consulta los hechos registrados y las personas que los realizaron.</p>
    <app-historial-timeline [tipo]="tipo" [recursoId]="parametros()?.get('id') ?? ''" />
  `,
})
export class HistorialPagina {
  private readonly ruta = inject(ActivatedRoute);
  readonly parametros = toSignal(this.ruta.paramMap);
  readonly tipo = this.ruta.snapshot.data['tipoRecurso'] as TipoRecurso | undefined;
}
