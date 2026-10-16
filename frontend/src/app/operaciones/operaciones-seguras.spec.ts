import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { firstValueFrom, of, Subject, throwError } from 'rxjs';
import { accesoPrueba } from '../identidad/datos-prueba';
import { SesionStore } from '../identidad/sesion-store';
import { plataformaOperacionesPrueba, prepararOperacionesPrueba } from './datos-prueba';
import {
  DescriptorOperacion,
  descriptorValido,
  duracionDescriptor,
  nombresOperacion,
  Operacion,
  prefijoOperaciones,
} from './operacion-modelo';
import { OperacionesPanel } from './operaciones-panel';
import { OperacionesSeguras } from './operaciones-seguras';
import { PLATAFORMA_OPERACIONES } from './plataforma-operaciones';

const clave = '00000000-0000-4000-8000-000000000601';
const recursoId = '00000000-0000-4000-8000-000000000602';
const clave2 = '00000000-0000-4000-8000-000000000603';
const resultado = {
  estadoHttp: 201 as const,
  id: recursoId,
  version: 0,
  estado: 'BORRADOR',
  numero: 'SOL-2026-000601',
};
const nuevoDescriptor = (): DescriptorOperacion => ({
  clave,
  operacion: 'CREAR_BORRADOR',
  fecha: Date.now(),
});
const completada = { estado: 'COMPLETADA', operacion: 'CREAR_BORRADOR', recursoId, resultado };

describe('CI-07: descriptor estricto y caducidad cliente', () => {
  it('admite únicamente descriptor mínimo vigente, sin identidad ni entrada', () => {
    expect(descriptorValido(nuevoDescriptor(), Date.now())).toBe(true);
    expect(
      descriptorValido({ ...nuevoDescriptor(), operacion: 'PRESENTAR', recursoId }, Date.now()),
    ).toBe(true);
  });
  it.each([
    null,
    [],
    { clave: 'no-uuid' },
    { operacion: 'BORRAR' },
    { fecha: Number.NaN },
    { fecha: Date.now() + 60000 },
    { fecha: Date.now() - duracionDescriptor },
    { recursoId },
    { operacion: 'APROBAR' },
    { cuerpo: {} },
    { token: 'ficticio' },
    { identificadorFiscal: 'ficticio' },
    { motivo: 'ficticio' },
    { comentario: 'ficticio' },
  ])('rechaza descriptor inválido, vencido o con campos adicionales %#', (entrada) => {
    const dato =
      entrada && !Array.isArray(entrada) ? { ...nuevoDescriptor(), ...entrada } : entrada;
    expect(descriptorValido(dato, Date.now())).toBe(false);
  });
});

