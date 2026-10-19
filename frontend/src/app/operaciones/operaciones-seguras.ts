import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, inject, Injectable, signal, WritableSignal } from '@angular/core';
import { catchError, defer, finalize, map, Observable, switchMap, tap, throwError } from 'rxjs';
import { SesionStore } from '../identidad/sesion-store';
import { DemoContexto } from '../demo/demo-contexto';
import {
  ConsultaOperacion,
  DescriptorOperacion,
  descriptorValido,
  esUuid,
  EstadoOperacion,
  Operacion,
  prefijoOperaciones,
  ResultadoOperacion,
  VistaOperacion,
} from './operacion-modelo';
import { PLATAFORMA_OPERACIONES } from './plataforma-operaciones';

/** Asociación en memoria de un formulario con el descriptor realmente reclamado. */
export type IntencionOperacion = WritableSignal<DescriptorOperacion | undefined>;

@Injectable({ providedIn: 'root' })
export class OperacionesSeguras {
  private readonly http = inject(HttpClient);
  private readonly sesion = inject(SesionStore);
  private readonly demo = inject(DemoContexto);
  private readonly plataforma = inject(PLATAFORMA_OPERACIONES);
  private readonly consultas = new Set<string>();
  private readonly confirmadas = new Map<string, ResultadoOperacion | undefined>();
  private readonly epocasIntencion = new WeakMap<IntencionOperacion, number>();
  private usuarioActual: string | null = null;
  readonly operaciones = signal<VistaOperacion[]>([]);
  readonly problema = signal('');

  constructor() {
    const escuchar = (evento: StorageEvent) => {
      if (evento.key?.startsWith(prefijoOperaciones) && this.sesion.usuario()) {
        // También consultar al desaparecer una entrada: otra pestaña puede haber confirmado.
        this.recuperarPendientes();
      }
    };
    window.addEventListener('storage', escuchar);
    inject(DestroyRef).onDestroy(() => window.removeEventListener('storage', escuchar));
  }

