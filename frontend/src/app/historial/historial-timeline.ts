import { DatePipe } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  input,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, convertToParamMap, ParamMap, Router, RouterLink } from '@angular/router';
import { catchError, combineLatest, map, of, startWith, Subject, switchMap } from 'rxjs';
import { HistorialApi } from './historial-api';
import {
  accionesHistorial,
  filtrosHistorialIniciales,
  FiltrosHistorial,
  leerFiltrosHistorial,
  mensajeErrorHistorial,
  PaginaHistorial,
  TipoRecurso,
} from './historial-modelo';

@Component({
  selector: 'app-historial-timeline',
  imports: [DatePipe, RouterLink],
  templateUrl: './historial-timeline.html',
  styleUrl: './historial-timeline.css',
})
export class HistorialTimeline implements OnInit {
  readonly tipo = input<TipoRecurso>();
  readonly recursoId = input('');
  readonly revision = input(0);
  readonly integrado = input(false);
  private readonly contexto = toObservable(
    computed(() => ({ tipo: this.tipo(), id: this.recursoId(), revision: this.revision() })),
  );
  private readonly api = inject(HistorialApi);
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destruccion = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly titulo = viewChild<ElementRef<HTMLElement>>('titulo');
  private readonly alerta = viewChild<ElementRef<HTMLElement>>('alerta');
  private readonly refrescar = new Subject<void>();
  private moverFoco = false;
  readonly filtros = signal<FiltrosHistorial>({ ...filtrosHistorialIniciales });
  readonly pagina = signal<PaginaHistorial | null>(null);
  readonly cargando = signal(true);
  readonly error = signal('');
  readonly acciones = Object.entries(accionesHistorial).map(([valor, nombre]) => ({
    valor,
    nombre,
  }));
  readonly nombresAccion = accionesHistorial;
  readonly zona = Intl.DateTimeFormat().resolvedOptions().timeZone;
  readonly rutaRecurso = computed(() =>
    this.tipo() === 'SOLICITUD' ? '/solicitudes' : '/proveedores',
  );
  readonly parametrosDirectos = computed(() =>
    Object.fromEntries(Object.entries(this.filtros()).filter(([, valor]) => valor !== '')),
  );

  ngOnInit(): void {
    combineLatest([
      this.contexto,
      this.ruta.queryParamMap,
      this.refrescar.pipe(startWith(undefined)),
    ])
      .pipe(
        switchMap(([contexto, params]) => {
          this.pagina.set(null);
          this.error.set('');
          this.cargando.set(true);
          const filtros = leerFiltrosHistorial(this.parametrosConsulta(params), !contexto.tipo);
          if (!filtros)
            return of({
              pagina: null,
              error:
                'Los filtros de la dirección no son válidos. Restablece los filtros para continuar.',
            });
          this.filtros.set(filtros);
          return this.api.consultar(filtros, contexto.tipo, contexto.id).pipe(
            map((pagina) => ({ pagina, error: '' })),
            catchError((error) => of({ pagina: null, error: mensajeErrorHistorial(error) })),
          );
        }),
        takeUntilDestroyed(this.destruccion),
      )
      .subscribe((resultado) => {
        this.pagina.set(resultado.pagina);
        this.error.set(resultado.error);
        this.cargando.set(false);
        if (this.moverFoco || !this.integrado()) this.enfocar();
      });
  }
  private parametrosConsulta(params: ParamMap): ParamMap {
    if (!this.integrado()) return params;
    // Los filtros del listado anterior conviven con los del timeline integrado.
    return convertToParamMap(
      Object.fromEntries(
        params.keys
          .filter((k) => k.startsWith('historial_'))
          .map((k) => [k.slice(10), params.getAll(k)]),
      ),
    );
  }
  buscar(evento: Event, formulario: HTMLFormElement): void {
    evento.preventDefault();
    if (this.cargando() || !formulario.reportValidity()) return;
    const campos = Object.fromEntries(
      [...new FormData(formulario).entries()].filter(([, valor]) => valor !== ''),
    );
    const filtros = leerFiltrosHistorial(convertToParamMap({ ...campos, page: '0' }), !this.tipo());
    if (!filtros) {
      this.pagina.set(null);
      this.error.set(
        'Revisa los UUID y las fechas ISO con zona horaria; desde debe ser anterior o igual a hasta.',
      );
      this.enfocar();
      return;
    }
    this.navegar(filtros);
  }
  cambiarPagina(page: number): void {
    if (this.cargando() || page < 0 || !Number.isSafeInteger(page)) return;
    this.navegar({
      ...this.filtros(),
      page: Math.min(page, Math.max((this.pagina()?.totalPaginas ?? 1) - 1, 0)),
    });
  }
  restablecer(formulario: HTMLFormElement): void {
    // También descarta ediciones aún no aplicadas cuando la URL ya contiene
    // estos valores: Angular no reescribe un binding cuyo valor no ha cambiado.
    for (const [nombre, valor] of Object.entries(filtrosHistorialIniciales)) {
      const campo = formulario.elements.namedItem(nombre);
      if (campo instanceof HTMLInputElement || campo instanceof HTMLSelectElement)
        campo.value = String(valor);
    }
    this.navegar({ ...filtrosHistorialIniciales });
  }
  recargar(): void {
    this.moverFoco = true;
    this.refrescar.next();
  }
  private navegar(filtros: FiltrosHistorial): void {
    const params: Record<string, string | number | string[]> = {};
    if (this.integrado()) {
      const actuales = this.ruta.snapshot.queryParamMap;
      for (const key of actuales.keys.filter((k) => !k.startsWith('historial_')))
        params[key] = actuales.getAll(key);
    }
    for (const [key, valor] of Object.entries(filtros))
      if (valor !== '') params[`${this.integrado() ? 'historial_' : ''}${key}`] = valor;
    this.moverFoco = true;
    const destino = this.router.createUrlTree([], { relativeTo: this.ruta, queryParams: params });
    if (this.router.serializeUrl(destino) === this.router.url) this.refrescar.next();
    else void this.router.navigateByUrl(destino);
  }
  private enfocar(): void {
    afterNextRender(() => (this.error() ? this.alerta() : this.titulo())?.nativeElement.focus(), {
      injector: this.injector,
    });
  }
}
