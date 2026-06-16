import { IsString, IsEmail, IsOptional, MinLength } from 'class-validator';

export class UpdateUtenteDto {

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email non valida' })
  email?: string;

  @IsOptional()
  @IsString()
  cellulare?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'La password deve avere almeno 8 caratteri' })
  password?: string;
}