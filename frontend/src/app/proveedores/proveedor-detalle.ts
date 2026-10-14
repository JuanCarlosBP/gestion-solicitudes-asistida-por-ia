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
import { esConflictoProveedor, mensajeErrorProveedor, Proveedor } from './proveedor-modelo';
import { ProveedoresApi } from './proveedores-api';
import { PermisosProveedores } from './proveedores-permisos';

@Component({
  selector: 'app-proveedor-detalle',
  imports: [RouterLink, DatePipe],
  templateUrl: './proveedor-detalle.html',
  styleUrl: './proveedores.css',
})
export class ProveedorDetalle implements OnInit {
  private readonly api = inject(ProveedoresApi);
  private readonly ruta = inject(ActivatedRoute);
  private readonly destruccion = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly titulo = viewChild<ElementRef<HTMLElement>>('titulo');
  private readonly alerta = viewChild<ElementRef<HTMLElement>>('alerta');
  private readonly refrescar = new Subject<void>();
  readonly permisos = inject(PermisosProveedores);
  readonly proveedor = signal<Proveedor | null>(null);
  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly conflicto = signal(false);
  readonly error = signal('');
  readonly aviso = signal('');

  ngOnInit(): void {
    combineLatest([this.ruta.paramMap, this.refrescar.pipe(startWith(undefined))])
      .pipe(
        switchMap(([params]) => {
          this.proveedor.set(null);
          this.error.set('');
          this.conflicto.set(false);
          this.aviso.set('');
          this.cargando.set(true);
          return this.api.consultar(params.get('id') ?? '').pipe(
            map((proveedor) => ({ proveedor, error: '' })),
            catchError((error) => of({ proveedor: null, error: mensajeErrorProveedor(error) })),
          );
        }),
        takeUntilDestroyed(this.destruccion),
      )
      .subscribe((resultado) => {
        this.proveedor.set(resultado.proveedor);
        this.error.set(resultado.error);
        this.cargando.set(false);
        this.enfocar();
      });
  }

  cambiarEstado(): void {
    const proveedor = this.proveedor();
    if (!proveedor || !this.permisos.escribir() || this.guardando() || this.conflicto()) return;
    this.guardando.set(true);
    this.error.set('');
    this.aviso.set('');
    this.api
      .cambiarEstado(proveedor)
      .pipe(
        takeUntilDestroyed(this.destruccion),
        finalize(() => this.guardando.set(false)),
      )
      .subscribe({
        next: (actualizado) => {
          this.proveedor.set(actualizado);
          this.aviso.set(actualizado.activo ? 'Proveedor reactivado.' : 'Proveedor desactivado.');
          this.enfocar();
        },
        error: (error) => {
          this.error.set(mensajeErrorProveedor(error));
          this.conflicto.set(esConflictoProveedor(error));
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
