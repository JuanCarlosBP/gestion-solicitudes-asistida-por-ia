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
import {
  DatosProveedor,
  esConflictoProveedor,
  mensajeErrorProveedor,
  paisesFiscales,
  Proveedor,
  TipoProveedor,
} from './proveedor-modelo';
import { ProveedoresApi } from './proveedores-api';
import { PermisosProveedores } from './proveedores-permisos';

const datosVacios: DatosProveedor = {
  tipo: 'PERSONA_JURIDICA',
  denominacion: '',
  paisFiscal: '',
  identificadorFiscal: '',
  correoContacto: null,
  telefonoContacto: null,
};

export function validarProveedor(datos: DatosProveedor): Record<string, string> {
  const errores: Record<string, string> = {};
  const longitud = (valor: string) => [...valor].length;
  if (!['PERSONA_JURIDICA', 'PROFESIONAL'].includes(datos.tipo))
    errores['tipo'] = 'Selecciona un tipo válido.';
  if (longitud(datos.denominacion.trim()) < 1 || longitud(datos.denominacion.trim()) > 160)
    errores['denominacion'] = 'Indica entre 1 y 160 caracteres.';
  if (!paisesFiscales.has(datos.paisFiscal))
    errores['paisFiscal'] = 'Indica un código ISO válido de dos letras mayúsculas, por ejemplo ES.';
  const fiscal = datos.identificadorFiscal
    .normalize('NFKC')
    .trim()
    .toUpperCase()
    .replace(/\p{White_Space}+/gu, ' ');
  if (
    longitud(datos.identificadorFiscal) < 3 ||
    longitud(datos.identificadorFiscal) > 64 ||
    longitud(fiscal) < 3 ||
    longitud(fiscal) > 64
  )
    errores['identificadorFiscal'] =
      'Indica entre 3 y 64 caracteres, también tras normalizar espacios y mayúsculas.';
  if (
    datos.correoContacto &&
    (longitud(datos.correoContacto) > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(datos.correoContacto))
  )
    errores['correoContacto'] = 'Indica un correo válido de hasta 254 caracteres.';
  if (datos.telefonoContacto && longitud(datos.telefonoContacto) > 32)
    errores['telefonoContacto'] = 'Indica como máximo 32 caracteres.';
  return errores;
}

@Component({
  selector: 'app-proveedor-formulario',
  imports: [RouterLink],
  templateUrl: './proveedor-formulario.html',
  styleUrl: './proveedores.css',
})
export class ProveedorFormulario implements OnInit {
  private readonly api = inject(ProveedoresApi);
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destruccion = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly titulo = viewChild<ElementRef<HTMLElement>>('titulo');
  private readonly alerta = viewChild<ElementRef<HTMLElement>>('alerta');
  private readonly refrescar = new Subject<void>();
  readonly permisos = inject(PermisosProveedores);
  readonly id = signal<string | null>(null);
  readonly proveedor = signal<Proveedor | null>(null);
  readonly datos = signal<DatosProveedor>({ ...datosVacios });
  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly error = signal('');
  readonly conflicto = signal(false);
  readonly errores = signal<Record<string, string>>({});

  ngOnInit(): void {
    combineLatest([this.ruta.paramMap, this.refrescar.pipe(startWith(undefined))])
      .pipe(
        switchMap(([params]) => {
          const id = params.get('id');
          this.id.set(id);
          this.cargando.set(true);
          this.proveedor.set(null);
          this.error.set('');
          this.errores.set({});
          this.conflicto.set(false);
          const consulta: Observable<Proveedor | null> = id ? this.api.consultar(id) : of(null);
          return consulta.pipe(
            map((proveedor) => ({ proveedor, error: '' })),
            catchError((error) => of({ proveedor: null, error: mensajeErrorProveedor(error) })),
          );
        }),
        takeUntilDestroyed(this.destruccion),
      )
      .subscribe((resultado) => {
        this.proveedor.set(resultado.proveedor);
        this.datos.set(resultado.proveedor ?? { ...datosVacios });
        this.error.set(resultado.error);
        this.cargando.set(false);
        this.enfocar();
      });
  }

  guardar(evento: Event, formulario: HTMLFormElement): void {
    evento.preventDefault();
    if (
      !this.permisos.escribir() ||
      this.guardando() ||
      this.cargando() ||
      this.conflicto() ||
      (this.id() && !this.proveedor())
    )
      return;
    const entrada = new FormData(formulario);
    const valor = (nombre: string) => String(entrada.get(nombre) ?? '');
    const datos: DatosProveedor = {
      tipo: valor('tipo') as TipoProveedor,
      denominacion: valor('denominacion').trim(),
      paisFiscal: valor('paisFiscal'),
      identificadorFiscal: valor('identificadorFiscal'),
      correoContacto: valor('correoContacto').trim() || null,
      telefonoContacto: valor('telefonoContacto').trim() || null,
    };
    const errores = validarProveedor(datos);
    this.errores.set(errores);
    this.error.set('');
    if (Object.keys(errores).length) {
      this.error.set('Revisa los campos indicados. Los datos no se han guardado.');
      this.enfocar();
      return;
    }
    this.guardando.set(true);
    const actual = this.proveedor();
    const peticion = actual
      ? this.api.modificar(actual.id, datos, actual.version)
      : this.api.crear(datos);
    peticion
      .pipe(
        takeUntilDestroyed(this.destruccion),
        finalize(() => this.guardando.set(false)),
      )
      .subscribe({
        next: (proveedor) =>
          void this.router.navigate(['/proveedores', proveedor.id], {
            queryParamsHandling: 'preserve',
          }),
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
