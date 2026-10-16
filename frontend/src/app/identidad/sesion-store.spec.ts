import { SesionStore } from './sesion-store';
import { accesoPrueba, usuarioPrueba } from './datos-prueba';

describe('Sesión en memoria', () => {
  it('parte anónima, publica usuario y elimina el acceso al limpiar', () => {
    const sesion = new SesionStore();
    expect(sesion.autenticado()).toBe(false);
    expect(sesion.token === null).toBe(true);
    sesion.establecer(accesoPrueba, sesion.epoca);
    expect(sesion.usuario()).toEqual(usuarioPrueba);
    expect(sesion.autenticado()).toBe(true);
    sesion.limpiar();
    expect(sesion.usuario()).toBeNull();
    expect(sesion.token === null).toBe(true);
  });

  it('rechaza respuestas de una época anterior sin persistir tokens', () => {
    const local = vi.spyOn(Storage.prototype, 'setItem');
    const sesion = new SesionStore();
    const epoca = sesion.epoca;
    sesion.limpiar();
    expect(sesion.establecer(accesoPrueba, epoca)).toBe(false);
    expect(sesion.autenticado()).toBe(false);
    expect(local).not.toHaveBeenCalled();
    local.mockRestore();
  });
});
