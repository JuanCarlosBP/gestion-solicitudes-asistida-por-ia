import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { Autenticacion } from '../identidad/autenticacion';
import { SesionStore } from '../identidad/sesion-store';
import { DemoApi } from './demo-api';
import { DemoContexto } from './demo-contexto';
import { PresentacionDemo, RolDemo } from './demo-modelo';

@Component({
  selector: 'app-demo-pagina',
  imports: [DatePipe],
  templateUrl: './demo-pagina.html',
  styleUrl: './demo-pagina.css',
})
export class DemoPagina implements OnInit {
  private readonly api = inject(DemoApi);
  private readonly autenticacion = inject(Autenticacion);
  private readonly router = inject(Router);
  private readonly destruccion = inject(DestroyRef);
  private readonly ahora = signal(Date.now());
  readonly contexto = inject(DemoContexto);
  readonly sesion = inject(SesionStore);
  readonly presentacion = signal<PresentacionDemo | null>(null);
  readonly ocupada = signal(false);
  readonly cargando = signal(true);
  readonly error = signal('');
  readonly mensaje = signal('');
  readonly minutos = computed(() => {
    const reserva = this.contexto.reserva();
    if (!reserva) return 0;
    const restantes = Math.ceil((Date.parse(reserva.expiraEn) - this.ahora()) / 60000);
    // Un desfase entre servidor y navegador no amplía la duración anunciada por la API.
    return Math.max(0, Math.min(restantes, this.presentacion()?.duracionMinutos ?? restantes));
  });
  readonly guias: { rol: RolDemo; nombre: string; destino: string; pasos: string[] }[] = [
    {
      rol: 'SOLICITANTE',
      nombre: 'Solicitante',
      destino: '/solicitudes',
      pasos: [
        'Entra como solicitante y crea una nueva solicitud.',
        'Elige un proveedor del catálogo preparado, asigna al supervisor y añade conceptos e importes ficticios.',
        'Guarda el borrador, revisa el total y presenta la solicitud.',
        'Vuelve a Demo para cambiar de rol; después podrás consultar la decisión y el historial de tu solicitud.',
      ],
    },
    {
      rol: 'SUPERVISOR',
      nombre: 'Supervisor',
      destino: '/aprobaciones',
      pasos: [
        'Entra como supervisor y abre la bandeja de aprobaciones.',
        'Selecciona una solicitud que hayas presentado y asignado a este supervisor.',
        'Revisa conceptos e importes; aprueba o rechaza indicando el motivo cuando corresponda.',
        'Consulta la decisión registrada. Una solicitud finalizada no admite otra decisión.',
      ],
    },
    {
      rol: 'AUDITOR',
      nombre: 'Auditor',
      destino: '/historial',
      pasos: [
        'Entra como auditor y abre el historial de tu espacio.',
        'Filtra los eventos por operación, recurso o fecha.',
        'Abre una solicitud para consultar su evolución; el acceso es de lectura.',
        'Regresa al inicio para revisar el resumen de solicitudes visibles en esta reserva.',
      ],
    },
  ];

  constructor() {
    const reloj = setInterval(() => this.ahora.set(Date.now()), 1000);
    this.destruccion.onDestroy(() => clearInterval(reloj));
  }

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.api
      .presentacion()
      .pipe(
        takeUntilDestroyed(this.destruccion),
        finalize(() => this.cargando.set(false)),
      )
      .subscribe({
        next: (dato) => {
          this.presentacion.set(dato);
          if (this.contexto.reserva()) this.comprobar();
        },
        error: (fallo: unknown) => {
          this.presentacion.set(null);
          this.error.set(
            fallo instanceof HttpErrorResponse && fallo.status === 404
              ? 'La demo no está habilitada en este entorno.'
              : 'No se ha podido consultar la disponibilidad de la demo. Vuelve a intentarlo.',
          );
        },
      });
  }

  reservar(): void {
    if (this.ocupada()) return;
    this.ocupada.set(true);
    this.error.set('');
    this.mensaje.set('');
    this.api
      .reservar()
      .pipe(
        takeUntilDestroyed(this.destruccion),
        finalize(() => this.ocupada.set(false)),
      )
      .subscribe({
        next: () => {
          this.ahora.set(Date.now());
          this.mensaje.set('Espacio reservado. Elige un rol para comenzar.');
        },
        error: (fallo: unknown) => this.mostrarError(fallo),
      });
  }

  entrar(rol: RolDemo): void {
    if (this.ocupada() || !this.contexto.reserva()) return;
    this.ocupada.set(true);
    this.error.set('');
    this.autenticacion
      .iniciarDemo(rol)
      .pipe(
        takeUntilDestroyed(this.destruccion),
        finalize(() => this.ocupada.set(false)),
      )
      .subscribe({
        next: () => {
          void this.router.navigateByUrl(this.guias.find((guia) => guia.rol === rol)!.destino);
        },
        error: (fallo: unknown) => this.mostrarError(fallo),
      });
  }

  liberar(): void {
    if (this.ocupada() || !this.contexto.reserva()) return;
    this.ocupada.set(true);
    this.error.set('');
    this.api
      .liberar()
      .pipe(
        takeUntilDestroyed(this.destruccion),
        finalize(() => this.ocupada.set(false)),
      )
      .subscribe({
        next: () => {
          this.mensaje.set(
            'Reserva liberada. Los datos de esta demo dejarán de estar disponibles.',
          );
          this.cargar();
        },
        error: (fallo: unknown) => this.mostrarError(fallo),
      });
  }

  private comprobar(): void {
    this.ocupada.set(true);
    this.api
      .comprobarReserva()
      .pipe(
        takeUntilDestroyed(this.destruccion),
        finalize(() => this.ocupada.set(false)),
      )
      .subscribe({ error: (fallo: unknown) => this.mostrarError(fallo) });
  }

  private mostrarError(fallo: unknown): void {
    const codigo =
      fallo instanceof HttpErrorResponse
        ? (fallo.error as { error?: string } | null)?.error
        : undefined;
    this.error.set(
      codigo === 'DEMO_CAPACIDAD_OCUPADA'
        ? 'Todos los espacios están ocupados. No se ha creado una reserva. Vuelve a intentarlo cuando quede uno disponible.'
        : codigo === 'DEMO_RESERVA_INVALIDA'
          ? 'Tu reserva ha caducado o ya no corresponde a esta pestaña. Reserva de nuevo para continuar.'
          : fallo instanceof HttpErrorResponse && fallo.status === 429
            ? 'Se ha alcanzado el límite de peticiones. Espera antes de volver a intentarlo.'
            : 'No se ha podido completar la operación. Comprueba tu reserva y vuelve a intentarlo.',
    );
  }
}
