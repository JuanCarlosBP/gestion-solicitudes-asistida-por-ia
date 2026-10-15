import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { HistorialApi } from '../historial/historial-api';
import { historialVacioPrueba } from '../historial/datos-prueba';
import { prepararOperacionesPrueba } from '../operaciones/datos-prueba';

beforeEach(prepararOperacionesPrueba);
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { routes } from '../app.routes';
import { Autenticacion } from '../identidad/autenticacion';
import { accesoPrueba } from '../identidad/datos-prueba';
import { Rol } from '../identidad/identidad-modelo';
import { SesionStore } from '../identidad/sesion-store';
import { paginaPrueba, solicitudPrueba, supervisorPrueba } from './datos-prueba';
import {
  normalizarTextoDecision,
  SolicitudDecision,
  validarTextoDecision,
} from './solicitud-decision';
import { DetalleSolicitud, TipoDecision } from './solicitud-modelo';
import { SolicitudesApi } from './solicitudes-api';
import { SolicitudesLista } from './solicitudes-lista';
import { PermisosSolicitudes } from './solicitudes-permisos';

const presentada: DetalleSolicitud = {
  ...solicitudPrueba,
  estado: 'PRESENTADA',
  version: 4,
  presentadoEn: '2026-10-15T00:00:00Z',
  proveedor: { ...solicitudPrueba.proveedor!, activo: null },
};
const fecha = '2026-10-15T00:10:00Z';
const url = `/api/solicitudes/${solicitudPrueba.id}`;
const clave = '00000000-0000-4000-8000-000000000501';
function decidida(tipo: TipoDecision): DetalleSolicitud {
  return {
    ...presentada,
    estado: tipo === 'APROBAR' ? 'APROBADA' : 'RECHAZADA',
    version: 5,
    actualizadoEn: fecha,
    decididoEn: fecha,
    decision: {
      tipo,
      actor: supervisorPrueba,
      comentario: tipo === 'APROBAR' ? 'Comentario ficticio' : null,
      motivo: tipo === 'RECHAZAR' ? 'Motivo ficticio de rechazo.' : null,
      decididoEn: fecha,
    },
  };
}
function resultado(tipo: TipoDecision) {
  const { id, numero, estado, version, actualizadoEn, decididoEn } = decidida(tipo);
  return { id, numero, estado, version, actualizadoEn, decididoEn };
}

describe('AP-02: textos de decisión', () => {
  it.each(['', '   ', 'Comentario ficticio', '😀'.repeat(500)])(
    'aprobación admite comentario opcional y límite Unicode %s',
    (texto) => expect(validarTextoDecision('APROBAR', texto)).toBe(''),
  );
  it.each(['a'.repeat(501), '😀'.repeat(501), '\ud800', 'Texto\u0000invalido'])(
    'rechaza comentario fuera de contrato',
    (texto) => expect(validarTextoDecision('APROBAR', texto)).not.toBe(''),
  );
  it.each(['1234567890', ' a'.repeat(500).trim(), '😀'.repeat(1000)])(
    'rechazo admite motivo dentro del límite por puntos de código',
    (texto) => expect(validarTextoDecision('RECHAZAR', texto)).toBe(''),
  );
  it.each([
    '',
    '123456789',
    ` ${'a'.repeat(9)} `,
    'a'.repeat(1001),
    '😀'.repeat(1001),
    'Motivo\udfff',
  ])('rechaza motivo ausente, corto, largo o Unicode incompleto', (texto) =>
    expect(validarTextoDecision('RECHAZAR', texto)).not.toBe(''),
  );
  it.each(['\u0085', '\u00a0', '\u001c', '\u001f', '\u2007', '\u202f', '\u3000'])(
    'normaliza espacio Unicode %s igual que el servidor',
    (espacio) => {
      expect(normalizarTextoDecision(`${espacio}Motivo ficticio${espacio}`)).toBe(
        'Motivo ficticio',
      );
      expect(validarTextoDecision('RECHAZAR', `${espacio}123456789${espacio}`)).not.toBe('');
      expect(validarTextoDecision('RECHAZAR', `${espacio}${'a'.repeat(1000)}${espacio}`)).toBe('');
      expect(validarTextoDecision('RECHAZAR', `${espacio}${'a'.repeat(1001)}${espacio}`)).not.toBe(
        '',
      );
      expect(validarTextoDecision('APROBAR', `${espacio}${'a'.repeat(500)}${espacio}`)).toBe('');
    },
  );
  it('conserva BOM como carácter y espacios interiores conforme al servidor', () => {
    expect(normalizarTextoDecision('\ufeffTexto \u0085 interior\ufeff')).toBe(
      '\ufeffTexto \u0085 interior\ufeff',
    );
  });
});

