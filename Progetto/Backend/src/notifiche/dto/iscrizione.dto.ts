import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';

class ChiaviIscrizioneDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  p256dh!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  auth!: string;
}

/** PushSubscription.toJSON() del browser (solo i campi che servono). */
export class IscrizioneDto {
  @IsUrl({ protocols: ['https'], require_protocol: true, require_tld: false })
  @MaxLength(1000)
  endpoint!: string;

  @ValidateNested()
  @Type(() => ChiaviIscrizioneDto)
  keys!: ChiaviIscrizioneDto;
}

export class DisiscrizioneDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  endpoint!: string;
}
