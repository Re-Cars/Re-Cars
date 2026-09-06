import {
  IsEnum,
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum CategoriaIntervento {
  ordinario = 'ordinario',
  straordinario = 'straordinario',
  gestione = 'gestione',
  annotazioni = 'annotazioni',
}

export class CreateInterventoDto {
  @IsNumber()
  @Type(() => Number)
  id_veicolo!: number; // OBBLIGATORIO

  @IsDateString()
  data!: string; // OBBLIGATORIO

  @IsEnum(CategoriaIntervento)
  categoria!: CategoriaIntervento; // OBBLIGATORIO

  @IsString()
  tipo!: string; // OBBLIGATORIO 

  @IsOptional()
  @IsString()
  descrizione?: string;

  @IsOptional()
  @IsString()
  mediante?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  costo?: number;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  sigla_citta?: string; //  opzionale
}

export class UpdateInterventoDto {
  @IsOptional()
  @IsDateString()
  data?: string;

  @IsOptional()
  @IsEnum(CategoriaIntervento)
  categoria?: CategoriaIntervento;

  @IsOptional()
  @IsString()
  tipo?: string; // 

  @IsOptional()
  @IsString()
  descrizione?: string;

  @IsOptional()
  @IsString()
  mediante?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  costo?: number;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  sigla_citta?: string; // NUOVO
}