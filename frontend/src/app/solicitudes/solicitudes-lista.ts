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
import { ActivatedRoute, convertToParamMap, ParamMap, Router, RouterLink } from '@angular/router';
import { catchError, combineLatest, map, of, startWith, Subject, switchMap } from 'rxjs';
import { euros } from './solicitud-calculos';
import {
  filtrosSolicitudesIniciales,
  FiltrosSolicitudes,
  mensajeErrorSolicitud,
  ordenesSolicitud,
  nombresEstado,
  Pagina,
  ResumenSolicitud,
  uuidValido,
} from './solicitud-modelo';
import { SolicitudesApi } from './solicitudes-api';
import { PermisosSolicitudes } from './solicitudes-permisos';

export function leerFiltrosSolicitudes(
  params: ParamMap,
  global: boolean,
): FiltrosSolicitudes | null {
  if (
    params.keys.some(
      (key) => !Object.hasOwn(filtrosSolicitudesIniciales, key) || params.getAll(key).length !== 1,
    )
  )
    return null;
  const valor = (nombre: string, defecto = '') => params.get(nombre) ?? defecto;
  const page = valor('page', '0');
  const size = valor('size', '20');
  const sort = valor('sort', 'actualizadoEn,desc');
  const numero = valor('numero');
  const asunto = valor('asunto');
  const estado = valor('estado');
  const proveedor = valor('proveedor');
  const supervisor = valor('supervisor');
  const autor = valor('autor');
  const fechaDesde = valor('fechaDesde');
  const fechaHasta = valor('fechaHasta');
  const fechaValida = (fecha: string) =>
    fecha === '' ||
    (/^\d{4}-\d{2}-\d{2}$/.test(fecha) &&
      !Number.isNaN(Date.parse(fecha)) &&
      new Date(fecha).toISOString().slice(0, 10) === fecha);
  if (
    !/^\d+$/.test(page) ||
    !Number.isSafeInteger(Number(page)) ||
    !/^\d+$/.test(size) ||
    Number(size) < 1 ||
    Number(size) > 100 ||
    !ordenesSolicitud.includes(sort as FiltrosSolicitudes['sort']) ||
    (numero !== '' && !/^SOL-\d{4}-\d{6}$/.test(numero)) ||
    [...asunto].length > 160 ||
    !['', ...Object.keys(nombresEstado)].includes(estado) ||
    [proveedor, supervisor, autor].some((id) => id !== '' && !uuidValido(id)) ||
    (!global && params.has('autor')) ||
    !fechaValida(fechaDesde) ||
    !fechaValida(fechaHasta) ||
    (fechaDesde !== '' && fechaHasta !== '' && fechaDesde > fechaHasta)
  )
    return null;
  return {
    numero,
    asunto,
    estado,
    proveedor,
    supervisor,
    autor,
    fechaDesde,
    fechaHasta,
    page: Number(page),
    size: Number(size),
    sort: sort as FiltrosSolicitudes['sort'],
  };
}

@Component({
  selector: 'app-solicitudes-lista',
  imports: [RouterLink, DatePipe],
  templateUrl: './solicitudes-lista.html',
  styleUrls: ['./solicitudes.css', './solicitudes-lista.css'],
})
export class SolicitudesLista implements OnInit {
  private readonly api = inject(SolicitudesApi);
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destruccion = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly titulo = viewChild<ElementRef<HTMLElement>>('titulo');
  private readonly alerta = viewChild<ElementRef<HTMLElement>>('alerta');
  private readonly refrescar = new Subject<void>();
  readonly permisos = inject(PermisosSolicitudes);
  readonly bandeja = this.ruta.snapshot.data['bandeja'] === true;
  readonly nombresEstado = nombresEstado;
  readonly filtros = signal<FiltrosSolicitudes>({ ...filtrosSolicitudesIniciales });
  readonly pagina = signal<Pagina<ResumenSolicitud> | null>(null);
  readonly cargando = signal(true);
  readonly error = signal('');
  readonly euros = euros;

  ngOnInit(): void {
    combineLatest([this.ruta.queryParamMap, this.refrescar.pipe(startWith(undefined))])
      .pipe(
        switchMap(([params]) => {
          this.cargando.set(true);
          this.pagina.set(null);
          this.error.set('');
          const filtros = leerFiltrosSolicitudes(params, this.permisos.global());
          if (!filtros)
            return of({
              pagina: null,
              error:
                'Los filtros de la dirección no son válidos o no están permitidos. Restablece los filtros.',
            });
          if (this.bandeja) {
            filtros.estado = 'PRESENTADA';
            filtros.supervisor = this.permisos.actorId();
          }
          this.filtros.set(filtros);
          return this.api.listar(filtros).pipe(
            map((pagina) => ({ pagina, error: '' })),
            catchError((error) => of({ pagina: null, error: mensajeErrorSolicitud(error) })),
          );
        }),
        takeUntilDestroyed(this.destruccion),
      )
      .subscribe((resultado) => {
        this.pagina.set(resultado.pagina);
        this.error.set(resultado.error);
        this.cargando.set(false);
        this.enfocar();
      });
  }
  buscar(evento: Event, formulario: HTMLFormElement): void {
    evento.preventDefault();
    if (this.cargando() || !formulario.reportValidity()) return;
    const parametros = Object.fromEntries(new FormData(formulario).entries());
    if (
      !leerFiltrosSolicitudes(
        convertToParamMap({ ...parametros, page: '0' }),
        this.permisos.global(),
      )
    ) {
      this.error.set(
        'Revisa los filtros: número completo, asunto hasta 160 caracteres, identificadores UUID y fechas en orden.',
      );
      this.enfocar();
      return;
    }
    void this.router.navigate([], {
      relativeTo: this.ruta,
      queryParams: { ...parametros, page: 0 },
    });
  }
  cambiarPagina(page: number): void {
    if (this.cargando() || page < 0 || !Number.isSafeInteger(page)) return;
    const destino = Math.min(page, Math.max((this.pagina()?.totalPaginas ?? 1) - 1, 0));
    const filtros = Object.fromEntries(
      Object.entries(this.filtros()).filter(
        ([campo, valor]) => valor !== '' && (campo !== 'autor' || this.permisos.global()),
      ),
    );
    void this.router.navigate([], {
      relativeTo: this.ruta,
      queryParams: { ...filtros, page: destino },
    });
  }
  restablecer(): void {
    void this.router.navigate([], { relativeTo: this.ruta, queryParams: {} });
  }
  recargar(): void {
    this.refrescar.next();
  }
  private enfocar(): void {
    afterNextRender(() => (this.error() ? this.alerta() : this.titulo())?.nativeElement.focus(), {
      injector: this.injector,
    });
  }
}
