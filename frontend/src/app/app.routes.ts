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
import { SolicitudesLista } from './solicitudes/solicitudes-lista';
import { SolicitudFormulario } from './solicitudes/solicitud-formulario';
import { SolicitudDetalle } from './solicitudes/solicitud-detalle';
import { solicitudesGuard } from './solicitudes/solicitudes-permisos';
import { HistorialPagina } from './historial/historial-pagina';
import { historialGuard } from './historial/historial-permisos';
import { DemoPagina } from './demo/demo-pagina';
export const routes: Routes = [
  { path: 'demo', component: DemoPagina, title: 'Demo · Gestión de Solicitudes' },
  {
    path: 'historial',
    component: HistorialPagina,
    canActivate: [historialGuard],
    title: 'Historial · Gestión de Solicitudes',
  },
  {
    path: 'solicitudes/:id/historial',
    component: HistorialPagina,
    canActivate: [solicitudesGuard],
    data: { tipoRecurso: 'SOLICITUD' },
    title: 'Historial de solicitud · Gestión de Solicitudes',
  },
  {
    path: 'proveedores/:id/historial',
    component: HistorialPagina,
    canActivate: [historialGuard],
    data: { tipoRecurso: 'PROVEEDOR' },
    title: 'Historial de proveedor · Gestión de Solicitudes',
  },
  {
    path: 'aprobaciones',
    component: SolicitudesLista,
    canActivate: [solicitudesGuard],
    data: { bandeja: true, supervision: true },
    title: 'Aprobaciones · Gestión de Solicitudes',
  },
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
  {
    path: 'solicitudes',
    component: SolicitudesLista,
    canActivate: [solicitudesGuard],
    title: 'Solicitudes · Gestión de Solicitudes',
  },
  {
    path: 'solicitudes/nueva',
    component: SolicitudFormulario,
    canActivate: [solicitudesGuard],
    data: { escritura: true },
    title: 'Nueva solicitud · Gestión de Solicitudes',
  },
  {
    path: 'solicitudes/:id/editar',
    component: SolicitudFormulario,
    canActivate: [solicitudesGuard],
    data: { escritura: true },
    title: 'Editar borrador · Gestión de Solicitudes',
  },
  {
    path: 'solicitudes/:id',
    component: SolicitudDetalle,
    canActivate: [solicitudesGuard],
    title: 'Solicitud · Gestión de Solicitudes',
  },
  { path: '**', component: NoEncontrada, title: 'Página no encontrada · Gestión de Solicitudes' },
];
