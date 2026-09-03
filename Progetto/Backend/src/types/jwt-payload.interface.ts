export interface JwtPayload {
  sub: number;
  email?: string;
  tipo: 'utente' | 'officina';
  partita_iva?: string;
}
