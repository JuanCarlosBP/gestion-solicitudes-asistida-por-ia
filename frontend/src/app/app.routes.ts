import { Routes } from '@angular/router';
import { Inicio } from './inicio/inicio';
import { NoEncontrada } from './navegacion/no-encontrada';
import { AccesoPagina } from './identidad/acceso';
import { MiCuenta } from './identidad/mi-cuenta';
import { sesionGuard } from './identidad/sesion-guard';
import { ProveedoresLista } from './proveedores/proveedores-lista';
import { ProveedorDetalle } from './proveedores/proveedor-detalle';
import { ProveedorFormulario } from './proveedores/proveedor-formulario';
import { proveedoresGuard } from './proveedores/proveedores-permisos';
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
  {
    path: 'proveedores',
    component: ProveedoresLista,
    canActivate: [proveedoresGuard],
    title: 'Proveedores · Gestión de Solicitudes',
  },
  {
    path: 'proveedores/nuevo',
    component: ProveedorFormulario,
    canActivate: [proveedoresGuard],
    data: { escritura: true },
    title: 'Nuevo proveedor · Gestión de Solicitudes',
  },
  {
    path: 'proveedores/:id/editar',
    component: ProveedorFormulario,
    canActivate: [proveedoresGuard],
    data: { escritura: true },
    title: 'Editar proveedor · Gestión de Solicitudes',
  },
  {
    path: 'proveedores/:id',
    component: ProveedorDetalle,
    canActivate: [proveedoresGuard],
    title: 'Proveedor · Gestión de Solicitudes',
  },
  { path: '**', component: NoEncontrada, title: 'Página no encontrada · Gestión de Solicitudes' },
];