  ejecutar<T>(
    operacion: Operacion,
    recursoId: string | undefined,
    enviar: (clave: string) => Observable<T>,
    clavePropuesta?: string,
    alRecuperar?: (resultado: ResultadoOperacion) => Observable<T>,
    intencion?: IntencionOperacion,
  ): Observable<T> {
    return defer(() => {
      if (
        intencion &&
        this.epocasIntencion.has(intencion) &&
        this.epocasIntencion.get(intencion) !== this.sesion.epoca
      )
        intencion.set(undefined);
      const asociado = intencion?.();
      if (asociado && this.confirmadas.has(this.claveMemoria(asociado.clave)))
        return throwError(() =>
          this.errorConfirmada(this.confirmadas.get(this.claveMemoria(asociado.clave))),
        );
      const epoca = this.sesion.epoca;
      let descriptor: DescriptorOperacion | undefined;
      let ambito = '';
      let reclamado = false;
      this.problema.set('');
      return this.ambito().pipe(
        switchMap((actual) => {
          ambito = actual;
          return this.plataforma.coordinar(
            `${prefijoOperaciones}${ambito}.${operacion}.${recursoId ?? ''}`,
            () => {
              if (epoca !== this.sesion.epoca) throw new Error('SESION_CAMBIADA');
              const recordado = intencion?.();
              if (
                recordado &&
                (recordado.operacion !== operacion || recordado.recursoId !== recursoId)
              )
                throw new Error('INTENCION_INCOMPATIBLE');
              const anterior =
                (recordado && descriptorValido(recordado, Date.now()) ? recordado : undefined) ??
                this.leer(ambito).find(
                  (dato) => dato.operacion === operacion && dato.recursoId === recursoId,
                );
              descriptor = anterior ?? {
                clave: clavePropuesta ?? crypto.randomUUID(),
                operacion,
                ...(recursoId ? { recursoId } : {}),
                fecha: Date.now(),
              };
              if (!descriptorValido(descriptor, Date.now())) throw new Error('DESCRIPTOR_INVALIDO');
              // Persistir ANTES de enviar; si almacenamiento falla, no hay efecto remoto.
              localStorage.setItem(
                this.nombre(ambito, descriptor.clave),
                JSON.stringify(descriptor),
              );
              reclamado = true;
              intencion?.set(descriptor);
              if (intencion) this.epocasIntencion.set(intencion, epoca);
              return descriptor;
            },
          );
        }),
        switchMap((intento) => {
          if (epoca !== this.sesion.epoca) return throwError(() => new Error('SESION_CAMBIADA'));
          this.mostrar(intento, 'ENVIANDO', 'Enviando operación…');
          return enviar(intento.clave);
        }),
        tap((respuesta) => {
          if (epoca !== this.sesion.epoca || !descriptor) return;
          this.limpiar(ambito, descriptor);
          this.mostrar(
            descriptor,
            'COMPLETADA',
            'Operación completada.',
            this.resumen(respuesta, operacion),
          );
        }),
        catchError((error: unknown) => {
          if (epoca === this.sesion.epoca) {
            if (descriptor && reclamado) {
              const resultadoConfirmado = this.confirmadas.get(this.claveMemoria(descriptor.clave));
              if (this.confirmadas.has(this.claveMemoria(descriptor.clave))) {
                const fallo = this.fallo(error);
                const incierto =
                  fallo.status === undefined ||
                  fallo.status === 0 ||
                  fallo.status >= 500 ||
                  fallo.codigo === 'OPERACION_EN_PROGRESO';
                if (!incierto)
                  return throwError(() => this.errorConfirmada(resultadoConfirmado, error));
                // Una confirmación por GET prevalece sobre el fallo tardío del POST.
                // El consumidor navega al recurso recuperado; no inicia otra alta.
                return alRecuperar && resultadoConfirmado
                  ? alRecuperar(resultadoConfirmado).pipe(
                      catchError(() => throwError(() => this.errorConfirmada(resultadoConfirmado))),
                    )
                  : throwError(() => this.errorConfirmada(resultadoConfirmado));
              }
              // Otra pestaña puede estar usando esta clave, incluso tras un 400 local.
              // Corregir una entrada rechazada reutiliza la clave; servidor no cachea errores.
              this.mostrarFallo(descriptor, error);
            } else {
              this.problema.set(
                'No se puede iniciar una operación segura. Comprueba la sesión, el almacenamiento y que el navegador permita la coordinación entre pestañas. Puedes seguir consultando operaciones pendientes.',
              );
            }
          }
          return throwError(() => error);
        }),
        finalize(() => {
          if (
            descriptor &&
            reclamado &&
            epoca === this.sesion.epoca &&
            this.operaciones().some(
              (vista) =>
                vista.descriptor.clave === descriptor?.clave && vista.estado === 'ENVIANDO',
            )
          ) {
            this.mostrar(
              descriptor,
              'PENDIENTE',
              'Operación pendiente de confirmar. Consulta su resultado; conservamos el intento aunque salgas de esta pantalla.',
            );
          }
        }),
      );
    });
  }

  cambiarUsuario(usuarioId: string | null): void {
    const ambitoUsuario = usuarioId ? this.identidadAmbito(usuarioId) : null;
    if (ambitoUsuario === this.usuarioActual) return;
    this.usuarioActual = ambitoUsuario;
    this.confirmadas.clear();
    this.operaciones.set([]);
    this.problema.set('');
    if (usuarioId) this.recuperarPendientes();
  }

  resultadoConfirmado(descriptor: DescriptorOperacion | undefined): ResultadoOperacion | undefined {
    // La señal notifica también si otra tarjeta sustituye la del intento anterior.
    this.operaciones();
    return descriptor ? this.confirmadas.get(this.claveMemoria(descriptor.clave)) : undefined;
  }

  recuperarPendientes(): void {
    const epoca = this.sesion.epoca;
    this.ambito().subscribe({
      next: (ambito) => {
        if (epoca !== this.sesion.epoca) return;
        try {
          const pendientes = this.leer(ambito);
          for (const vista of this.operaciones()) {
            if (
              vista.estado !== 'COMPLETADA' &&
              !pendientes.some((dato) => dato.clave === vista.descriptor.clave)
            )
              pendientes.push(vista.descriptor);
          }
          for (const descriptor of pendientes) this.recuperar(descriptor);
        } catch {
          this.problema.set(
            'No se puede leer el almacenamiento de operaciones pendientes. Comprueba los permisos del navegador.',
          );
        }
      },
      error: () => {
        if (epoca === this.sesion.epoca)
          this.problema.set('No se pueden recuperar operaciones sin una sesión disponible.');
      },
    });
  }

