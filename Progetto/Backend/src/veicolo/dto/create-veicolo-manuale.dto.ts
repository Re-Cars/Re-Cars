import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { OmitType, PartialType } from '@nestjs/mapped-types';
import { tipo_veicolo } from '@prisma/client';

export const ALIMENTAZIONI = [
  'Benzina',
  'Diesel',
  'GPL',
  'Metano',
  'Ibrida',
  'Elettrica',
] as const;

const maiuscoloSenzaSpazi = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.replace(/\s+/g, '').toUpperCase() : value;
const pulito = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/**
 * Veicolo inserito a mano dall'utente (dati letti dal libretto): stessi
 * campi che POST /veicolo ricava dal dataset di prova. Tra parentesi il
 * codice della riga sul libretto.
 */
export class CreateVeicoloManualeDto {
  /** (A) auto AA123BB, moto AA12345 */
  @Transform(maiuscoloSenzaSpazi)
  @IsNotEmpty({ message: 'La targa è obbligatoria' })
  @Matches(/^([A-Z]{2}\d{3}[A-Z]{2}|[A-Z]{2}\d{5})$/, {
    message: 'Formato targa non valido (es. AA123BB, moto AA12345)',
  })
  targa!: string;

  @IsEnum(tipo_veicolo, { message: 'Tipo di veicolo non valido' })
  tipo_veicolo!: tipo_veicolo;

  /** (D.1) */
  @Transform(pulito)
  @IsString()
  @IsNotEmpty({ message: 'La marca è obbligatoria' })
  @MaxLength(30)
  marca!: string;

  /** (D.3) */
  @Transform(pulito)
  @IsString()
  @IsNotEmpty({ message: 'Il modello è obbligatorio' })
  @MaxLength(40)
  modello!: string;

  /** (B) data di prima immatricolazione: serve per la revisione */
  @IsDateString({}, { message: 'Data di prima immatricolazione non valida' })
  dataimmatricolazione!: string;

  /** (P.3) */
  @IsOptional()
  @IsIn(ALIMENTAZIONI, { message: 'Alimentazione non valida' })
  alimentazione?: (typeof ALIMENTAZIONI)[number];

  /** (P.1) in cc */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(99999)
  cilindrata?: number;

  /** (P.2) in kW: nel database si salvano i CV */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2000)
  potenza_kw?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(9)
  numporte?: number;

  @IsOptional()
  @Transform(pulito)
  @IsString()
  @MaxLength(50)
  nomeassicurazione?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Scadenza RCA non valida' })
  datascadenzarca?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Scadenza bollo non valida' })
  datascadenzabollo?: string;

  /**
   * Ultima revisione fatta (sul libretto: "revisione effettuata ... data"):
   * diventa il primo intervento "Revisione" dello storico.
   */
  @IsOptional()
  @IsDateString({}, { message: "Data dell'ultima revisione non valida" })
  ultimarevisione?: string;

  /** Ultimo tagliando fatto: primo intervento "Tagliando" dello storico. */
  @IsOptional()
  @IsDateString({}, { message: "Data dell'ultimo tagliando non valida" })
  ultimotagliando?: string;
}

/**
 * Modifica di un veicolo inserito a mano: stessi campi della creazione
 * tranne la targa (per cambiarla si elimina il veicolo) e le date di
 * revisione e tagliando, che dopo la creazione vivono nello storico. Un
 * campo facoltativo mandato come null viene svuotato.
 */
export class UpdateVeicoloManualeDto extends PartialType(
  OmitType(CreateVeicoloManualeDto, [
    'targa',
    'ultimarevisione',
    'ultimotagliando',
  ] as const),
) {}