describe('CI-01/06/07/09: operaciones seguras', () => {
  let servicio: OperacionesSeguras;
  let http: HttpTestingController;
  beforeEach(() => {
    prepararOperacionesPrueba();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    servicio = TestBed.inject(OperacionesSeguras);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });
  const nombre = (id = clave, cuenta = 'cuenta-prueba') => `${prefijoOperaciones}${cuenta}.${id}`;
  function enviar(operacion: Operacion = 'CREAR_BORRADOR', recurso?: string, propuesta?: string) {
    return servicio.ejecutar(
      operacion,
      recurso,
      (valor) =>
        TestBed.inject(HttpClient).post(
          '/api/prueba',
          { asunto: 'Dato ficticio no persistible' },
          { headers: { 'Idempotency-Key': valor } },
        ),
      propuesta,
    );
  }
  function guardar(descriptor = nuevoDescriptor(), cuenta = 'cuenta-prueba') {
    localStorage.setItem(nombre(descriptor.clave, cuenta), JSON.stringify(descriptor));
    return descriptor;
  }
  function datos() {
    return JSON.parse(localStorage.getItem(localStorage.key(0)!)!) as DescriptorOperacion;
  }

  it.each(Object.keys(nombresOperacion) as Operacion[])(
    'genera UUID y descriptor exacto antes de enviar %s; limpia tras éxito',
    (operacion) => {
      const id = operacion.startsWith('CREAR_') ? undefined : recursoId;
      enviar(operacion, id).subscribe();
      const peticion = http.expectOne('/api/prueba');
      const descriptor = datos();
      expect(Object.keys(descriptor).sort()).toEqual(
        (id
          ? ['clave', 'operacion', 'recursoId', 'fecha']
          : ['clave', 'operacion', 'fecha']
        ).sort(),
      );
      expect(descriptorValido(descriptor, Date.now())).toBe(true);
      expect(peticion.request.headers.get('Idempotency-Key')).toBe(descriptor.clave);
      expect(JSON.stringify(descriptor)).not.toContain('Dato ficticio');
      expect(servicio.operaciones()[0].estado).toBe('ENVIANDO');
      peticion.flush({ id: recursoId, version: 0, estado: 'BORRADOR' });
      expect(localStorage.length).toBe(0);
      expect(servicio.operaciones()[0].estado).toBe('COMPLETADA');
    },
  );
  it.each([0, 400, 401, 403, 404, 409, 500, 503])(
    'error %s mantiene descriptor y próxima petición misma clave',
    (status) => {
      enviar().subscribe({ error: () => undefined });
      const primera = http.expectOne('/api/prueba');
      const descriptor = datos();
      if (status === 0) primera.error(new ProgressEvent('error'));
      else primera.flush({ error: 'ERROR_CONTROLADO' }, { status, statusText: 'Error' });
      expect(datos()).toEqual(descriptor);
      enviar().subscribe();
      const repetida = http.expectOne('/api/prueba');
      expect(repetida.request.headers.get('Idempotency-Key')).toBe(descriptor.clave);
      repetida.flush({ id: recursoId, version: 0, estado: 'BORRADOR' });
    },
  );
  it('OPERACION_EN_PROGRESO es pendiente y no un conflicto de versión', () => {
    enviar().subscribe({ error: () => undefined });
    http
      .expectOne('/api/prueba')
      .flush(
        { error: 'OPERACION_EN_PROGRESO' },
        { status: 409, statusText: 'Conflict', headers: { 'Retry-After': '1' } },
      );
    expect(servicio.operaciones()[0].estado).toBe('PENDIENTE');
    expect(localStorage.length).toBe(1);
  });
  it('cancelación al navegar conserva intento y muestra pendiente', () => {
    const suscripcion = enviar().subscribe();
    const peticion = http.expectOne('/api/prueba');
    suscripcion.unsubscribe();
    expect(peticion.cancelled).toBe(true);
    expect(localStorage.length).toBe(1);
    expect(servicio.operaciones()[0].estado).toBe('PENDIENTE');
  });
  it('GET completado prevalece sobre POST fallido tardío y resuelve consumidor sin nuevo envío', () => {
    const posterior = new Subject<unknown>();
    const recibido = vi.fn();
    const fallo = vi.fn();
    servicio
      .ejecutar(
        'CREAR_BORRADOR',
        undefined,
        () => posterior,
        undefined,
        (confirmado) => of(confirmado),
      )
      .subscribe({ next: recibido, error: fallo });
    const descriptor = datos();
    servicio.recuperar(descriptor);
    http.expectOne(`/api/operaciones-idempotentes/${descriptor.clave}`).flush(completada);
    posterior.error({ status: 0 });
    expect(recibido).toHaveBeenCalledWith(resultado);
    expect(fallo).not.toHaveBeenCalled();
    expect(servicio.operaciones()[0].estado).toBe('COMPLETADA');
    expect(localStorage.length).toBe(0);
    http.expectNone('/api/prueba');
  });
  it.each(['EN_PROGRESO', 'ERROR'] as const)(
    'POST confirmado prevalece sobre GET tardío %s',
    (tipo) => {
      enviar().subscribe();
      const post = http.expectOne('/api/prueba');
      const descriptor = datos();
      servicio.recuperar(descriptor);
      const consulta = http.expectOne(`/api/operaciones-idempotentes/${descriptor.clave}`);
      post.flush(resultado);
      if (tipo === 'EN_PROGRESO') consulta.flush({ estado: tipo, operacion: 'CREAR_BORRADOR' });
      else
        consulta.flush(
          { error: 'DEPENDENCIA_NO_DISPONIBLE' },
          { status: 503, statusText: 'Error' },
        );
      expect(servicio.operaciones()[0].estado).toBe('COMPLETADA');
      expect(localStorage.length).toBe(0);
    },
  );
  it.each(['CLAVE_IDEMPOTENCIA_REUTILIZADA', 'VERSION_OBSOLETA'])(
    'GET completado no transforma el conflicto tardío %s de otra entrada en éxito',
    (codigo) => {
      const recibido = vi.fn();
      const fallo = vi.fn();
      const recuperar = vi.fn(() => of(resultado));
      const iniciar = (asunto: string) =>
        servicio.ejecutar(
          'CREAR_BORRADOR',
          undefined,
          (idempotencia) =>
            TestBed.inject(HttpClient).post(
              '/api/prueba',
              { asunto },
              { headers: { 'Idempotency-Key': idempotencia } },
            ),
          undefined,
          recuperar,
        );
      iniciar('Entrada A ficticia').subscribe();
      const primera = http.expectOne('/api/prueba');
      iniciar('Entrada B distinta ficticia').subscribe({ next: recibido, error: fallo });
      const segunda = http.expectOne('/api/prueba');
      const descriptor = datos();
      expect(segunda.request.headers.get('Idempotency-Key')).toBe(
        primera.request.headers.get('Idempotency-Key'),
      );
      expect(segunda.request.body).not.toEqual(primera.request.body);
      primera.flush(resultado);
      servicio.recuperar(descriptor);
      http.expectOne(`/api/operaciones-idempotentes/${descriptor.clave}`).flush(completada);
      segunda.flush({ error: codigo }, { status: 409, statusText: 'Conflict' });
      expect(recibido).not.toHaveBeenCalled();
      expect(recuperar).not.toHaveBeenCalled();
      expect(fallo).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          status: 409,
          error: { error: codigo, operacionConfirmada: true, recursoId },
        }),
      );
      expect(servicio.operaciones()[0]).toMatchObject({ estado: 'COMPLETADA', resultado });
      expect(localStorage.length).toBe(0);
    },
  );
  it('confirmación sigue terminal cuando el detalle de recuperación falla', () => {
    const posterior = new Subject<unknown>();
    const error = vi.fn();
    servicio
      .ejecutar(
        'CREAR_BORRADOR',
        undefined,
        () => posterior,
        undefined,
        () => throwError(() => ({ status: 503 })),
      )
      .subscribe({ error });
    const descriptor = datos();
    servicio.recuperar(descriptor);
    http.expectOne(`/api/operaciones-idempotentes/${descriptor.clave}`).flush(completada);
    posterior.error({ status: 0 });
    expect(error.mock.calls[0][0]).toMatchObject({
      status: 409,
      error: { error: 'OPERACION_YA_COMPLETADA' },
    });
    expect(servicio.operaciones()[0].estado).toBe('COMPLETADA');
    expect(servicio.operaciones()[0].resultado).toEqual(resultado);
    expect(localStorage.length).toBe(0);
  });
  it('reapertura recupera éxito sin reenviar cuerpo y limpia descriptor', () => {
    guardar();
    servicio.recuperarPendientes();
    expect(servicio.operaciones()[0].estado).toBe('RECUPERANDO');
    const peticion = http.expectOne(`/api/operaciones-idempotentes/${clave}`);
    expect(peticion.request.method).toBe('GET');
    expect(peticion.request.body).toBeNull();
    peticion.flush(completada);
    expect(localStorage.length).toBe(0);
    expect(servicio.operaciones()[0]).toMatchObject({ estado: 'COMPLETADA', resultado });
    http.expectNone('/api/prueba');
  });
  it.each([404, 401, 403, 503, 500, 0])(
    'recuperación fallida %s no elimina descriptor ni genera otra clave',
    (status) => {
      const original = guardar();
      servicio.recuperar(original);
      const consulta = http.expectOne(`/api/operaciones-idempotentes/${clave}`);
      if (status === 0) consulta.error(new ProgressEvent('error'));
      else consulta.flush({ error: 'ERROR_CONTROLADO' }, { status, statusText: 'Error' });
      expect(datos()).toEqual(original);
      enviar(undefined, undefined, clave2).subscribe();
      const repetida = http.expectOne('/api/prueba');
      expect(repetida.request.headers.get('Idempotency-Key')).toBe(clave);
      repetida.flush(resultado);
    },
  );
  it('estado en progreso conserva descriptor y admite consulta manual posterior', () => {
    const descriptor = guardar();
    servicio.recuperar(descriptor);
    http
      .expectOne(`/api/operaciones-idempotentes/${clave}`)
      .flush({ estado: 'EN_PROGRESO', operacion: 'CREAR_BORRADOR' });
    expect(servicio.operaciones()[0].estado).toBe('PENDIENTE');
    expect(localStorage.length).toBe(1);
    servicio.recuperar(descriptor);
    http.expectOne(`/api/operaciones-idempotentes/${clave}`).flush(completada);
    expect(localStorage.length).toBe(0);
  });
  it('TTL exacto24h y JSON malformado se limpian sin consultar servidor ni otras claves', () => {
    guardar({ ...nuevoDescriptor(), fecha: Date.now() - duracionDescriptor });
    localStorage.setItem(nombre(clave2), '{incorrecto');
    localStorage.setItem('ajeno', 'no tocar');
    servicio.recuperarPendientes();
    http.expectNone((peticion) => peticion.url.startsWith('/api/operaciones-idempotentes'));
    expect(localStorage.length).toBe(1);
    expect(localStorage.getItem('ajeno')).toBe('no tocar');
    localStorage.removeItem('ajeno');
  });
  it('estado completado de operación distinta no limpia ni expone resultado', () => {
    const descriptor = guardar();
    servicio.recuperar(descriptor);
    http
      .expectOne(`/api/operaciones-idempotentes/${clave}`)
      .flush({ ...completada, operacion: 'APROBAR' });
    expect(localStorage.length).toBe(1);
    expect(servicio.operaciones()[0].estado).toBe('CONFLICTO');
    expect(servicio.operaciones()[0].resultado).toBeUndefined();
  });
  it('dos instancias reclaman misma clave; A400 tardío no elimina B con respuesta perdida', () => {
    const segunda = TestBed.runInInjectionContext(() => new OperacionesSeguras());
    const respuestaA = new Subject<unknown>();
    const respuestaB = new Subject<unknown>();
    const claves: string[] = [];
    servicio
      .ejecutar('CREAR_BORRADOR', undefined, (valor) => {
        claves.push(valor);
        return respuestaA;
      })
      .subscribe({ error: () => undefined });
    segunda
      .ejecutar('CREAR_BORRADOR', undefined, (valor) => {
        claves.push(valor);
        return respuestaB;
      })
      .subscribe({ error: () => undefined });
    expect(claves[0]).toBe(claves[1]);
    respuestaB.error({ status: 0 });
    respuestaA.error({ status: 400 });
    expect(datos().clave).toBe(claves[0]);
    enviar().subscribe();
    const tercera = http.expectOne('/api/prueba');
    expect(tercera.request.headers.get('Idempotency-Key')).toBe(claves[0]);
    tercera.flush(resultado);
  });
  it('eventos de otra pestaña recuperan descriptor sin almacenar cuerpo', () => {
    const sesion = TestBed.inject(SesionStore);
    sesion.establecer(accesoPrueba, sesion.epoca);
    guardar(nuevoDescriptor(), accesoPrueba.usuario.id);
    window.dispatchEvent(
      new StorageEvent('storage', { key: nombre(clave, accesoPrueba.usuario.id) }),
    );
    http.expectOne(`/api/operaciones-idempotentes/${clave}`).flush(completada);
    expect(localStorage.length).toBe(0);
    expect(servicio.operaciones()[0].estado).toBe('COMPLETADA');
  });
  it('separa cuentas; volver a la original recupera el mismo descriptor', () => {
    const sesion = TestBed.inject(SesionStore);
    guardar(nuevoDescriptor(), accesoPrueba.usuario.id);
    sesion.establecer(
      { ...accesoPrueba, usuario: { ...accesoPrueba.usuario, id: recursoId } },
      sesion.epoca,
    );
    servicio.cambiarUsuario(recursoId);
    http.expectNone(`/api/operaciones-idempotentes/${clave}`);
    sesion.establecer(accesoPrueba, sesion.epoca);
    servicio.cambiarUsuario(accesoPrueba.usuario.id);
    http.expectOne(`/api/operaciones-idempotentes/${clave}`).flush(completada);
    expect(localStorage.length).toBe(0);
  });
  it('una respuesta de recuperación tardía no se muestra tras perder sesión', () => {
    const descriptor = guardar();
    servicio.recuperar(descriptor);
    const peticion = http.expectOne(`/api/operaciones-idempotentes/${clave}`);
    TestBed.inject(SesionStore).limpiar();
    servicio.cambiarUsuario(null);
    peticion.flush(completada);
    expect(localStorage.length).toBe(1);
    expect(servicio.operaciones().some((vista) => vista.estado === 'COMPLETADA')).toBe(false);
  });
  it('almacenamiento indisponible impide enviar y explica el bloqueo', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Bloqueado', 'SecurityError');
    });
    const error = vi.fn();
    enviar().subscribe({ error });
    expect(error).toHaveBeenCalledOnce();
    http.expectNone('/api/prueba');
    expect(servicio.problema()).toContain('almacenamiento');
  });
  it('sin coordinación no inicia POST pero permite GET de recuperación', () => {
    vi.spyOn(plataformaOperacionesPrueba, 'coordinar').mockReturnValue(
      throwError(() => new Error('COORDINACION_NO_DISPONIBLE')),
    );
    const descriptor = guardar();
    enviar().subscribe({ error: () => undefined });
    http.expectNone('/api/prueba');
    servicio.recuperar(descriptor);
    http.expectOne(`/api/operaciones-idempotentes/${clave}`).flush(completada);
    expect(servicio.operaciones()[0].estado).toBe('COMPLETADA');
  });
  it('la intención conserva UUID reclamado y resultado tras limpieza y sustitución de tarjeta; una intención nueva es independiente', () => {
    const original = guardar();
    const intencion = signal<DescriptorOperacion | undefined>(undefined);
    const enviarIntencion = () =>
      servicio.ejecutar(
        'CREAR_BORRADOR',
        undefined,
        (valor) =>
          TestBed.inject(HttpClient).post(
            '/api/prueba',
            { asunto: 'Ficticio' },
            { headers: { 'Idempotency-Key': valor } },
          ),
        clave2,
        undefined,
        intencion,
      );
    enviarIntencion().subscribe({ error: () => undefined });
    const post = http.expectOne('/api/prueba');
    expect(post.request.headers.get('Idempotency-Key')).toBe(clave);
    expect(intencion()).toEqual(original);
    post.error(new ProgressEvent('error'));
    servicio.recuperar(original);
    http.expectOne(`/api/operaciones-idempotentes/${clave}`).flush(completada);
    expect(localStorage.length).toBe(0);
    enviar().subscribe();
    const otro = http.expectOne('/api/prueba');
    expect(otro.request.headers.get('Idempotency-Key')).not.toBe(clave);
    otro.flush({ ...resultado, id: clave2 });
    expect(servicio.operaciones()).toHaveLength(1);
    expect(servicio.operaciones()[0].resultado?.id).toBe(clave2);
    const error = vi.fn();
    enviarIntencion().subscribe({ error });
    http.expectNone('/api/prueba');
    expect(error.mock.calls[0][0]).toMatchObject({
      status: 409,
      error: { error: 'OPERACION_YA_COMPLETADA', recursoId },
    });
    expect(servicio.resultadoConfirmado(intencion())).toEqual(resultado);
    expect(localStorage.length).toBe(0);
  });
  it('el formulario conserva la misma clave si otra pestaña elimina almacenamiento antes de confirmar', () => {
    const intencion = signal<DescriptorOperacion | undefined>(undefined);
    const ejecutar = () =>
      servicio.ejecutar(
        'CREAR_BORRADOR',
        undefined,
        (valor) =>
          TestBed.inject(HttpClient).post(
            '/api/prueba',
            {},
            { headers: { 'Idempotency-Key': valor } },
          ),
        undefined,
        undefined,
        intencion,
      );
    ejecutar().subscribe({ error: () => undefined });
    const primera = http.expectOne('/api/prueba');
    const descriptor = intencion()!;
    primera.error(new ProgressEvent('error'));
    localStorage.removeItem(nombre(descriptor.clave));
    servicio.recuperar(descriptor);
    http
      .expectOne(`/api/operaciones-idempotentes/${descriptor.clave}`)
      .flush({ error: 'OPERACION_NO_ENCONTRADA' }, { status: 404, statusText: 'Not Found' });
    ejecutar().subscribe();
    const repetida = http.expectOne('/api/prueba');
    expect(repetida.request.headers.get('Idempotency-Key')).toBe(descriptor.clave);
    expect(datos()).toEqual(descriptor);
    repetida.flush(resultado);
  });
  it('nuevo intento tras éxito confirmado recibe una clave distinta', () => {
    enviar().subscribe();
    const primera = http.expectOne('/api/prueba');
    const anterior = primera.request.headers.get('Idempotency-Key');
    primera.flush(resultado);
    enviar().subscribe();
    const segunda = http.expectOne('/api/prueba');
    expect(segunda.request.headers.get('Idempotency-Key')).not.toBe(anterior);
    segunda.flush({ ...resultado, id: clave2 });
  });
  it('panel accesible consulta pendiente y enlaza resultado; nunca muestra la clave', async () => {
    const sesion = TestBed.inject(SesionStore);
    sesion.establecer(accesoPrueba, sesion.epoca);
    guardar(nuevoDescriptor(), accesoPrueba.usuario.id);
    const vista = TestBed.createComponent(OperacionesPanel);
    vista.detectChanges();
    http
      .expectOne(`/api/operaciones-idempotentes/${clave}`)
      .flush({ estado: 'EN_PROGRESO', operacion: 'CREAR_BORRADOR' });
    await vista.whenStable();
    const html = vista.nativeElement as HTMLElement;
    expect(html.querySelector('[role=status]')?.textContent).toContain('pendiente');
    expect(html.textContent).not.toContain(clave);
    html.querySelector('button')!.click();
    http.expectOne(`/api/operaciones-idempotentes/${clave}`).flush(completada);
    await vista.whenStable();
    expect(html.querySelector('a')?.getAttribute('href')).toBe(`/solicitudes/${recursoId}`);
    expect(document.activeElement).toBe(html.querySelector('a'));
    expect(html.querySelector('[role=status]')?.textContent).toContain('completada');
  });
});

describe('CI-07: ámbito criptográfico nativo', () => {
  it('SHA256 produce ámbito opaco determinista y distinto por usuario', async () => {
    TestBed.configureTestingModule({});
    const plataforma = TestBed.inject(PLATAFORMA_OPERACIONES);
    const original = await firstValueFrom(plataforma.ambito(recursoId));
    expect(original).toMatch(/^[0-9a-f]{64}$/);
    expect(original).not.toContain(recursoId);
    expect(await firstValueFrom(plataforma.ambito(recursoId))).toBe(original);
    expect(await firstValueFrom(plataforma.ambito(clave2))).not.toBe(original);
    await expect(firstValueFrom(plataforma.ambito(null))).rejects.toThrow('SESION_NO_DISPONIBLE');
  });
});
