import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SaludApi } from './salud-api';
@Component({ selector: 'app-inicio', templateUrl: './inicio.html', styleUrl: './inicio.css' })
export class Inicio implements OnInit {
  private readonly api = inject(SaludApi);
  private readonly destruccion = inject(DestroyRef);
  readonly estado = signal<'carga' | 'disponible' | 'error'>('carga');
  ngOnInit() {
    this.comprobar();
  }
  comprobar() {
    this.estado.set('carga');
    this.api
      .consultar()
      .pipe(takeUntilDestroyed(this.destruccion))
      .subscribe({
        next: (salud) => this.estado.set(salud.estado === 'DISPONIBLE' ? 'disponible' : 'error'),
        error: () => this.estado.set('error'),
      });
  }
}
