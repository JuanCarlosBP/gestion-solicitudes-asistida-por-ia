import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SesionStore } from './identidad/sesion-store';
import { PermisosProveedores } from './proveedores/proveedores-permisos';
import { PermisosSolicitudes } from './solicitudes/solicitudes-permisos';
@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly sesion = inject(SesionStore);
  readonly proveedores = inject(PermisosProveedores);
  readonly solicitudes = inject(PermisosSolicitudes);
}
