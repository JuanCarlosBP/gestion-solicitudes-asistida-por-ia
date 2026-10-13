import { Component, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { Autenticacion } from './autenticacion';

@Component({
  selector: 'app-acceso',
  imports: [RouterLink],
  templateUrl: './acceso.html',
  styleUrl: './identidad.css',
})
export class AccesoPagina {
  private readonly autenticacion = inject(Autenticacion);
  private readonly router = inject(Router);
  private readonly destruccion = inject(DestroyRef);
  private readonly errorVisible = viewChild<ElementRef<HTMLElement>>('errorVisible');
  readonly cargando = signal(false);
  readonly error = signal(false);

  entrar(evento: Event, correo: HTMLInputElement, contrasena: HTMLInputElement): void {
    evento.preventDefault();
    if (this.cargando()) return;
    this.error.set(false);
    this.cargando.set(true);
    this.autenticacion
      .iniciarSesion(correo.value, contrasena.value)
      .pipe(
        takeUntilDestroyed(this.destruccion),
        finalize(() => this.cargando.set(false)),
      )
      .subscribe({
        next: () => {
          contrasena.value = '';
          void this.router.navigateByUrl('/mi-cuenta');
        },
        error: () => {
          contrasena.value = '';
          this.error.set(true);
          this.errorVisible()?.nativeElement.focus();
        },
      });
  }
}
