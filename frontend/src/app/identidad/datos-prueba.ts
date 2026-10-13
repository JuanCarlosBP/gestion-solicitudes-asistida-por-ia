import { Acceso, UsuarioPublico } from './identidad-modelo';

// Datos ficticios, nunca credenciales utilizables contra el backend.
export const usuarioPrueba: UsuarioPublico = {
  id: '00000000-0000-4000-8000-000000000001',
  correo: 'persona@demo.invalid',
  nombreVisible: 'Persona de prueba',
  roles: ['SOLICITANTE', 'AUDITOR'],
};
export const accesoPrueba: Acceso = {
  accessToken: 'valor-ficticio-sin-firma',
  tipoToken: 'Bearer',
  expiraEn: 600,
  usuario: usuarioPrueba,
};
