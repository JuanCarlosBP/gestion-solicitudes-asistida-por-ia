import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, switchMap } from 'rxjs';
import {
  DetalleSolicitud,
  esConflictoSolicitud,
  mensajeErrorSolicitud,
  TipoDecision,
} from './solicitud-modelo';
import { SolicitudesApi } from './solicitudes-api';
import { PermisosSolicitudes } from './solicitudes-permisos';

/** Mismos límites Unicode que DatosBorrador.texto; no elimina BOM, que no es espacio. */
export function normalizarTextoDecision(texto: string): string {
  const caracteres = [...texto];
  const espacio = (caracter: string) => {
    const codigo = caracter.codePointAt(0)!;
    return /^\p{White_Space}$/u.test(caracter) || (codigo >= 0x1c && codigo <= 0x1f);
  };
  let inicio = 0;
  let fin = caracteres.length;
  while (inicio < fin && espacio(caracteres[inicio])) inicio++;
  while (fin > inicio && espacio(caracteres[fin - 1])) fin--;
  return caracteres.slice(inicio, fin).join('');
}
export function validarTextoDecision(tipo: TipoDecision, texto: string): string {
  const caracteres = [...normalizarTextoDecision(texto)];
  if (
    caracteres.some((caracter) => {
      const codigo = caracter.codePointAt(0)!;
      return codigo === 0 || (codigo >= 0xd800 && codigo <= 0xdfff);
    })
  )
    return 'El texto contiene un carácter no admitido o incompleto. Revísalo antes de continuar.';
  if (tipo === 'APROBAR')
    return caracteres.length > 500 ? 'El comentario admite hasta 500 caracteres.' : '';
  return caracteres.length < 10 || caracteres.length > 1000
    ? 'Indica un motivo de rechazo de 10 a 1.000 caracteres.'
    : '';
}
interface IntentoDecision {
  id: string;
  version: number;
  tipo: TipoDecision;
  texto: string;
}

@Component({
  selector: 'app-solicitud-decision',
  templateUrl: './solicitud-decision.html',
  styleUrls: ['./solicitudes.css', './solicitud-decision.css'],
})
export class SolicitudDecision {
  readonly solicitud = input.required<DetalleSolicitud>();
  readonly actualizada = output<DetalleSolicitud>();
  private readonly api = inject(SolicitudesApi);
  private readonly permisos = inject(PermisosSolicitudes);
  private readonly destruccion = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly campo = viewChild<ElementRef<HTMLTextAreaElement>>('campo');
  private readonly alerta = viewChild<ElementRef<HTMLElement>>('alerta');
  private readonly resumen = viewChild<ElementRef<HTMLElement>>('resumen');
  private intento: IntentoDecision | null = null;
  readonly tipo = signal<TipoDecision | null>(null);
  readonly texto = signal('');
  readonly textoNormalizado = computed(() => normalizarTextoDecision(this.texto()));
  readonly errorCampo = signal('');
  readonly error = signal('');
  readonly confirmar = signal(false);
  readonly guardando = signal(false);
  readonly conflicto = signal(false);
  readonly incierta = signal(false);
  readonly confirmada = signal(false);