describe('AP-01–08: contrato, bandeja y decisiones Angular', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(routes),
        { provide: HistorialApi, useValue: historialVacioPrueba },
        {
          provide: Autenticacion,
          useValue: { restaurar: () => of(undefined), identidad: () => of(accesoPrueba.usuario) },
        },
      ],
    });
    actor(['SUPERVISOR']);
  });
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  function actor(roles: Rol[], id = supervisorPrueba.id) {
    const sesion = TestBed.inject(SesionStore);
    sesion.establecer(
      { ...accesoPrueba, usuario: { ...accesoPrueba.usuario, id, roles } },
      sesion.epoca,
    );
  }
  function http() {
    return TestBed.inject(HttpTestingController);
  }
  function listado() {
    return http().expectOne((p) => p.url === '/api/solicitudes');
  }
  async function estable(vista: RouterTestingHarness) {
    vista.detectChanges();
    await vista.fixture.whenStable();
  }
  function texto(vista: RouterTestingHarness) {
    return vista.routeNativeElement!.textContent!;
  }
  async function detalle(actual = presentada) {
    const vista = await RouterTestingHarness.create(`/solicitudes/${actual.id}`);
    http().expectOne(url).flush(actual);
    await estable(vista);
    return vista;
  }
  function formulario(vista: RouterTestingHarness) {
    return vista.routeDebugElement!.query(By.directive(SolicitudDecision))
      .componentInstance as SolicitudDecision;
  }
  async function preparar(
    vista: RouterTestingHarness,
    tipo: TipoDecision,
    texto = 'Decisión ficticia para pruebas',
  ) {
    const componente = formulario(vista);
    componente.elegir(tipo);
    await estable(vista);
    componente.cambiarTexto(texto);
    componente.revisar(new Event('submit'));
    await estable(vista);
    return componente;
  }

  it.each(['APROBAR', 'RECHAZAR'] as const)(
    'servicio %s envía DTO cerrado y clave separada',
    (tipo) => {
      const api = TestBed.inject(SolicitudesApi);
      (tipo === 'APROBAR'
        ? api.aprobar(presentada.id, 4, null, clave)
        : api.rechazar(presentada.id, 4, 'Motivo ficticio', clave)
      ).subscribe();
      const peticion = http().expectOne(`${url}/${tipo === 'APROBAR' ? 'aprobar' : 'rechazar'}`);
      expect(peticion.request.body).toEqual(
        tipo === 'APROBAR'
          ? { version: 4, comentario: null }
          : { version: 4, motivo: 'Motivo ficticio' },
      );
      expect(peticion.request.headers.get('Idempotency-Key')).toBe(clave);
      peticion.flush(resultado(tipo));
    },
  );
  it.each([
    [['SUPERVISOR'], supervisorPrueba.id, true],
    [['ADMINISTRADOR'], supervisorPrueba.id, false],
    [['SOLICITANTE'], supervisorPrueba.id, false],
    [['AUDITOR'], supervisorPrueba.id, false],
    [['SUPERVISOR', 'ADMINISTRADOR'], supervisorPrueba.id, true],
    [['SUPERVISOR', 'AUDITOR', 'SOLICITANTE'], supervisorPrueba.id, true],
    [['SUPERVISOR'], solicitudPrueba.autor.id, false],
    [['SUPERVISOR', 'ADMINISTRADOR', 'SOLICITANTE'], solicitudPrueba.autor.id, false],
    [['SUPERVISOR'], '00000000-0000-4000-8000-000000000099', false],
  ] as [Rol[], string, boolean][])('actor %s/%s decide=%s', (roles, id, permitido) => {
    actor(roles, id);
    const permisos = TestBed.inject(PermisosSolicitudes);
    expect(permisos.decidir(presentada)).toBe(permitido);
    expect(permisos.decidir(solicitudPrueba)).toBe(false);
    expect(permisos.decidir(decidida('APROBAR'))).toBe(false);
    expect(permisos.decidir(decidida('RECHAZAR'))).toBe(false);
  });
  it('ni un supervisor asignado a su propia solicitud puede decidir', () => {
    actor(['SUPERVISOR', 'SOLICITANTE', 'ADMINISTRADOR'], solicitudPrueba.autor.id);
    expect(
      TestBed.inject(PermisosSolicitudes).decidir({
        ...presentada,
        supervisorId: solicitudPrueba.autor.id,
      }),
    ).toBe(false);
  });
  it.each(['SOLICITANTE', 'AUDITOR', 'ADMINISTRADOR'] as Rol[])(
    'bandeja denegada a %s',
    async (rol) => {
      actor([rol]);
      const vista = await RouterTestingHarness.create('/aprobaciones');
      listado().flush(paginaPrueba([]));
      await estable(vista);
      expect(TestBed.inject(Router).url).toBe('/solicitudes');
    },
  );
  it('bandeja sin sesión lleva a acceso', async () => {
    TestBed.inject(SesionStore).limpiar();
    await RouterTestingHarness.create('/aprobaciones');
    expect(TestBed.inject(Router).url).toBe('/acceso');
    http().expectNone((p) => p.url === '/api/solicitudes');
  });
  it.each([['SUPERVISOR'], ['SUPERVISOR', 'ADMINISTRADOR', 'AUDITOR', 'SOLICITANTE']] as Rol[][])(
    'bandeja fuerza asignado/PRESENTADA incluso con roles %s y URL alterada',
    async (...roles: Rol[]) => {
      actor(roles);
      const vista = await RouterTestingHarness.create(
        `/aprobaciones?estado=APROBADA&supervisor=${solicitudPrueba.autor.id}&asunto=Filtro`,
      );
      const peticion = listado();
      expect(peticion.request.params.get('estado')).toBe('PRESENTADA');
      expect(peticion.request.params.get('supervisor')).toBe(supervisorPrueba.id);
      expect(peticion.request.params.get('asunto')).toBe('Filtro');
      peticion.flush(paginaPrueba([presentada]));
      await estable(vista);
      expect(texto(vista)).toContain('Aprobaciones');
      expect(vista.routeNativeElement!.querySelector('#estado')).toBeNull();
      expect(vista.routeNativeElement!.querySelector('#supervisor-filtro')).toBeNull();
      expect(texto(vista)).not.toContain('Nueva solicitud');
      (vista.routeDebugElement!.componentInstance as SolicitudesLista).restablecer();
      await estable(vista);
      const restaurada = listado();
      expect(restaurada.request.params.get('supervisor')).toBe(supervisorPrueba.id);
      expect(restaurada.request.params.get('estado')).toBe('PRESENTADA');
      restaurada.flush(paginaPrueba([]));
      await estable(vista);
    },
  );
  it('bandeja pagina manteniendo supervisor y estado forzados', async () => {
    const vista = await RouterTestingHarness.create('/aprobaciones?size=1');
    listado().flush({ ...paginaPrueba([presentada]), totalPaginas: 2, totalElementos: 2 });
    await estable(vista);
    (vista.routeDebugElement!.componentInstance as SolicitudesLista).cambiarPagina(1);
    await estable(vista);
    const siguiente = listado();
    expect(siguiente.request.params.get('page')).toBe('1');
    expect(siguiente.request.params.get('estado')).toBe('PRESENTADA');
    expect(siguiente.request.params.get('supervisor')).toBe(supervisorPrueba.id);
    siguiente.flush({ ...paginaPrueba([presentada]), pagina: 1, totalPaginas: 2 });
    await estable(vista);
  });
  it.each(['APROBADA', 'RECHAZADA'])(
    'listado general filtra y representa estado final %s',
    async (estado) => {
      const vista = await RouterTestingHarness.create(`/solicitudes?estado=${estado}`);
      const peticion = listado();
      expect(peticion.request.params.get('estado')).toBe(estado);
      peticion.flush(paginaPrueba([decidida(estado === 'APROBADA' ? 'APROBAR' : 'RECHAZAR')]));
      await estable(vista);
      expect(texto(vista)).toContain(estado === 'APROBADA' ? 'Aprobada' : 'Rechazada');
    },
  );
  it.each(['SOLICITANTE', 'AUDITOR', 'ADMINISTRADOR'] as Rol[])(
    '%s ve lectura de presentada, sin acciones de decisión',
    async (rol) => {
      actor([rol]);
      const vista = await detalle();
      expect(vista.routeNativeElement!.querySelector('app-solicitud-decision')).toBeNull();
    },
  );
  it.each(['APROBAR', 'RECHAZAR'] as const)(
    'detalle final muestra actor/fecha/texto %s y no permite otra decisión',
    async (tipo) => {
      const actual = decidida(tipo);
      const vista = await detalle(actual);
      expect(texto(vista)).toContain(supervisorPrueba.nombreVisible);
      expect(texto(vista)).toContain(
        tipo === 'APROBAR' ? 'Comentario ficticio' : 'Motivo ficticio de rechazo.',
      );
      expect(texto(vista)).toContain('Datos del proveedor conservados');
      expect(vista.routeNativeElement!.querySelector('app-solicitud-decision')).toBeNull();
      expect(texto(vista)).not.toContain('Editar borrador');
    },
  );
  it('texto de decisión se interpola sin interpretar HTML', async () => {
    const actual = decidida('RECHAZAR');
    actual.decision!.motivo = '<img src=x onerror=alert(1)> motivo ficticio';
    const vista = await detalle(actual);
    expect(texto(vista)).toContain('<img src=x');
    expect(vista.routeNativeElement!.querySelector('img')).toBeNull();
  });
  it.each(['APROBAR', 'RECHAZAR'] as const)(
    'decisión %s valida, confirma, evita doble envío y recupera detalle',
    async (tipo) => {
      const vista = await detalle();
      const componente = await preparar(vista, tipo);
      expect(componente.confirmar()).toBe(true);
      expect(vista.routeNativeElement!.querySelector('textarea')?.readOnly).toBe(true);
      componente.volver();
      expect(componente.confirmar()).toBe(false);
      componente.revisar(new Event('submit'));
      componente.decidir();
      componente.decidir();
      const peticion = http().expectOne(`${url}/${tipo === 'APROBAR' ? 'aprobar' : 'rechazar'}`);
      expect(peticion.request.body.version).toBe(4);
      expect(peticion.request.headers.get('Idempotency-Key')).toMatch(/^[0-9a-f-]{36}$/);
      peticion.flush(resultado(tipo));
      http().expectOne(url).flush(decidida(tipo));
      await estable(vista);
      expect(texto(vista)).toContain(
        tipo === 'APROBAR' ? 'Solicitud aprobada.' : 'Solicitud rechazada.',
      );
      expect(vista.routeNativeElement!.querySelector('app-solicitud-decision')).toBeNull();
    },
  );
  it('no decide sin pasar por la confirmación', async () => {
    const vista = await detalle();
    const componente = formulario(vista);
    componente.elegir('APROBAR');
    componente.decidir();
    http().expectNone(`${url}/aprobar`);
  });
  it('rechazo inválido mantiene texto, etiqueta y error asociado sin HTTP', async () => {
    const vista = await detalle();
    const componente = await preparar(vista, 'RECHAZAR', 'Corto');
    expect(componente.confirmar()).toBe(false);
    expect(componente.texto()).toBe('Corto');
    expect(vista.routeNativeElement!.querySelector('label[for="texto-decision"]')).not.toBeNull();
    expect(vista.routeNativeElement!.querySelector('textarea')?.getAttribute('aria-invalid')).toBe(
      'true',
    );
    http().expectNone(`${url}/rechazar`);
  });
  it('aprobación vacía envía comentario null', async () => {
    const vista = await detalle();
    const componente = await preparar(vista, 'APROBAR', '  ');
    componente.decidir();
    const peticion = http().expectOne(`${url}/aprobar`);
    expect(peticion.request.body.comentario).toBeNull();
    peticion.flush(resultado('APROBAR'));
    http().expectOne(url).flush(decidida('APROBAR'));
    await estable(vista);
  });
  it('confirmación y petición usan el mismo texto normalizado Unicode', async () => {
    const vista = await detalle();
    const componente = await preparar(vista, 'RECHAZAR', '\u0085\u001cMotivo ficticio\u202f');
    expect(vista.routeNativeElement!.querySelector('blockquote')?.textContent).toBe(
      'Motivo ficticio',
    );
    componente.decidir();
    const peticion = http().expectOne(`${url}/rechazar`);
    expect(peticion.request.body).toEqual({ version: 4, motivo: 'Motivo ficticio' });
    peticion.flush(resultado('RECHAZAR'));
    http().expectOne(url).flush(decidida('RECHAZAR'));
    await estable(vista);
  });
  it.each([0, 500, 503])(
    'fallo incierto %s reenvía misma clave y cuerpo sin aceptar cambios',
    async (status) => {
      const vista = await detalle();
      const componente = await preparar(
        vista,
        'RECHAZAR',
        ' \u0085\u001cMotivo original ficticio\u202f ',
      );
      componente.decidir();
      const original = http().expectOne(`${url}/rechazar`);
      const originalClave = original.request.headers.get('Idempotency-Key');
      const originalCuerpo = original.request.body;
      expect(originalCuerpo).toEqual({ version: 4, motivo: 'Motivo original ficticio' });
      if (status === 0) original.error(new ProgressEvent('error'));
      else original.flush({}, { status, statusText: 'Error' });
      await estable(vista);
      componente.cambiarTexto('Texto incompatible');
      componente.elegir('APROBAR');
      expect(componente.tipo()).toBe('RECHAZAR');
      expect(componente.texto()).toContain('Motivo original');
      componente.decidir();
      const repetida = http().expectOne(`${url}/rechazar`);
      expect(repetida.request.headers.get('Idempotency-Key')).toBe(originalClave);
      expect(repetida.request.body).toEqual(originalCuerpo);
      repetida.flush(resultado('RECHAZAR'));
      http().expectOne(url).flush(decidida('RECHAZAR'));
      await estable(vista);
    },
  );
  it('GET tras incertidumbre aún PRESENTADA no genera clave nueva silenciosamente', async () => {
    const vista = await detalle();
    const componente = await preparar(vista, 'APROBAR');
    componente.decidir();
    const original = http().expectOne(`${url}/aprobar`);
    const claveOriginal = original.request.headers.get('Idempotency-Key');
    original.flush({}, { status: 503, statusText: 'Error' });
    await estable(vista);
    componente.recargar();
    http().expectOne(url).flush(presentada);
    await estable(vista);
    expect(componente.incierta()).toBe(true);
    componente.decidir();
    const repetida = http().expectOne(`${url}/aprobar`);
    expect(repetida.request.headers.get('Idempotency-Key')).toBe(claveOriginal);
    repetida.flush(resultado('APROBAR'));
    http().expectOne(url).flush(decidida('APROBAR'));
    await estable(vista);
  });
  it('decisión confirmada con GET fallido bloquea nuevas escrituras hasta recuperar', async () => {
    const vista = await detalle();
    const componente = await preparar(vista, 'APROBAR');
    componente.decidir();
    http().expectOne(`${url}/aprobar`).flush(resultado('APROBAR'));
    http().expectOne(url).flush({}, { status: 503, statusText: 'Error' });
    await estable(vista);
    expect(componente.confirmada()).toBe(true);
    expect(texto(vista)).toContain('decisión se ha registrado');
    componente.elegir('RECHAZAR');
    componente.decidir();
    http().expectNone(`${url}/rechazar`);
    http().expectNone(`${url}/aprobar`);
    componente.recargar();
    http().expectOne(url).flush(decidida('APROBAR'));
    await estable(vista);
    expect(texto(vista)).toContain('Solicitud aprobada.');
  });
  it.each(['VERSION_OBSOLETA', 'SOLICITUD_NO_DECIDIBLE', 'CLAVE_IDEMPOTENCIA_REUTILIZADA'])(
    'conflicto %s conserva texto y exige recargar',
    async (codigo) => {
      const vista = await detalle();
      const componente = await preparar(vista, 'RECHAZAR');
      componente.decidir();
      http()
        .expectOne(`${url}/rechazar`)
        .flush({ error: codigo }, { status: 409, statusText: 'Conflict' });
      await estable(vista);
      expect(componente.conflicto()).toBe(true);
      expect(componente.texto()).toContain('ficticia');
      componente.decidir();
      http().expectNone(`${url}/rechazar`);
      componente.recargar();
      http().expectOne(url).flush(decidida('APROBAR'));
      await estable(vista);
      expect(texto(vista)).toContain('Solicitud aprobada.');
    },
  );
  it('409 de versión recupera PRESENTADA actual y permite nueva revisión explícita', async () => {
    const vista = await detalle();
    const componente = await preparar(vista, 'APROBAR');
    componente.decidir();
    http()
      .expectOne(`${url}/aprobar`)
      .flush({ error: 'VERSION_OBSOLETA' }, { status: 409, statusText: 'Conflict' });
    await estable(vista);
    componente.recargar();
    http()
      .expectOne(url)
      .flush({ ...presentada, version: 5 });
    await estable(vista);
    expect(componente.confirmar()).toBe(false);
    expect(componente.conflicto()).toBe(false);
    componente.revisar(new Event('submit'));
    componente.decidir();
    const nueva = http().expectOne(`${url}/aprobar`);
    expect(nueva.request.body.version).toBe(5);
    nueva.flush(resultado('APROBAR'));
    http().expectOne(url).flush(decidida('APROBAR'));
    await estable(vista);
  });
  it.each([400, 401, 403, 404])(
    'rechazo definido HTTP%s conserva texto y no anuncia éxito',
    async (status) => {
      const vista = await detalle();
      const componente = await preparar(vista, 'APROBAR');
      componente.decidir();
      http()
        .expectOne(`${url}/aprobar`)
        .flush({ error: 'SECRETO_INTERNO' }, { status, statusText: 'Error' });
      await estable(vista);
      expect(componente.incierta()).toBe(false);
      expect(componente.confirmada()).toBe(false);
      expect(texto(vista)).not.toContain('SECRETO_INTERNO');
      expect(componente.texto()).toContain('ficticia');
    },
  );
});