  recuperar(descriptor: DescriptorOperacion): void {
    const claveConsulta = this.claveMemoria(descriptor.clave);
    if (this.consultas.has(claveConsulta)) return;
    const epoca = this.sesion.epoca;
    this.consultas.add(claveConsulta);
    this.mostrar(descriptor, 'RECUPERANDO', 'Recuperando el resultado de la operación…');
    this.ambito()
      .pipe(
        switchMap((ambito) => {
          if (epoca !== this.sesion.epoca) return throwError(() => new Error('SESION_CAMBIADA'));
          return this.http
            .get<ConsultaOperacion>(
              `/api/operaciones-idempotentes/${encodeURIComponent(descriptor.clave)}`,
              { timeout: 10000 },
            )
            .pipe(map((respuesta) => ({ ambito, respuesta })));
        }),
        finalize(() => this.consultas.delete(claveConsulta)),
      )
      .subscribe({
        next: ({ ambito, respuesta }) => {
          if (epoca !== this.sesion.epoca) return;
          if (
            respuesta.operacion !== descriptor.operacion ||
            (descriptor.recursoId && respuesta.recursoId !== descriptor.recursoId)
          ) {
            this.mostrar(
              descriptor,
              'CONFLICTO',
              'El resultado no corresponde a esta operación. Conservamos el intento para revisarlo.',
            );
          } else if (respuesta.estado === 'EN_PROGRESO') {
            this.mostrar(
              descriptor,
              'PENDIENTE',
              'Operación pendiente. Vuelve a consultar su resultado sin iniciar otra operación.',
            );
          } else if (
            respuesta.estado === 'COMPLETADA' &&
            esUuid(respuesta.resultado?.id) &&
            respuesta.recursoId === respuesta.resultado.id
          ) {
            this.limpiar(ambito, descriptor);
            this.mostrar(
              descriptor,
              'COMPLETADA',
              'Operación completada. Resultado recuperado sin repetir el efecto.',
              respuesta.resultado,
            );
          } else {
            this.mostrar(
              descriptor,
              'PENDIENTE',
              'No se ha podido confirmar el resultado. Conservamos el mismo intento.',
            );
          }
        },
        error: (error: unknown) => {
          if (epoca === this.sesion.epoca) this.mostrarFallo(descriptor, error, true);
        },
      });
  }

  ruta(vista: VistaOperacion): string[] {
    const proveedor = vista.descriptor.operacion.includes('PROVEEDOR');
    const id = vista.resultado?.id ?? vista.descriptor.recursoId;
    return id
      ? [proveedor ? '/proveedores' : '/solicitudes', id]
      : [proveedor ? '/proveedores/nuevo' : '/solicitudes/nueva'];
  }

