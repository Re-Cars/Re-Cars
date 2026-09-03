export interface JwtPayload {
  sub: number;
  email?: string;
  tipo?: string;
  partita_iva?: string;
}
