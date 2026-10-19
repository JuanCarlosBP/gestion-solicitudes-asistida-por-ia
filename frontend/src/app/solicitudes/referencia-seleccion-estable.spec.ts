import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { paginaPrueba, solicitudPrueba, supervisorPrueba } from './datos-prueba';
import { ReferenciaSelector } from './referencia-selector';

describe.each(['proveedor', 'supervisor'] as const)(
  'AG018: identidad estable de la opción de %s',
  (tipo) => {
    const url = tipo === 'proveedor' ? '/api/proveedores' : '/api/identidad/supervisores';
    const original = tipo === 'proveedor' ? solicitudPrueba.proveedor : supervisorPrueba;
    const id = tipo === 'proveedor' ? solicitudPrueba.proveedorId! : supervisorPrueba.id;
    const otroId = '00000000-0000-4000-8000-000000009999';
    const otro = { ...original, id: otroId };

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [provideHttpClient(), provideHttpClientTesting()],
      });
      vi.useFakeTimers();
    });
    afterEach(() => {
      TestBed.inject(HttpTestingController).verify();
      vi.useRealTimers();
    });

    function montar() {
      const http = TestBed.inject(HttpTestingController);
      const vista = TestBed.createComponent(ReferenciaSelector);
      vista.componentRef.setInput('tipo', tipo);
      vista.detectChanges();
      http.expectOne((r) => r.url === url).flush(paginaPrueba([original, otro]));
      vista.detectChanges();
      const html = vista.nativeElement as HTMLElement;
      const select = html.querySelector<HTMLSelectElement>('select')!;
      const campo = html.querySelector<HTMLInputElement>('input[type=search]')!;
      const cambios = vi.fn();
      vista.componentInstance.cambio.subscribe(cambios);
      select.value = id;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      vista.componentRef.setInput('valor', id);
      vista.detectChanges();
      const nodo = Array.from(select.options).find((opcion) => opcion.value === id)!;

      function escribir(texto: string) {
        campo.value = texto;
        campo.dispatchEvent(new Event('input', { bubbles: true }));
        vista.detectChanges();
      }
      function conservar() {
        expect(select.value).toBe(id);
        expect(Array.from(select.options).filter((opcion) => opcion.value === id)).toHaveLength(1);
        expect(Array.from(select.options).find((opcion) => opcion.value === id)).toBe(nodo);
        expect(vista.componentInstance.valor()).toBe(id);
        expect(cambios).toHaveBeenCalledTimes(1);
      }
      return { http, vista, html, select, cambios, escribir, conservar };
    }

    it('conserva el mismo nodo durante la espera, sin resultados y al borrar el texto', () => {
      const { http, vista, escribir, conservar } = montar();
      escribir('Sin coincidencias');
      conservar();
      vi.advanceTimersByTime(300);
      http.expectOne((r) => r.url === url).flush(paginaPrueba([]));
      vista.detectChanges();
      conservar();
      escribir('');
      conservar();
      http.expectOne((r) => r.url === url).flush(paginaPrueba([original, otro]));
      vista.detectChanges();
      conservar();
    });

    it('recibir otros resultados no sustituye la opción elegida ni inventa coincidencias', () => {
      const { http, vista, select, escribir, conservar } = montar();
      escribir('Otro resultado');
      vi.advanceTimersByTime(300);
      http.expectOne((r) => r.url === url).flush(paginaPrueba([otro]));
      vista.detectChanges();
      conservar();
      expect(vista.componentInstance.pagina()?.totalElementos).toBe(1);
      expect(vista.componentInstance.opciones().map((opcion) => opcion.id)).toEqual([id, otroId]);
      expect(select.options[1].value).toBe(id);
    });

    it('no duplica la selección cuando vuelve en otra posición y con una instancia nueva', () => {
      const { http, vista, escribir, conservar } = montar();
      escribir('Sin resultados');
      vi.advanceTimersByTime(300);
      http.expectOne((r) => r.url === url).flush(paginaPrueba([]));
      vista.detectChanges();
      escribir('De nuevo');
      vi.advanceTimersByTime(300);
      http.expectOne((r) => r.url === url).flush(paginaPrueba([otro, { ...original }]));
      vista.detectChanges();
      conservar();
      expect(vista.componentInstance.opciones().map((opcion) => opcion.id)).toEqual([id, otroId]);
    });

    it('un error de consulta conserva la selección y una búsqueda posterior se recupera', () => {
      const { http, vista, html, escribir, conservar } = montar();
      escribir('Consulta');
      vi.advanceTimersByTime(300);
      http
        .expectOne((r) => r.url === url)
        .flush({ detalle: 'NO PUBLICAR' }, { status: 503, statusText: 'Unavailable' });
      vista.detectChanges();
      conservar();
      expect(html.textContent).not.toContain('NO PUBLICAR');
      escribir('');
      http.expectOne((r) => r.url === url).flush(paginaPrueba([original]));
      vista.detectChanges();
      conservar();
      expect(vista.componentInstance.error()).toBe('');
    });

    it('cambiar de página sin la referencia elegida no la retira del control', () => {
      const { http, vista, conservar } = montar();
      vista.componentInstance.buscar('', 1);
      vista.detectChanges();
      conservar();
      const peticion = http.expectOne((r) => r.url === url);
      expect(peticion.request.params.get('page')).toBe('1');
      peticion.flush(paginaPrueba([otro]));
      vista.detectChanges();
      conservar();
    });

    it('la selección recibida del padre se conserva incluso sin coincidencias', () => {
      const { http, vista, select, cambios, escribir } = montar();
      const externa = '00000000-0000-4000-8000-000000008888';
      vista.componentRef.setInput('valor', externa);
      vista.componentRef.setInput('nombreActual', 'Referencia del borrador');
      vista.detectChanges();
      expect(select.value).toBe(externa);
      const nodo = Array.from(select.options).find((opcion) => opcion.value === externa);
      escribir('Sin resultados');
      vi.advanceTimersByTime(300);
      http.expectOne((r) => r.url === url).flush(paginaPrueba([]));
      vista.detectChanges();
      expect(select.value).toBe(externa);
      expect(Array.from(select.options).find((opcion) => opcion.value === externa)).toBe(nodo);
      expect(cambios).toHaveBeenCalledTimes(1);
    });

    it('elegir Sin referencia sí emite null y no vuelve a elegir automáticamente', () => {
      const { http, vista, select, cambios, escribir } = montar();
      escribir('Sin resultados');
      vi.advanceTimersByTime(300);
      http.expectOne((r) => r.url === url).flush(paginaPrueba([]));
      vista.detectChanges();
      select.value = '';
      select.dispatchEvent(new Event('change', { bubbles: true }));
      vista.componentRef.setInput('valor', null);
      vista.detectChanges();
      expect(select.value).toBe('');
      expect(cambios).toHaveBeenLastCalledWith(null);
      escribir('');
      http.expectOne((r) => r.url === url).flush(paginaPrueba([original, otro]));
      vista.detectChanges();
      expect(select.value).toBe('');
      expect(cambios).toHaveBeenCalledTimes(2);
    });

    it('una respuesta cancelada no cambia la selección ni los resultados nuevos', () => {
      const { http, vista, escribir, conservar } = montar();
      escribir('Primera');
      vi.advanceTimersByTime(300);
      const anterior = http.expectOne((r) => r.url === url);
      escribir('Segunda');
      expect(anterior.cancelled).toBe(true);
      conservar();
      vi.advanceTimersByTime(300);
      http.expectOne((r) => r.url === url).flush(paginaPrueba([otro]));
      vista.detectChanges();
      conservar();
      expect(vista.componentInstance.nombre()).toBe('Segunda');
    });
  },
);
