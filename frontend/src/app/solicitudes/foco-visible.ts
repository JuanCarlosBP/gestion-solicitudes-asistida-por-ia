import { DestroyRef, Directive, ElementRef, inject } from '@angular/core';

/** Mantiene el control enfocado por encima de la altura real de la barra sticky. */
@Directive({
  selector: '[appFocoVisible]',
  host: { '(focusin)': 'mostrar($event)' },
})
export class FocoVisible {
  private readonly anfitrion = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly ventana = this.anfitrion.nativeElement.ownerDocument.defaultView;
  private pendiente: number | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      if (this.pendiente !== null) this.ventana?.cancelAnimationFrame(this.pendiente);
    });
  }

  mostrar(evento: FocusEvent): void {
    const control = evento.target;
    if (!(control instanceof HTMLElement) || !this.ventana) return;
    if (this.pendiente !== null) this.ventana.cancelAnimationFrame(this.pendiente);
    this.despejar(control);
    // Recomprueba tras el desplazamiento nativo que puede seguir al evento focusin.
    this.pendiente = this.ventana.requestAnimationFrame(() => {
      this.pendiente = null;
      this.despejar(control);
    });
  }

  private despejar(control: HTMLElement): void {
    const ventana = this.ventana;
    const documento = this.anfitrion.nativeElement.ownerDocument;
    if (!ventana || documento.activeElement !== control) return;
    const barra = this.anfitrion.nativeElement.querySelector<HTMLElement>('.barra-resumen');
    if (!barra || barra.contains(control) || ventana.getComputedStyle(barra).position !== 'sticky')
      return;
    const limite = barra.getBoundingClientRect();
    if (limite.top >= ventana.innerHeight || limite.bottom <= 0) return;
    const rectangulo = control.getBoundingClientRect();
    const margen = 16;
    const fondoVisible = Math.min(ventana.innerHeight - margen, limite.top - margen);
    if (rectangulo.bottom > fondoVisible) {
      ventana.scrollBy({ top: rectangulo.bottom - fondoVisible, behavior: 'instant' });
    } else if (rectangulo.top < margen) {
      ventana.scrollBy({ top: rectangulo.top - margen, behavior: 'instant' });
    }
  }
}
