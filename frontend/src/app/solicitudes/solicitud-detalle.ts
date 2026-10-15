import { DatePipe } from '@angular/common';
import {
  afterNextRender,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, combineLatest, finalize, map, of, startWith, Subject, switchMap } from 'rxjs';
import { euros } from './solicitud-calculos';
import {
  DetalleSolicitud,
  esConflictoSolicitud,
  mensajeErrorSolicitud,
  nombresUnidad,
  nombresEstado,
} from './solicitud-modelo';
import { SolicitudDecision } from './solicitud-decision';
import { SolicitudesApi } from './solicitudes-api';
import { PermisosSolicitudes } from './solicitudes-permisos';

@Component({
  selector: 'app-solicitud-detalle',
  imports: [RouterLink, DatePipe, SolicitudDecision],
  templateUrl: './solicitud-detalle.html',
  styleUrls: [
    './solicitudes.css',
    './solicitud-detalle.css',
    './conceptos-tabla.css',
    './solicitud-acciones.css',
  ],
})
export class SolicitudDetalle implements OnInit {
  private readonly api = inject(SolicitudesApi);
  private readonly ruta = inject(ActivatedRoute);
  private readonly destruccion = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly titulo = viewChild<ElementRef<HTMLElement>>('titulo');
  private readonly alerta = viewChild<ElementRef<HTMLElement>>('alerta');
  private readonly confirmacion = viewChild<ElementRef<HTMLElement>>('confirmacion');
  private readonly refrescar = new Subject<void>();
  private intento: { id: string; version: number } | null = null;
  readonly permisos = inject(PermisosSolicitudes);
  readonly solicitud = signal<DetalleSolicitud | null>(null);
  readonly cargando = signal(true);
  readonly presentando = signal(false);
  readonly presentada = signal(false);
  readonly conflicto = signal(false);
  readonly confirmar = signal(false);
  readonly error = signal('');
  readonly aviso = signal('');
  readonly euros = euros;
  readonly nombresUnidad = nombresUnidad;
  readonly nombresEstado = nombresEstado;

  ngOnInit(): void {
    combineLatest([this.ruta.paramMap, this.refrescar.pipe(startWith(undefined))])
      .pipe(
        switchMap(([params]) => {
          this.cargando.set(true);
          this.solicitud.set(null);
          this.error.set('');
          this.confirmar.set(false);
          this.conflicto.set(false);
          return this.api.consultar(params.get('id') ?? '').pipe(
            map((solicitud) => ({ solicitud, error: '' })),
            catchError((error) => of({ solicitud: null, error: mensajeErrorSolicitud(error) })),
          );
        }),
        takeUntilDestroyed(this.destruccion),
      )
      .subscribe((resultado) => {
        this.solicitud.set(resultado.solicitud);
        this.error.set(resultado.error);
        this.cargando.set(false);
        if (resultado.solicitud) {
          this.presentada.set(resultado.solicitud.estado === 'PRESENTADA');
          this.intento = null;
        }
        this.enfocar();
      });
  }
  puedePresentar(): boolean {
    const solicitud = this.solicitud();
    return (
      !!solicitud && this.permisos.editar(solicitud) && !this.presentada() && !this.conflicto()
    );
  }
  pedirConfirmacion(): void {
    if (!this.puedePresentar() || this.presentando()) return;
    this.confirmar.set(true);
    afterNextRender(() => this.confirmacion()?.nativeElement.focus(), { injector: this.injector });
  }
  cancelar(): void {
    if (!this.presentando()) {
      this.confirmar.set(false);
      this.enfocar();
    }
  }
  presentar(): void {
    const solicitud = this.solicitud();
    if (!solicitud || !this.confirmar() || !this.puedePresentar() || this.presentando()) return;
    // La misma intención conserva clave y versión tras una respuesta incierta.
    this.intento ??= { id: solicitud.id, version: solicitud.version };
    this.presentando.set(true);
    this.error.set('');
    this.aviso.set('');
    this.api
      .presentar(this.intento.id, this.intento.version)
      .pipe(
        switchMap(() => {
          this.presentada.set(true);
          this.confirmar.set(false);
          this.aviso.set('Solicitud presentada. La cabecera y los conceptos quedan fijados.');
          return this.api.consultar(solicitud.id);
        }),
        takeUntilDestroyed(this.destruccion),
        finalize(() => this.presentando.set(false)),
      )
      .subscribe({
        next: (actualizada) => {
          this.solicitud.set(actualizada);
          this.intento = null;
          this.enfocar();
        },
        error: (error) => {
          this.error.set(
            this.presentada()
              ? 'La presentación se ha confirmado, pero no se ha podido cargar el detalle. Recarga para consultarlo.'
              : mensajeErrorSolicitud(error),
          );
          this.conflicto.set(esConflictoSolicitud(error));
          this.enfocar();
        },
      });
  }
  recargar(): void {
    if (!this.presentando()) this.refrescar.next();
  }
  actualizarDecision(detalle: DetalleSolicitud): void {
    this.solicitud.set(detalle);
    this.aviso.set(
      detalle.estado === 'APROBADA'
        ? 'Solicitud aprobada. La decisión ha quedado registrada.'
        : detalle.estado === 'RECHAZADA'
          ? 'Solicitud rechazada. El motivo ha quedado registrado.'
          : 'Solicitud actualizada. Revisa la decisión antes de continuar.',
    );
    this.enfocar();
  }
  private enfocar(): void {
    afterNextRender(() => (this.error() ? this.alerta() : this.titulo())?.nativeElement.focus(), {
      injector: this.injector,
    });
  }
}
