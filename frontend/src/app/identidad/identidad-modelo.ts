export type Rol = 'SOLICITANTE' | 'SUPERVISOR' | 'AUDITOR' | 'ADMINISTRADOR';

export interface UsuarioPublico {
  id: string;
  correo: string;
  nombreVisible: string;
  roles: Rol[];
}

export interface Acceso {
  accessToken: string;
  tipoToken: 'Bearer';
  expiraEn: number;
  usuario: UsuarioPublico;
}
