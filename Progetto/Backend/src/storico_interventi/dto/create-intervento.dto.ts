// src/storico_interventi/dto/create-intervento.dto.ts

import {
  IsEnum,
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
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
  id_veicolo!: number; // ← il ! dice a TS "fidati, arriva dal body"

  @IsDateString()
  data!: string;

  @IsEnum(CategoriaIntervento)
  categoria!: CategoriaIntervento;

  @IsString()
  nome!: string;

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
  nome?: string;

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
}
