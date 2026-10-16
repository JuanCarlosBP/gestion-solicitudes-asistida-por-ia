import { Routes } from '@angular/router';
import { Inicio } from './inicio/inicio';
import { NoEncontrada } from './navegacion/no-encontrada';
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'inicio' },
  { path: 'inicio', component: Inicio, title: 'Inicio · Gestión de Solicitudes' },
  { path: '**', component: NoEncontrada, title: 'Página no encontrada · Gestión de Solicitudes' },
];
