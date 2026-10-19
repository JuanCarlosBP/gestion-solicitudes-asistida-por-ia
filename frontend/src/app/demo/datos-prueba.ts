import { ReservaDemo } from './demo-modelo';

export const reservaPrueba = (): ReservaDemo => ({
  reservaId: '00000000-0000-4000-8000-000000000801',
  espacio: 'espacio-01',
  generacion: '00000000-0000-4000-8000-000000000802',
  expiraEn: new Date(Date.now() + 3600000).toISOString(),
});

export const otraReserva = (): ReservaDemo => ({
  ...reservaPrueba(),
  reservaId: '00000000-0000-4000-8000-000000000803',
  generacion: '00000000-0000-4000-8000-000000000804',
});
