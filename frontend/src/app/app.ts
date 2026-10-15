import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SesionStore } from './identidad/sesion-store';
import { PermisosProveedores } from './proveedores/proveedores-permisos';
import { PermisosSolicitudes } from './solicitudes/solicitudes-permisos';
import { OperacionesPanel } from './operaciones/operaciones-panel';
import { PermisosHistorial } from './historial/historial-permisos';
@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, OperacionesPanel],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly sesion = inject(SesionStore);
  readonly proveedores = inject(PermisosProveedores);
  readonly solicitudes = inject(PermisosSolicitudes);
  readonly historial = inject(PermisosHistorial);
}
