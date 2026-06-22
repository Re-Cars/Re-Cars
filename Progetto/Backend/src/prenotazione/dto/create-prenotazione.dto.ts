import { IsNotEmpty, IsNumber, IsString, IsOptional, IsDateString } from 'class-validator';

export class CreatePrenotazioneDto {
  @IsNotEmpty()
  @IsNumber()
  officinaId: number;

  @IsNotEmpty()
  @IsString()
  servizio: string;

  @IsNotEmpty()
  @IsDateString()
  data: string; // Riceve 'YYYY-MM-DD' dal frontend

  @IsNotEmpty()
  @IsString()
  orario: string; // Riceve 'HH:MM' dal frontend

  @IsOptional()
  @IsString()
  note?: string;
}