import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FocoVisible } from './foco-visible';

@Component({
  selector: 'app-prueba-foco',
  imports: [FocoVisible],
  template:
    '<form appFocoVisible><input aria-label="Concepto" /><div class="barra-resumen" style="position: sticky"><button type="button">Guardar</button></div></form>',
})
class PruebaFoco {}

describe('R004-UI03: foco visible sobre la barra', () => {
  function montar(posicion = 'sticky') {
    const vista = TestBed.createComponent(PruebaFoco);
    vista.detectChanges();
    const html = vista.nativeElement as HTMLElement;
    const input = html.querySelector('input')!;
    const barra = html.querySelector<HTMLElement>('.barra-resumen')!;
    barra.style.position = posicion;
    vi.spyOn(input, 'getBoundingClientRect').mockReturnValue({ top: 848, bottom: 892 } as DOMRect);
    vi.spyOn(barra, 'getBoundingClientRect').mockReturnValue({ top: 756, bottom: 892 } as DOMRect);
    const desplazar = vi.spyOn(window, 'scrollBy').mockImplementation(() => undefined);
    return { vista, input, barra, desplazar };
  }
  afterEach(() => vi.restoreAllMocks());

  it('desplaza el control oculto por la barra con margen visible y sin animación', () => {
    const { input, desplazar } = montar();
    input.focus();
    expect(desplazar).toHaveBeenCalledWith({ top: 152, behavior: 'instant' });
  });
  it('mide nuevamente una barra más alta sin fijar alturas por dispositivo', () => {
    const { input, barra, desplazar } = montar();
    vi.mocked(barra.getBoundingClientRect).mockReturnValue({ top: 695, bottom: 892 } as DOMRect);
    input.focus();
    expect(desplazar).toHaveBeenCalledWith({ top: 213, behavior: 'instant' });
  });
  it('no altera desplazamiento móvil cuando la barra es estática', () => {
    const { input, desplazar } = montar('static');
    input.focus();
    expect(desplazar).not.toHaveBeenCalled();
  });
  it('los controles de la propia barra conservan navegación nativa', () => {
    const { barra, desplazar } = montar();
    barra.querySelector('button')!.focus();
    expect(desplazar).not.toHaveBeenCalled();
  });
});
