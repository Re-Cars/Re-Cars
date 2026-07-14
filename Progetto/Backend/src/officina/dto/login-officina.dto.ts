import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class LoginOfficinaDto {
  @IsNotEmpty({ message: 'La partita IVA è obbligatoria' })
  @IsString()
  partita_iva!: string;

  @IsNotEmpty({ message: 'La password è obbligatoria' })
  @IsString()
  @MinLength(8, { message: 'La password deve avere almeno 8 caratteri' })
  password!: string;
}
