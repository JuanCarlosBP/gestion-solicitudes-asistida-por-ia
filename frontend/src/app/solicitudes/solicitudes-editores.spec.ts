import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ConceptosEditor } from './conceptos-editor';
import { paginaPrueba, solicitudPrueba, supervisorPrueba } from './datos-prueba';
import { ReferenciaSelector } from './referencia-selector';
import { EntradaConcepto } from './solicitud-modelo';

describe('Editor de conceptos: colección atómica y teclado', () => {
  function montar(lineas = solicitudPrueba.conceptos as EntradaConcepto[]) {
    const vista = TestBed.createComponent(ConceptosEditor);
    vista.componentRef.setInput('conceptos', lineas);
    vista.detectChanges();
    const cambios: EntradaConcepto[][] = [];
    vista.componentInstance.cambio.subscribe((valor) => {
      cambios.push(valor);
      vista.componentRef.setInput('conceptos', valor);
    });
    return { vista, cambios, componente: vista.componentInstance };
  }
  it('agrega sin UUID local, cambia cantidad, reordena conservando IDs y quita sin posiciones repetidas', () => {
    const { vista, cambios, componente } = montar();
    componente.agregar();
    vista.detectChanges();
    expect(cambios[0][3]).toMatchObject({ id: null, posicion: 4 });
    componente.editar(3, 'descripcion', 'Nueva línea');
    vista.detectChanges();
    expect(cambios[1][3].descripcion).toBe('Nueva línea');
    componente.mover(3, -1);
    vista.detectChanges();
    expect(cambios[2][2].descripcion).toBe('Nueva línea');
    expect(cambios[2][3].id).toBe(solicitudPrueba.conceptos[2].id);
    componente.quitar(0);
    vista.detectChanges();
    expect(cambios[3].map((c) => c.posicion)).toEqual([1, 2, 3]);
    expect(cambios[3]).not.toContainEqual(solicitudPrueba.conceptos[0]);
  });
  it('R004-UI01: añade tras posiciones no contiguas sin duplicarlas ni perder UUID', () => {
    const originales = [
      solicitudPrueba.conceptos[0],
      { ...solicitudPrueba.conceptos[1], posicion: 3 },
    ];
    const { componente, cambios } = montar(originales);
    componente.agregar();
    expect(cambios[0].map((linea) => linea.posicion)).toEqual([1, 2, 3]);
    expect(cambios[0].map((linea) => linea.id)).toEqual([originales[0].id, originales[1].id, null]);
    expect(originales.map((linea) => linea.posicion)).toEqual([1, 3]);
  });
  it('cien líneas, extremos y bloqueo evitan mutaciones', () => {
    const { componente, cambios, vista } = montar(
      Array.from({ length: 100 }, (_, i) => ({
        ...solicitudPrueba.conceptos[0],
        id: null,
        posicion: i + 1,
      })),
    );
    componente.agregar();
    componente.mover(0, -1);
    componente.mover(99, 1);
    expect(cambios).toHaveLength(0);
    vista.componentRef.setInput('deshabilitado', true);
    vista.detectChanges();
    componente.editar(0, 'cantidad', '2');
    componente.quitar(0);
    componente.mover(1, -1);
    expect(cambios).toHaveLength(0);
  });
  it('todos los controles tienen etiqueta y los botones de orden nombre contextual', () => {
    const { vista } = montar();
    const html = vista.nativeElement as HTMLElement;
    for (const control of html.querySelectorAll('input,select,textarea'))
      expect(html.querySelector(`label[for="${control.id}"]`)).not.toBeNull();
    expect(html.querySelector('button[aria-label="Subir concepto 1"]')).not.toBeNull();
    expect(html.querySelector('button[aria-label="Quitar concepto 3"]')).not.toBeNull();
  });
});

