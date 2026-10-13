import {
  Component,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { Autenticacion } from './autenticacion';
import { UsuarioPublico } from './identidad-modelo';

@Component({
  selector: 'app-mi-cuenta',
  imports: [RouterLink],
  templateUrl: './mi-cuenta.html',
  styleUrl: './identidad.css',
})
export class MiCuenta implements OnInit {
  private readonly autenticacion = inject(Autenticacion);
  private readonly router = inject(Router);
  private readonly destruccion = inject(DestroyRef);
  private readonly titulo = viewChild<ElementRef<HTMLElement>>('titulo');
  readonly usuario = signal<UsuarioPublico | null>(null);
  readonly estado = signal<'carga' | 'listo' | 'error' | 'cierre' | 'error-cierre'>('carga');

  ngOnInit(): void {
    this.consultar();
  }

  consultar(): void {
    this.estado.set('carga');
    this.autenticacion
      .identidad()
      .pipe(takeUntilDestroyed(this.destruccion))
      .subscribe({
        next: (usuario) => {
          if (this.estado() === 'cierre' || this.estado() === 'error-cierre') return;
          this.usuario.set(usuario);
          this.estado.set('listo');
          this.titulo()?.nativeElement.focus();
        },
        error: () => {
          if (this.estado() !== 'cierre' && this.estado() !== 'error-cierre')
            this.estado.set('error');
        },
      });
  }

  salir(): void {
    if (this.estado() === 'cierre') return;
    this.estado.set('cierre');
    this.usuario.set(null);
    this.autenticacion
      .cerrarSesion()
      .pipe(takeUntilDestroyed(this.destruccion))
      .subscribe({
        next: () => void this.router.navigateByUrl('/acceso'),
        error: () => this.estado.set('error-cierre'),
      });
  }
}
