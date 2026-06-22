import { IsString, IsEmail, IsOptional, IsNotEmpty, MinLength, IsArray, IsEnum } from 'class-validator';
import { tipo_officina } from '@prisma/client';

export class CreateOfficinaDto {

  @IsNotEmpty({ message: "L'email è obbligatoria" })
  @IsEmail({}, { message: 'Email non valida' })
  email!: string;

  @IsNotEmpty({ message: 'La password è obbligatoria' })
  @MinLength(8, { message: 'La password deve avere almeno 8 caratteri' })
  @IsString()
  password!: string;

  @IsNotEmpty({ message: 'Il nome è obbligatorio' })
  @IsString()
  nome!: string;

  @IsNotEmpty({ message: 'La ragione sociale è obbligatoria' })
  @IsString()
  ragione_sociale!: string;

  @IsNotEmpty({ message: 'La partita IVA è obbligatoria' })
  @IsString()
  partita_iva!: string;

  @IsOptional()
  @IsString()
  codice_sdi?: string;

  @IsNotEmpty({ message: 'Il telefono è obbligatorio' })
  @IsString()
  telefono!: string;

  @IsNotEmpty({ message: "L'indirizzo è obbligatorio" })
  @IsString()
  indirizzo!: string;

  @IsNotEmpty({ message: 'La città è obbligatoria' })
  @IsString()
  sigla_citta!: string;

  @IsOptional()
  @IsArray()
  @IsEnum(tipo_officina, { each: true })
  tipi?: tipo_officina[];
}