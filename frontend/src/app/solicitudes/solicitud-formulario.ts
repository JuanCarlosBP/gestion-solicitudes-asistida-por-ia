import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  catchError,
  combineLatest,
  finalize,
  map,
  Observable,
  of,
  startWith,
  Subject,
  switchMap,
} from 'rxjs';
import { ConceptosEditor } from './conceptos-editor';
import { FocoVisible } from './foco-visible';
import { ReferenciaSelector } from './referencia-selector';
import { errorAsunto, euros, totalEstimado, validarBorrador } from './solicitud-calculos';
import {
  BorradorSolicitud,
  DetalleSolicitud,
  EntradaConcepto,
  esConflictoSolicitud,
  mensajeErrorSolicitud,
} from './solicitud-modelo';
import { SolicitudesApi } from './solicitudes-api';
import { PermisosSolicitudes } from './solicitudes-permisos';

const vacio = (): BorradorSolicitud => ({
  asunto: '',
  descripcion: null,
  proveedorId: null,
  supervisorId: null,
  version: 0,
  conceptos: [],
});

@Component({
  selector: 'app-solicitud-formulario',
  imports: [RouterLink, ConceptosEditor, ReferenciaSelector, FocoVisible],
  templateUrl: './solicitud-formulario.html',
  styleUrls: ['./solicitudes.css', './solicitud-acciones.css'],
})
export class SolicitudFormulario implements OnInit {
  private readonly api = inject(SolicitudesApi);
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destruccion = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly titulo = viewChild<ElementRef<HTMLElement>>('titulo');
  private readonly alerta = viewChild<ElementRef<HTMLElement>>('alerta');
  private readonly refrescar = new Subject<void>();
  readonly permisos = inject(PermisosSolicitudes);
  readonly id = signal<string | null>(null);
  readonly solicitud = signal<DetalleSolicitud | null>(null);
  readonly datos = signal<BorradorSolicitud>(vacio());
  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly conflicto = signal(false);
  readonly error = signal('');
  readonly errores = signal<Record<string, string>>({});
  readonly estimacion = computed(() => totalEstimado(this.datos().conceptos));
  readonly euros = euros;
  readonly editable = computed(() =>
    this.id()
      ? !!this.solicitud() && this.permisos.editar(this.solicitud()!)
      : this.permisos.crear(),
  );

  ngOnInit(): void {
    combineLatest([this.ruta.paramMap, this.refrescar.pipe(startWith(undefined))])
      .pipe(
        switchMap(([params]) => {
          const id = params.get('id');
          this.id.set(id);
          this.cargando.set(true);
          this.solicitud.set(null);
          this.error.set('');
          this.errores.set({});
          this.conflicto.set(false);
          const consulta: Observable<DetalleSolicitud | null> = id
            ? this.api.consultar(id)
            : of(null);
          return consulta.pipe(
            map((solicitud) => ({ solicitud, error: '' })),
            catchError((error) => of({ solicitud: null, error: mensajeErrorSolicitud(error) })),
          );
        }),
        takeUntilDestroyed(this.destruccion),
      )
      .subscribe((resultado) => {
        this.solicitud.set(resultado.solicitud);
        const actual = resultado.solicitud;
        this.datos.set(
          actual
            ? {
                asunto: actual.asunto,
                descripcion: actual.descripcion,
                proveedorId: actual.proveedorId,
                supervisorId: actual.supervisorId,
                version: actual.version,
                conceptos: actual.conceptos.map(
                  ({ id, descripcion, cantidad, unidad, precioUnitario, posicion }) => ({
                    id,
                    descripcion,
                    cantidad,
                    unidad,
                    precioUnitario,
                    posicion,
                  }),
                ),
              }
            : vacio(),
        );
        this.error.set(
          resultado.error ||
            (actual && !this.permisos.editar(actual)
              ? 'Esta solicitud no es un borrador propio editable para tu cuenta.'
              : ''),
        );
        this.cargando.set(false);
        this.enfocar();
      });
  }
  cambiar(
    campo: 'asunto' | 'descripcion' | 'proveedorId' | 'supervisorId',
    valor: string | null,
  ): void {
    if (this.guardando()) return;
    this.datos.update((datos) => ({
      ...datos,
      [campo]: campo === 'asunto' ? (valor ?? '') : valor,
    }));
  }
  conceptos(lineas: EntradaConcepto[]): void {
    if (!this.guardando()) this.datos.update((datos) => ({ ...datos, conceptos: lineas }));
  }
  guardar(evento: Event): void {
    evento.preventDefault();
    if (this.cargando() || this.guardando() || this.conflicto() || !this.editable()) return;
    const datos: BorradorSolicitud = {
      ...this.datos(),
      asunto: this.datos().asunto.trim(),
      descripcion: this.datos().descripcion?.trim() || null,
      conceptos: this.datos().conceptos.map((concepto) => ({
        ...concepto,
        descripcion: concepto.descripcion.trim(),
      })),
    };
    const asunto = errorAsunto(datos.asunto);
    const errores = this.id() ? validarBorrador(datos) : asunto ? { asunto } : {};
    this.errores.set(errores);
    this.error.set('');
    if (Object.keys(errores).length) {
      this.error.set('Revisa los campos indicados. Los datos no se han guardado.');
      this.enfocar();
      return;
    }
    this.guardando.set(true);
    const actual = this.solicitud();
    const peticion = actual
      ? this.api.guardar(actual.id, { ...datos, version: actual.version })
      : this.api.crear(datos.asunto);
    peticion
      .pipe(
        takeUntilDestroyed(this.destruccion),
        finalize(() => this.guardando.set(false)),
      )
      .subscribe({
        next: (solicitud) =>
          void this.router.navigate(
            actual ? ['/solicitudes', solicitud.id] : ['/solicitudes', solicitud.id, 'editar'],
            { queryParamsHandling: 'preserve' },
          ),
        error: (error) => {
          this.error.set(mensajeErrorSolicitud(error));
          this.conflicto.set(esConflictoSolicitud(error));
          this.enfocar();
        },
      });
  }
  recargar(): void {
    if (!this.guardando()) this.refrescar.next();
  }
  private enfocar(): void {
    afterNextRender(() => (this.error() ? this.alerta() : this.titulo())?.nativeElement.focus(), {
      injector: this.injector,
    });
  }
}
