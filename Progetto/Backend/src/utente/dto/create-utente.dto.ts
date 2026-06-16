import { IsString, IsEmail, IsOptional, MinLength, IsNotEmpty, Matches } from 'class-validator';

export class CreateUtenteDto {

  @IsNotEmpty({ message: 'Il nome utente è obbligatorio' })
  @IsString()
  username!: string;

  @IsNotEmpty({ message: 'La password è obbligatoria' })
  @MinLength(8, { message: 'La password deve avere almeno 8 caratteri' })
  @IsString()
  password!: string;

  @IsNotEmpty({ message: 'L\'email è obbligatoria' })
  @IsEmail({}, { message: 'Email non valida' })
  email!: string;

  @IsOptional()
  @IsString()
  cellulare?: string;
}