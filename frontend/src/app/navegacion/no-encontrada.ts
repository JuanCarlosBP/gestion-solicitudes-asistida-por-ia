import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
@Component({
  selector: 'app-no-encontrada',
  imports: [RouterLink],
  template: `<h1>Página no encontrada</h1>
    <p>La dirección solicitada no está disponible.</p>
    <a routerLink="/inicio">Volver al inicio</a>`,
})
export class NoEncontrada {}
