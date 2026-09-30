import {
  IsString,
  IsEmail,
  IsOptional,
  MinLength,
  IsNotEmpty,
  IsEnum,
  Matches,
} from 'class-validator';
import { tipo_utente } from '@prisma/client';

export class CreateUtenteDto {
  /** Codice di 6 cifre mandato da POST /auth/verifica-email. */
  @IsOptional()
  @Matches(/^\d{6}$/, { message: 'Il codice di verifica ha 6 cifre' })
  codice?: string;

  @IsNotEmpty({ message: 'Il nome utente è obbligatorio' })
  @IsString()
  username!: string;

  @IsNotEmpty({ message: 'La password è obbligatoria' })
  @MinLength(8, { message: 'La password deve avere almeno 8 caratteri' })
  @IsString()
  password!: string;

  @IsNotEmpty({ message: "L'email è obbligatoria" })
  @IsEmail({}, { message: 'Email non valida' })
  email!: string;

  @IsOptional()
  @IsString()
  cellulare?: string;

  @IsOptional()
  @IsEnum(tipo_utente)
  tipo?: tipo_utente;

  @IsOptional()
  @IsString()
  ragione_sociale?: string;

  @IsOptional()
  @IsString()
  partita_iva?: string;

  @IsOptional()
  @IsString()
  codice_sdi?: string;
}
