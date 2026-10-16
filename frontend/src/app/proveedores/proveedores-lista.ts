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
import {
  filtrosIniciales,
  FiltrosProveedores,
  mensajeErrorProveedor,
  ordenesProveedor,
  PaginaProveedores,
  paisesFiscales,
} from './proveedor-modelo';
import { ProveedoresApi } from './proveedores-api';
import { PermisosProveedores } from './proveedores-permisos';

@Component({
  selector: 'app-proveedores-lista',
  imports: [RouterLink],
  templateUrl: './proveedores-lista.html',
  styleUrl: './proveedores.css',
})
export class ProveedoresLista implements OnInit {
  private readonly api = inject(ProveedoresApi);
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destruccion = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly titulo = viewChild<ElementRef<HTMLElement>>('titulo');
  private readonly alerta = viewChild<ElementRef<HTMLElement>>('alerta');
  private readonly refrescar = new Subject<void>();
  readonly permisos = inject(PermisosProveedores);
  readonly filtros = signal<FiltrosProveedores>({ ...filtrosIniciales });
  readonly pagina = signal<PaginaProveedores | null>(null);
  readonly cargando = signal(true);
  readonly error = signal('');

  ngOnInit(): void {
    combineLatest([this.ruta.queryParamMap, this.refrescar.pipe(startWith(undefined))])
      .pipe(
        switchMap(([params]) => {
          this.pagina.set(null);
          this.error.set('');
          this.cargando.set(true);
          const filtros = this.leerFiltros(params);
          if (!filtros)
            return of({
              pagina: null,
              error:
                'Los filtros de la dirección no son válidos o no están permitidos. Restablece los filtros.',
            });
          this.filtros.set(filtros);
          return this.api.listar(filtros).pipe(
            map((pagina) => ({ pagina, error: '' })),
            catchError((error) => of({ pagina: null, error: mensajeErrorProveedor(error) })),
          );
        }),
        takeUntilDestroyed(this.destruccion),
      )
      .subscribe((resultado) => {
        this.pagina.set(resultado.pagina);
        this.error.set(resultado.error);
        this.cargando.set(false);
        afterNextRender(
          () => (this.error() ? this.alerta() : this.titulo())?.nativeElement.focus(),
          { injector: this.injector },
        );
      });
  }

  buscar(evento: Event, formulario: HTMLFormElement): void {
    evento.preventDefault();
    if (this.cargando()) return;
    if (!formulario.reportValidity()) return;
    const datos = new FormData(formulario);
    const parametros = Object.fromEntries(datos.entries());
    if (!this.leerFiltros(convertToParamMap({ ...parametros, page: '0' }))) {
      this.error.set(
        'Revisa los filtros: denominación hasta 128 caracteres, identificador fiscal entre 3 y 64 y valores válidos en los demás campos.',
      );
      afterNextRender(() => this.alerta()?.nativeElement.focus(), { injector: this.injector });
      return;
    }
    void this.router.navigate([], {
      relativeTo: this.ruta,
      queryParams: { ...parametros, page: 0 },
    });
  }

  cambiarPagina(page: number): void {
    if (this.cargando() || page < 0 || !Number.isSafeInteger(page)) return;
    // Una URL puede señalar una página que ya no existe tras cambiar el catálogo.
    const destino = Math.min(page, Math.max((this.pagina()?.totalPaginas ?? 1) - 1, 0));
    void this.router.navigate([], {
      relativeTo: this.ruta,
      queryParams: { ...this.filtros(), page: destino },
    });
  }

  restablecer(): void {
    void this.router.navigate([], { relativeTo: this.ruta, queryParams: {} });
  }

  recargar(): void {
    this.refrescar.next();
  }

  private leerFiltros(params: ParamMap): FiltrosProveedores | null {
    const valor = (campo: string, defecto = '') => params.get(campo) ?? defecto;
    const page = valor('page', '0');
    const size = valor('size', '20');
    const activo = valor('activo', 'true');
    const sort = valor('sort', 'denominacion,asc');
    const tipo = valor('tipo');
    const paisFiscal = valor('paisFiscal');
    const denominacion = valor('denominacion');
    const identificadorFiscal = valor('identificadorFiscal');
    if (
      !/^\d+$/.test(page) ||
      !Number.isSafeInteger(Number(page)) ||
      !/^\d+$/.test(size) ||
      Number(size) < 1 ||
      Number(size) > 100 ||
      !['true', 'false', 'todos'].includes(activo) ||
      (activo !== 'true' && !this.permisos.verInactivos()) ||
      !ordenesProveedor.includes(sort as FiltrosProveedores['sort']) ||
      !['', 'PERSONA_JURIDICA', 'PROFESIONAL'].includes(tipo) ||
      (paisFiscal !== '' && !paisesFiscales.has(paisFiscal)) ||
      [...denominacion].length > 128 ||
      (identificadorFiscal !== '' &&
        ([...identificadorFiscal].length < 3 || [...identificadorFiscal].length > 64))
    )
      return null;
    return {
      denominacion,
      identificadorFiscal,
      tipo,
      paisFiscal,
      activo: activo as FiltrosProveedores['activo'],
      page: Number(page),
      size: Number(size),
      sort: sort as FiltrosProveedores['sort'],
    };
  }
}
