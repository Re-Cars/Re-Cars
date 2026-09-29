import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class RinnovoDto {
  /** true: Stripe rinnova ogni mese; false: termina a fine periodo pagato. */
  @IsBoolean()
  automatico!: boolean;
}

export class PortaleDto {
  /** Origine del frontend, per tornare al sito dopo il portale Stripe. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  baseUrl?: string;
}
