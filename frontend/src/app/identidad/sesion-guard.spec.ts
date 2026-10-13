import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { Observable } from 'rxjs';
import { sesionGuard } from './sesion-guard';
import { accesoPrueba } from './datos-prueba';

describe('Guard funcional', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it.each([true, false])('espera restauración y decide acceso autenticado=%s', (exito) => {
    let resultado: boolean | UrlTree | undefined;
    const decision = TestBed.runInInjectionContext(() =>
      sesionGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    ) as Observable<boolean | UrlTree>;
    decision.subscribe((valor) => (resultado = valor));
    expect(resultado).toBeUndefined();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/autenticacion/csrf').flush(null);
    const renovacion = http.expectOne('/api/autenticacion/renovar');
    if (exito) renovacion.flush(accesoPrueba);
    else renovacion.flush({}, { status: 401, statusText: 'Unauthorized' });
    if (exito) expect(resultado).toBe(true);
    else expect(resultado?.toString()).toBe('/acceso');
  });
});
