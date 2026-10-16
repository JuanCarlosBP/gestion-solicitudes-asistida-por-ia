import { Component, DestroyRef, inject, input, OnInit, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, map, Observable, of, startWith, Subject, switchMap } from 'rxjs';
import { filtrosIniciales } from '../proveedores/proveedor-modelo';
import { ProveedoresApi } from '../proveedores/proveedores-api';
import { Pagina } from './solicitud-modelo';
import { SolicitudesApi } from './solicitudes-api';

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
  private readonly consultas = new Subject<{ nombre: string; page: number }>();
  readonly pagina = signal<Pagina<OpcionReferencia> | null>(null);
  readonly buscando = signal(false);
  readonly error = signal('');
  readonly nombre = signal('');
  readonly seleccion = signal<OpcionReferencia | null>(null);

  ngOnInit(): void {
    this.consultas
      .pipe(
        startWith({ nombre: '', page: 0 }),
        switchMap(({ nombre, page }) => {
          this.buscando.set(true);
          this.error.set('');
          this.nombre.set(nombre);
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
          return consulta.pipe(
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
  buscar(nombre: string, page = 0): void {
    if (this.deshabilitado() || this.buscando()) return;
    if ([...nombre.trim()].length > 128) {
      this.error.set('La búsqueda admite hasta 128 caracteres.');
      return;
    }
    this.consultas.next({ nombre: nombre.trim(), page });
  }
  buscarConTeclado(evento: Event, nombre: string): void {
    evento.preventDefault();
    this.buscar(nombre);
  }
  seleccionar(id: string): void {
    if (this.deshabilitado() || this.buscando()) return;
    this.seleccion.set(this.pagina()?.elementos.find((opcion) => opcion.id === id) ?? null);
    this.cambio.emit(id || null);
  }
  nombreSeleccionado(): string {
    return this.seleccion()?.id === this.valor() ? (this.seleccion()?.nombre ?? '') : '';
  }
  fueraDePagina(): boolean {
    return !!this.valor() && !this.pagina()?.elementos.some((opcion) => opcion.id === this.valor());
  }
}