describe('Selectores acotados de referencias', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  function peticion(tipo: 'proveedor' | 'supervisor') {
    return TestBed.inject(HttpTestingController).expectOne(
      (p) => p.url === (tipo === 'proveedor' ? '/api/proveedores' : '/api/identidad/supervisores'),
    );
  }
  function montar(tipo: 'proveedor' | 'supervisor') {
    const vista = TestBed.createComponent(ReferenciaSelector);
    vista.componentRef.setInput('tipo', tipo);
    vista.detectChanges();
    return vista;
  }
  it('proveedores consulta exclusivamente activos, pagina y conserva búsqueda literal', () => {
    const vista = montar('proveedor');
    const inicial = peticion('proveedor');
    expect(inicial.request.params.get('activo')).toBe('true');
    inicial.flush({ ...paginaPrueba([solicitudPrueba.proveedor]), totalPaginas: 2 });
    vista.detectChanges();
    vista.componentInstance.buscar('Álamo %_', 1);
    const siguiente = peticion('proveedor');
    expect(siguiente.request.params.get('page')).toBe('1');
    expect(siguiente.request.params.get('denominacion')).toBe('Álamo %_');
    siguiente.flush(paginaPrueba([]));
    vista.detectChanges();
    expect((vista.nativeElement as HTMLElement).textContent).toContain('0 resultados');
  });
  it('supervisor selecciona, limpia y mantiene referencia fuera de la página', () => {
    const vista = montar('supervisor');
    peticion('supervisor').flush(paginaPrueba([supervisorPrueba]));
    vista.detectChanges();
    const cambio = vi.fn();
    vista.componentInstance.cambio.subscribe(cambio);
    vista.componentInstance.seleccionar(supervisorPrueba.id);
    expect(cambio).toHaveBeenCalledWith(supervisorPrueba.id);
    vista.componentRef.setInput('valor', supervisorPrueba.id);
    vista.detectChanges();
    vista.componentInstance.buscar('Otra');
    peticion('supervisor').flush(paginaPrueba([]));
    vista.detectChanges();
    expect((vista.nativeElement as HTMLElement).textContent).toContain(
      supervisorPrueba.nombreVisible,
    );
    expect(vista.componentInstance.fueraDePagina()).toBe(true);
    vista.componentInstance.seleccionar('');
    expect(cambio).toHaveBeenCalledWith(null);
  });
  it('error consulta recuperable sin reflejar cuerpo ni borrar referencia', () => {
    const vista = montar('proveedor');
    vista.componentRef.setInput('valor', solicitudPrueba.proveedorId);
    vista.componentRef.setInput('nombreActual', 'Proveedor guardado');
    peticion('proveedor').flush({ error: 'privado' }, { status: 503, statusText: 'Error' });
    vista.detectChanges();
    expect((vista.nativeElement as HTMLElement).textContent).not.toContain('privado');
    expect((vista.nativeElement as HTMLElement).textContent).toContain('Proveedor guardado');
    vista.componentInstance.buscar('');
    peticion('proveedor').flush(paginaPrueba([]));
    vista.detectChanges();
    expect(vista.componentInstance.error()).toBe('');
  });
  it('R004-UI02: Enter busca y cancela el submit implícito del formulario padre', () => {
    const vista = montar('proveedor');
    peticion('proveedor').flush(paginaPrueba([]));
    vista.detectChanges();
    const campo = (vista.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input')!;
    campo.value = 'Proveedor concreto';
    const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    campo.dispatchEvent(enter);
    expect(enter.defaultPrevented).toBe(true);
    const consulta = peticion('proveedor');
    expect(consulta.request.params.get('denominacion')).toBe('Proveedor concreto');
    consulta.flush(paginaPrueba([]));
    TestBed.inject(HttpTestingController).expectNone((p) => p.method === 'PUT');
  });
  it('rechaza búsqueda demasiado larga sin HTTP y respeta deshabilitación', () => {
    const vista = montar('supervisor');
    peticion('supervisor').flush(paginaPrueba([]));
    vista.detectChanges();
    vista.componentInstance.buscar('a'.repeat(129));
    expect(vista.componentInstance.error()).toContain('128');
    vista.componentRef.setInput('deshabilitado', true);
    vista.detectChanges();
    vista.componentInstance.buscar('Ana');
    TestBed.inject(HttpTestingController).expectNone(
      (p) => p.url === '/api/identidad/supervisores',
    );
  });
});
