import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { paginaPrueba, solicitudPrueba, supervisorPrueba } from './datos-prueba';
import { ReferenciaSelector } from './referencia-selector';

describe.each(['proveedor', 'supervisor'] as const)(
  'AG018: búsqueda escrita de %s en nueva solicitud',
  (tipo) => {
    const url = tipo === 'proveedor' ? '/api/proveedores' : '/api/identidad/supervisores';
    const parametro = tipo === 'proveedor' ? 'denominacion' : 'nombre';
    const resultado = tipo === 'proveedor' ? solicitudPrueba.proveedor : supervisorPrueba;
    const id = tipo === 'proveedor' ? solicitudPrueba.proveedorId! : supervisorPrueba.id;

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
      http.expectOne((r) => r.url === url).flush(paginaPrueba([resultado]));
      vista.detectChanges();
      const html = vista.nativeElement as HTMLElement;
      const campo = html.querySelector<HTMLInputElement>('input[type=search]')!;
      const select = html.querySelector<HTMLSelectElement>('select')!;
      const cambios = vi.fn();
      vista.componentInstance.cambio.subscribe(cambios);
      function escribir(texto: string) {
        campo.value = texto;
        campo.dispatchEvent(new Event('input', { bubbles: true }));
        vista.detectChanges();
      }
      return { http, vista, campo, select, html, cambios, escribir };
    }

    it.each(['Proveedor ficticio 5', 'ficticio', '  FICTICIO 5  ', 'Álamo %_'])(
      'escribir %s filtra sin pulsar Buscar y no cambia la selección',
      (texto) => {
        const { http, vista, campo, select, cambios, escribir } = montar();
        escribir(texto);
        expect(campo.disabled).toBe(false);
        expect(select.disabled).toBe(true);
        vi.advanceTimersByTime(299);
        http.expectNone((r) => r.url === url);
        vi.advanceTimersByTime(1);
        const consulta = http.expectOne((r) => r.url === url);
        expect(consulta.request.params.get(parametro)).toBe(texto.trim());
        expect(consulta.request.params.get('page')).toBe('0');
        if (tipo === 'proveedor') expect(consulta.request.params.get('activo')).toBe('true');
        consulta.flush(paginaPrueba([resultado]));
        vista.detectChanges();
        expect(select.disabled).toBe(false);
        expect(campo.value).toBe(texto);
        expect(cambios).not.toHaveBeenCalled();
        expect(select.value).toBe('');
      },
    );

    it('agrupar escritura rápida solo envía el último término', () => {
      const { http, vista, escribir } = montar();
      escribir('Pro');
      vi.advanceTimersByTime(200);
      escribir('Proveedor');
      vi.advanceTimersByTime(200);
      http.expectNone((r) => r.url === url);
      vi.advanceTimersByTime(100);
      const consulta = http.expectOne((r) => r.url === url);
      expect(consulta.request.params.get(parametro)).toBe('Proveedor');
      consulta.flush(paginaPrueba([]));
      vista.detectChanges();
    });

    it('cancela una respuesta anterior desde que se escribe el nuevo término', () => {
      const { http, vista, escribir } = montar();
      escribir('Primera');
      vi.advanceTimersByTime(300);
      const anterior = http.expectOne((r) => r.url === url);
      escribir('Segunda');
      expect(anterior.cancelled).toBe(true);
      vi.advanceTimersByTime(300);
      const nueva = http.expectOne((r) => r.url === url);
      expect(nueva.request.params.get(parametro)).toBe('Segunda');
      nueva.flush(paginaPrueba([resultado]));
      vista.detectChanges();
      expect(vista.componentInstance.nombre()).toBe('Segunda');
    });

    it.each(['Enter', 'botón'])(
      '%s busca de inmediato y no genera un segundo envío 300 ms después',
      (modo) => {
        const { http, vista, campo, html, escribir } = montar();
        escribir('Nombre completo');
        if (modo === 'Enter') {
          const evento = new KeyboardEvent('keydown', {
            key: 'Enter',
            bubbles: true,
            cancelable: true,
          });
          campo.dispatchEvent(evento);
          expect(evento.defaultPrevented).toBe(true);
        } else {
          html.querySelector<HTMLButtonElement>('.busqueda-referencia button')!.click();
        }
        const consulta = http.expectOne((r) => r.url === url);
        expect(consulta.request.params.get(parametro)).toBe('Nombre completo');
        consulta.flush(paginaPrueba([resultado]));
        vi.advanceTimersByTime(400);
        http.expectNone((r) => r.url === url);
        http.expectNone((r) => ['POST', 'PUT', 'DELETE'].includes(r.method));
        vista.detectChanges();
      },
    );

    it('borrar el texto recupera opciones al instante sin borrar el ID seleccionado', () => {
      const { http, vista, select, cambios, escribir } = montar();
      select.value = id;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      vista.componentRef.setInput('valor', id);
      vista.detectChanges();
      expect(cambios).toHaveBeenCalledWith(id);
      escribir('No hay coincidencias');
      vi.advanceTimersByTime(300);
      http.expectOne((r) => r.url === url).flush(paginaPrueba([]));
      vista.detectChanges();
      expect(select.value).toBe(id);
      escribir('');
      const todas = http.expectOne((r) => r.url === url);
      expect(todas.request.params.has(parametro)).toBe(false);
      expect(todas.request.params.get('page')).toBe('0');
      todas.flush(paginaPrueba([resultado]));
      vista.detectChanges();
      expect(select.value).toBe(id);
      expect(cambios).toHaveBeenCalledTimes(1);
    });

    it('entrada demasiado larga cancela lo pendiente, no envía HTTP y muestra el límite', () => {
      const { http, vista, html, escribir } = montar();
      escribir('Consulta en curso');
      vi.advanceTimersByTime(300);
      const pendiente = http.expectOne((r) => r.url === url);
      escribir('x'.repeat(129));
      expect(pendiente.cancelled).toBe(true);
      vi.advanceTimersByTime(500);
      http.expectNone((r) => r.url === url);
      vista.detectChanges();
      expect(html.textContent).toContain('128 caracteres');
      expect(vista.componentInstance.buscando()).toBe(false);
    });

    it('un error recuperable no expone detalles y una nueva búsqueda vuelve a funcionar', () => {
      const { http, vista, html, escribir } = montar();
      escribir('Primera');
      vi.advanceTimersByTime(300);
      http
        .expectOne((r) => r.url === url)
        .flush({ detalle: 'información privada' }, { status: 503, statusText: 'Error' });
      vista.detectChanges();
      expect(html.textContent).not.toContain('información privada');
      expect(vista.componentInstance.error()).not.toBe('');
      escribir('Segunda');
      vi.advanceTimersByTime(300);
      http.expectOne((r) => r.url === url).flush(paginaPrueba([resultado]));
      vista.detectChanges();
      expect(vista.componentInstance.error()).toBe('');
    });

    it('composición de teclado no envía una palabra a medio escribir', () => {
      const { http, vista, campo } = montar();
      campo.value = 'Á';
      campo.dispatchEvent(new InputEvent('input', { bubbles: true, isComposing: true }));
      vi.advanceTimersByTime(350);
      http.expectNone((r) => r.url === url);
      campo.value = 'Álamo';
      campo.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
      vi.advanceTimersByTime(300);
      const consulta = http.expectOne((r) => r.url === url);
      expect(consulta.request.params.get(parametro)).toBe('Álamo');
      consulta.flush(paginaPrueba([]));
      vista.detectChanges();
    });
  },
);