  private ambito(): Observable<string> {
    const usuarioId = this.sesion.usuario()?.id;
    return this.plataforma.ambito(usuarioId ? this.identidadAmbito(usuarioId) : null);
  }
  private identidadAmbito(usuarioId: string): string {
    const selector = this.demo.selector();
    return selector ? `${selector}|${usuarioId}` : usuarioId;
  }
  private claveMemoria(clave: string): string {
    return `${this.identidadAmbito(this.sesion.usuario()?.id ?? '')}|${clave}`;
  }
  private nombre(ambito: string, clave: string): string {
    return `${prefijoOperaciones}${ambito}.${clave}`;
  }
  private leer(ambito: string): DescriptorOperacion[] {
    const prefijo = `${prefijoOperaciones}${ambito}.`;
    const descriptores: DescriptorOperacion[] = [];
    const claves = Array.from({ length: localStorage.length }, (_, indice) =>
      localStorage.key(indice),
    ).filter((clave): clave is string => !!clave && clave.startsWith(prefijo));
    for (const clave of claves) {
      try {
        const dato: unknown = JSON.parse(localStorage.getItem(clave) ?? 'null');
        if (descriptorValido(dato, Date.now()) && clave === this.nombre(ambito, dato.clave))
          descriptores.push(dato);
        else localStorage.removeItem(clave);
      } catch {
        localStorage.removeItem(clave);
      }
    }
    return descriptores;
  }
  private limpiar(ambito: string, descriptor: DescriptorOperacion): void {
    try {
      localStorage.removeItem(this.nombre(ambito, descriptor.clave));
    } catch {
      this.problema.set(
        'El resultado está confirmado, pero el navegador no permitió limpiar el descriptor. Se volverá a comprobar al recuperar.',
      );
    }
  }
  private mostrar(
    descriptor: DescriptorOperacion,
    estado: EstadoOperacion,
    mensaje: string,
    resultado?: ResultadoOperacion,
  ): void {
    const clave = this.claveMemoria(descriptor.clave);
    if (estado !== 'COMPLETADA' && this.confirmadas.has(clave)) return;
    if (estado === 'COMPLETADA') this.confirmadas.set(clave, resultado);
    this.operaciones.update((actuales) => [
      ...actuales.filter(
        (vista) =>
          vista.descriptor.clave !== descriptor.clave &&
          !(
            vista.estado === 'COMPLETADA' &&
            vista.descriptor.operacion === descriptor.operacion &&
            vista.descriptor.recursoId === descriptor.recursoId
          ),
      ),
      { descriptor, estado, mensaje, ...(resultado ? { resultado } : {}) },
    ]);
  }
  private errorConfirmada(resultado?: ResultadoOperacion, original?: unknown): HttpErrorResponse {
    const fallo = this.fallo(original);
    return new HttpErrorResponse({
      status: fallo.status ?? 409,
      error: {
        error: fallo.codigo ?? 'OPERACION_YA_COMPLETADA',
        operacionConfirmada: true,
        ...(resultado ? { recursoId: resultado.id } : {}),
      },
    });
  }
  private fallo(error: unknown) {
    const dato = error as { status?: number; error?: { error?: string } } | null;
    return { status: dato?.status, codigo: dato?.error?.error };
  }
  private mostrarFallo(descriptor: DescriptorOperacion, error: unknown, consulta = false): void {
    const { status, codigo } = this.fallo(error);
    if (status === 503)
      this.mostrar(
        descriptor,
        'DEPENDENCIA',
        'Dependencia no disponible. Conservamos el intento; vuelve a consultar antes de repetir.',
      );
    else if (status === 409 && codigo !== 'OPERACION_EN_PROGRESO')
      this.mostrar(
        descriptor,
        'CONFLICTO',
        'Conflicto. Revisa el estado actual antes de continuar; no se sobrescriben cambios.',
      );
    else if (consulta && status === 404)
      this.mostrar(
        descriptor,
        'PENDIENTE',
        'No se ha localizado un resultado visible para tu cuenta. Conservamos el intento: consulta de nuevo o vuelve al formulario e introduce la misma entrada para reintentarlo.',
      );
    else if (status === 401 || status === 403)
      this.mostrar(
        descriptor,
        'CONFLICTO',
        'No se puede consultar o ejecutar con los permisos actuales. El resultado no se muestra.',
      );
    else
      this.mostrar(
        descriptor,
        'PENDIENTE',
        'Operación pendiente de confirmar. Consulta su resultado o reintenta la misma entrada; se conserva la clave.',
      );
  }
  private resumen(respuesta: unknown, operacion: Operacion): ResultadoOperacion | undefined {
    const dato = respuesta as {
      id?: string;
      version?: number;
      estado?: string;
      activo?: boolean;
      numero?: string;
    } | null;
    if (!esUuid(dato?.id) || typeof dato?.version !== 'number') return undefined;
    return {
      estadoHttp: operacion.startsWith('CREAR_') ? 201 : 200,
      id: dato.id,
      version: dato.version,
      estado: dato.estado ?? (dato.activo ? 'ACTIVO' : 'INACTIVO'),
      ...(dato.numero ? { numero: dato.numero } : {}),
    };
  }
}
