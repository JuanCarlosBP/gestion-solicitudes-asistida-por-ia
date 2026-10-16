import { Component, DestroyRef, effect, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { HistorialApi, ResumenInicio } from '../historial/historial-api';
import { SesionStore } from '../identidad/sesion-store';
import { PermisosSolicitudes } from '../solicitudes/solicitudes-permisos';
import { SaludApi } from './salud-api';
@Component({
  selector: 'app-inicio',
  imports: [RouterLink],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css',
})
export class Inicio implements OnInit {
  private readonly api = inject(SaludApi);
  private readonly destruccion = inject(DestroyRef);
  readonly estado = signal<'carga' | 'disponible' | 'error'>('carga');
  readonly sesion = inject(SesionStore);
  readonly permisos = inject(PermisosSolicitudes);
  private readonly historial = inject(HistorialApi);
  readonly resumen = signal<ResumenInicio | null>(null);
  readonly estadoResumen = signal<'carga' | 'listo' | 'error'>('carga');
  readonly estadosSolicitud = [
    { clave: 'BORRADOR', nombre: 'Borradores' },
    { clave: 'PRESENTADA', nombre: 'Presentadas' },
    { clave: 'APROBADA', nombre: 'Aprobadas' },
    { clave: 'RECHAZADA', nombre: 'Rechazadas' },
  ] as const;
  private readonly revisionResumen = signal(0);
  constructor() {
    effect((limpiar) => {
      this.revisionResumen();
      const usuario = this.sesion.usuario();
      this.resumen.set(null);
      if (!usuario) return;
      this.estadoResumen.set('carga');
      const consulta = this.historial.resumen().subscribe({
        next: (resumen) => {
          this.resumen.set(resumen);
          this.estadoResumen.set('listo');
        },
        error: () => this.estadoResumen.set('error'),
      });
      limpiar(() => consulta.unsubscribe());
    });
  }
  actualizarResumen(): void {
    this.revisionResumen.update((valor) => valor + 1);
  }
  ngOnInit() {
    this.comprobar();
  }
  comprobar() {
    this.estado.set('carga');
    this.api
      .consultar()
      .pipe(takeUntilDestroyed(this.destruccion))
      .subscribe({
        next: (salud) => this.estado.set(salud.estado === 'DISPONIBLE' ? 'disponible' : 'error'),
        error: () => this.estado.set('error'),
      });
  }
}