  elegir(tipo: TipoDecision): void {
    if (
      !this.permisos.decidir(this.solicitud()) ||
      this.guardando() ||
      this.conflicto() ||
      this.incierta() ||
      this.confirmada()
    )
      return;
    this.tipo.set(tipo);
    this.texto.set('');
    this.errorCampo.set('');
    this.error.set('');
    this.confirmar.set(false);
    this.intento = null;
    this.enfocar('campo');
  }
  cambiarTexto(texto: string): void {
    if (!this.guardando() && !this.confirmar() && !this.incierta() && !this.confirmada())
      this.texto.set(texto);
  }
  revisar(evento: Event): void {
    evento.preventDefault();
    if (
      !this.tipo() ||
      this.guardando() ||
      this.conflicto() ||
      this.incierta() ||
      this.confirmada() ||
      !this.permisos.decidir(this.solicitud())
    )
      return;
    const error = validarTextoDecision(this.tipo()!, this.texto());
    this.errorCampo.set(error);
    this.error.set(error ? 'Revisa el texto indicado. La decisión no se ha enviado.' : '');
    if (error) {
      this.enfocar('alerta');
      return;
    }
    this.confirmar.set(true);
    this.enfocar('resumen');
  }
  volver(): void {
    if (this.guardando() || this.incierta() || this.confirmada() || this.conflicto()) return;
    this.confirmar.set(false);
    this.enfocar('campo');
  }
  decidir(): void {
    const actual = this.solicitud();
    if (
      !this.tipo() ||
      (!this.confirmar() && !this.incierta()) ||
      this.guardando() ||
      this.conflicto() ||
      this.confirmada() ||
      !this.permisos.decidir(actual)
    )
      return;
    this.intento ??= {
      id: actual.id,
      version: actual.version,
      tipo: this.tipo()!,
      texto: this.textoNormalizado(),
    };
    const intento = this.intento;
    this.guardando.set(true);
    this.error.set('');
    const peticion =
      intento.tipo === 'APROBAR'
        ? this.api.aprobar(intento.id, intento.version, intento.texto || null)
        : this.api.rechazar(intento.id, intento.version, intento.texto);
    peticion
      .pipe(
        switchMap(() => {
          this.confirmada.set(true);
          this.incierta.set(false);
          this.confirmar.set(false);
          return this.api.consultar(intento.id);
        }),
        takeUntilDestroyed(this.destruccion),
        finalize(() => this.guardando.set(false)),
      )
      .subscribe({
        next: (detalle) => {
          this.intento = null;
          this.actualizada.emit(detalle);
        },
        error: (error: unknown) => {
          if (this.confirmada()) {
            this.error.set(
              'La decisión se ha registrado, pero no se ha podido cargar el detalle. Recarga para consultar el resultado.',
            );
          } else {
            const status = (error as { status?: number } | null)?.status;
            this.incierta.set(
              status === undefined ||
                status === 0 ||
                status >= 500 ||
                (error as { error?: { error?: string } } | null)?.error?.error ===
                  'OPERACION_EN_PROGRESO',
            );
            this.conflicto.set(esConflictoSolicitud(error));
            this.error.set(
              this.incierta()
                ? 'No se ha podido confirmar el resultado. Reintenta la misma decisión o consulta el estado actual.'
                : mensajeErrorSolicitud(error),
            );
            if (!this.incierta() && !this.conflicto()) {
              this.intento = null;
              this.confirmar.set(false);
            }
          }
          this.enfocar('alerta');
        },
      });
  }
  recargar(): void {
    if (this.guardando()) return;
    this.guardando.set(true);
    this.api
      .consultar(this.solicitud().id)
      .pipe(
        takeUntilDestroyed(this.destruccion),
        finalize(() => this.guardando.set(false)),
      )
      .subscribe({
        next: (detalle) => {
          if (
            this.incierta() &&
            detalle.estado === 'PRESENTADA' &&
            detalle.version === this.intento?.version
          ) {
            this.error.set(
              'La solicitud sigue pendiente. Reintenta la misma decisión para confirmar su resultado.',
            );
            this.enfocar('alerta');
            return;
          }
          this.intento = null;
          this.conflicto.set(false);
          this.incierta.set(false);
          this.confirmar.set(false);
          this.error.set('');
          this.actualizada.emit(detalle);
        },
        error: () => {
          this.error.set(
            'No se ha podido cargar el estado actual. Los datos de tu decisión siguen aquí.',
          );
          this.enfocar('alerta');
        },
      });
  }
  private enfocar(destino: 'campo' | 'alerta' | 'resumen'): void {
    afterNextRender(
      () =>
        (destino === 'campo'
          ? this.campo()
          : destino === 'alerta'
            ? this.alerta()
            : this.resumen()
        )?.nativeElement.focus(),
      { injector: this.injector },
    );
  }
}
