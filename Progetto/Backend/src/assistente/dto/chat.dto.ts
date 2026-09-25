import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class TurnoDto {
  @IsIn(['utente', 'assistente'])
  ruolo!: 'utente' | 'assistente';

  @IsString()
  @MaxLength(1500)
  testo!: string;
}

export class ChatDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  messaggio!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => TurnoDto)
  storico?: TurnoDto[];

  /** Percorso della pagina da cui l'utente scrive (es. "/prenotazioni"). */
  @IsOptional()
  @IsString()
  @MaxLength(80)
  pagina?: string;
}
