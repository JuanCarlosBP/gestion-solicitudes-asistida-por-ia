import { Routes } from '@angular/router';
import { Inicio } from './inicio/inicio';
import { NoEncontrada } from './navegacion/no-encontrada';
import { AccesoPagina } from './identidad/acceso';
import { MiCuenta } from './identidad/mi-cuenta';
import { sesionGuard } from './identidad/sesion-guard';
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'inicio' },
  { path: 'inicio', component: Inicio, title: 'Inicio · Gestión de Solicitudes' },
  { path: 'acceso', component: AccesoPagina, title: 'Acceso · Gestión de Solicitudes' },
  {
    path: 'mi-cuenta',
    component: MiCuenta,
    canActivate: [sesionGuard],
    title: 'Mi cuenta · Gestión de Solicitudes',
  },
  { path: '**', component: NoEncontrada, title: 'Página no encontrada · Gestión de Solicitudes' },
];
