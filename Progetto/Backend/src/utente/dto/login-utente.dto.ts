import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginUtenteDto {
  @IsNotEmpty({ message: "L'email è obbligatoria" })
  @IsEmail({}, { message: 'Email non valida' })
  email!: string;

  @IsNotEmpty({ message: 'La password è obbligatoria' })
  @IsString()
  @MinLength(8, { message: 'La password deve avere almeno 8 caratteri' })
  password!: string;
}
