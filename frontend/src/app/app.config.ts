import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptors, withXsrfConfiguration } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Autenticacion } from './identidad/autenticacion';
import { sesionInterceptor } from './identidad/sesion-interceptor';
import { routes } from './app.routes';
import { demoInterceptor } from './demo/demo-interceptor';
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(
      withInterceptors([demoInterceptor, sesionInterceptor]),
      withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' }),
    ),
    provideRouter(routes),
    provideAppInitializer(() => firstValueFrom(inject(Autenticacion).restaurar())),
  ],
};
