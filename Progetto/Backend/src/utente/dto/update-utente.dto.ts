import { IsString, IsEmail, IsOptional, MinLength } from 'class-validator';

export class UpdateUtenteDto {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  cellulare?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsString()
  avatar?: string;
}
