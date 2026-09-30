import { IsEmail, IsIn, IsOptional } from 'class-validator';

export class RichiestaCodiceDto {
  @IsEmail({}, { message: 'Scrivi un indirizzo email valido.' })
  email!: string;

  /** Tabella in cui l'email non deve esistere già. */
  @IsOptional()
  @IsIn(['utente', 'officina'])
  per?: 'utente' | 'officina';
}
