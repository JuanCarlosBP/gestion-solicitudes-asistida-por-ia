import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  OnInit,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, map, Observable, of, startWith, Subject, switchMap, timer } from 'rxjs';
import { filtrosIniciales } from '../proveedores/proveedor-modelo';
import { ProveedoresApi } from '../proveedores/proveedores-api';
import { Pagina } from './solicitud-modelo';
import { SolicitudesApi } from './solicitudes-api';

interface ConsultaReferencia {
  nombre: string;
  page: number;
  esperaMs: number;
}

interface OpcionReferencia {
  id: string;
  nombre: string;
}

@Component({
  selector: 'app-referencia-selector',
  templateUrl: './referencia-selector.html',
  styleUrls: ['./solicitudes.css', './referencia-selector.css'],
})
export class ReferenciaSelector implements OnInit {
  readonly tipo = input.required<'proveedor' | 'supervisor'>();
  readonly valor = input<string | null>(null);
  readonly nombreActual = input('');
  readonly deshabilitado = input(false);
  readonly cambio = output<string | null>();
  private readonly proveedores = inject(ProveedoresApi);
  private readonly solicitudes = inject(SolicitudesApi);
  private readonly destruccion = inject(DestroyRef);
  private readonly controlSeleccion = viewChild<ElementRef<HTMLSelectElement>>('seleccion');
  private readonly consultas = new Subject<ConsultaReferencia | null>();
  readonly pagina = signal<Pagina<OpcionReferencia> | null>(null);
  readonly buscando = signal(false);
  readonly error = signal('');
  readonly nombre = signal('');
  readonly textoBusqueda = signal('');
  readonly seleccion = signal<OpcionReferencia | null>(null);

  // Una única lista y una única identidad DOM por UUID. La referencia elegida
  // permanece primera aunque cambien la búsqueda o la página de resultados.
  // No pasa de un bloque @for a otro @if ni se recrea durante la consulta.
  readonly opciones = computed<OpcionReferencia[]>(() => {
    const resultados = this.pagina()?.elementos ?? [];
    const id = this.valor();
    if (!id) return resultados;

    const elegida = resultados.find((opcion) => opcion.id === id) ?? {
      id,
      nombre:
        this.nombreSeleccionado() || this.nombreActual() || 'Referencia guardada no disponible',
    };
    return [elegida, ...resultados.filter((opcion) => opcion.id !== id)];
  });

  ngOnInit(): void {
    this.consultas
      .pipe(
        startWith({ nombre: '', page: 0, esperaMs: 0 }),
        switchMap((entrada) => {
          // También se cancela lo anterior si la entrada nueva aún no es válida.
          if (entrada === null) return EMPTY;
          const { nombre, page, esperaMs } = entrada;
          this.buscando.set(true);
          this.error.set('');
          this.nombre.set(nombre);
          this.pagina.set(null);
          let consulta: Observable<Pagina<OpcionReferencia>>;
          if (this.tipo() === 'proveedor') {
            consulta = this.proveedores
              .listar({ ...filtrosIniciales, denominacion: nombre, page })
              .pipe(
                map((p) => ({
                  ...p,
                  elementos: p.elementos.map((v) => ({ id: v.id, nombre: v.denominacion })),
                })),
              );
          } else {
            const supervisores = this.solicitudes.supervisores(nombre, page);
            consulta = supervisores.pipe(
              map((p) => ({
                ...p,
                elementos: p.elementos.map((v) => ({ id: v.id, nombre: v.nombreVisible })),
              })),
            );
          }
          // El cambio de texto cancela al instante la respuesta antigua. Solo
          // se retrasa la suscripción de la consulta nueva mientras se escribe.
          return (esperaMs === 0 ? of(0) : timer(esperaMs)).pipe(
            switchMap(() => consulta),
            map((pagina) => ({ pagina, error: '' })),
            catchError(() =>
              of({
                pagina: null,
                error: `No se han podido consultar los ${this.tipo() === 'proveedor' ? 'proveedores' : 'supervisores'}. Repite la búsqueda.`,
              }),
            ),
          );
        }),
        takeUntilDestroyed(this.destruccion),
      )
      .subscribe((resultado) => {
        this.pagina.set(resultado.pagina);
        this.error.set(resultado.error);
        this.buscando.set(false);
      });
  }
  editarBusqueda(nombre: string, evento?: Event): void {
    if (this.deshabilitado()) return;
    this.textoBusqueda.set(nombre);
    if (evento && 'isComposing' in evento && evento.isComposing) {
      // No buscar una palabra todavía en composición del teclado.
      this.consultas.next(null);
      this.pagina.set(null);
      this.buscando.set(false);
      this.error.set('');
      return;
    }
    this.solicitarBusqueda(nombre, 0, nombre.trim() === '' ? 0 : 300);
  }
  buscar(nombre: string, page = 0): void {
    this.solicitarBusqueda(nombre, page, 0);
  }
  private solicitarBusqueda(nombre: string, page: number, esperaMs: number): void {
    if (this.deshabilitado()) return;
    this.textoBusqueda.set(nombre);
    if ([...nombre.trim()].length > 128 || !Number.isSafeInteger(page) || page < 0) {
      this.consultas.next(null);
      this.pagina.set(null);
      this.buscando.set(false);
      this.error.set(
        [...nombre.trim()].length > 128
          ? 'La búsqueda admite hasta 128 caracteres.'
          : 'La página solicitada no es válida.',
      );
      return;
    }
    // Filtrado remoto por nombre completo o parte, desde la primera página.
    // Buscar no elige ni borra la referencia que ya está asignada al borrador.
    this.consultas.next({ nombre: nombre.trim(), page, esperaMs });
  }
  buscarConTeclado(evento: Event, nombre: string): void {
    if ('isComposing' in evento && evento.isComposing) return;
    evento.preventDefault();
    this.buscar(nombre);
  }
  seleccionar(id: string): void {
    if (this.deshabilitado() || this.buscando()) {
      // Un evento puede llegar antes de que el siguiente render aplique disabled.
      // Si se rechaza, el DOM debe conservar la selección realmente adoptada.
      const control = this.controlSeleccion()?.nativeElement;
      if (control) control.value = this.valor() ?? '';
      return;
    }
    const opcion = this.pagina()?.elementos.find((elemento) => elemento.id === id);
    if (id && !opcion && id !== this.valor()) return;
    this.seleccion.set(opcion ?? null);
    this.cambio.emit(id || null);
  }
  nombreSeleccionado(): string {
    const visible = this.pagina()?.elementos.find((opcion) => opcion.id === this.valor());
    return (
      visible?.nombre ??
      (this.seleccion()?.id === this.valor() ? (this.seleccion()?.nombre ?? '') : '')
    );
  }
  fueraDePagina(): boolean {
    return !!this.valor() && !this.pagina()?.elementos.some((opcion) => opcion.id === this.valor());
  }
}
