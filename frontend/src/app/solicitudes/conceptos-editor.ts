import { Component, input, output } from '@angular/core';
import { EntradaConcepto, nombresUnidad, unidades, UnidadConcepto } from './solicitud-modelo';
import { euros, importeLineaEstimado } from './solicitud-calculos';

@Component({
  selector: 'app-conceptos-editor',
  templateUrl: './conceptos-editor.html',
  styleUrls: ['./solicitudes.css', './conceptos-tabla.css', './conceptos-editor.css'],
})
export class ConceptosEditor {
  readonly conceptos = input.required<EntradaConcepto[]>();
  readonly errores = input<Record<string, string>>({});
  readonly deshabilitado = input(false);
  readonly cambio = output<EntradaConcepto[]>();
  readonly unidades = unidades;
  readonly nombresUnidad = nombresUnidad;
  readonly importe = importeLineaEstimado;
  readonly euros = euros;

  editar(
    indice: number,
    campo: 'descripcion' | 'cantidad' | 'unidad' | 'precioUnitario',
    valor: string,
  ): void {
    if (this.deshabilitado()) return;
    this.cambio.emit(
      this.conceptos().map((concepto, i) =>
        i === indice
          ? {
              ...concepto,
              [campo]: campo === 'unidad' ? (valor as UnidadConcepto) : valor,
            }
          : concepto,
      ),
    );
  }
  agregar(): void {
    if (this.deshabilitado() || this.conceptos().length >= 100) return;
    this.cambio.emit(
      [
        ...this.conceptos(),
        {
          id: null,
          descripcion: '',
          cantidad: '1',
          unidad: 'UNIDAD' as const,
          precioUnitario: '',
          posicion: this.conceptos().length + 1,
        },
      ].map((linea, indice) => ({ ...linea, posicion: indice + 1 })),
    );
  }
  quitar(indice: number): void {
    if (this.deshabilitado()) return;
    this.cambio.emit(
      this.conceptos()
        .filter((_, i) => i !== indice)
        .map((linea, i) => ({ ...linea, posicion: i + 1 })),
    );
  }
  mover(indice: number, desplazamiento: number): void {
    const destino = indice + desplazamiento;
    if (this.deshabilitado() || destino < 0 || destino >= this.conceptos().length) return;
    const lineas = [...this.conceptos()];
    [lineas[indice], lineas[destino]] = [lineas[destino], lineas[indice]];
    this.cambio.emit(lineas.map((linea, i) => ({ ...linea, posicion: i + 1 })));
  }
  error(indice: number, campo: string): string {
    return this.errores()[`conceptos.${indice}.${campo}`] ?? '';
  }
}
