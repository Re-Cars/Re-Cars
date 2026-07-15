import {
  IsString,
  IsInt,
  IsOptional,
  IsBoolean,
  IsNotEmpty,
  Matches,
  Length,
} from 'class-validator';

export class CreateVeicoloDto {
  @IsNotEmpty({ message: 'La targa è obbligatoria' })
  @IsString()
  @Length(7, 7, { message: 'La targa deve essere di 7 caratteri' })
  @Matches(/^[A-Z]{2}[0-9]{3}[A-Z]{2}$/, {
    message: 'Formato targa non valido (es. AA123BB)',
  })
  targa!: string;

  @IsNotEmpty({ message: "L'id utente è obbligatorio" })
  @IsInt({ message: "L'id utente deve essere un numero intero" })
  id_utente!: number;

  @IsOptional()
  @IsBoolean()
  soloRicerca?: boolean;
}
