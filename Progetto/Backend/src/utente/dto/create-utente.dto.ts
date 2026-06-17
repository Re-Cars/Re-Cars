import { IsString, IsEmail, IsOptional, MinLength, IsNotEmpty, IsEnum } from 'class-validator';
import { tipo_utente } from '@prisma/client';

export class CreateUtenteDto {

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