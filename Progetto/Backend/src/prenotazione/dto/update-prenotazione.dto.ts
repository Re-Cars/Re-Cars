import { PartialType } from '@nestjs/mapped-types';
import { CreatePrenotazioneDto } from './create-prenotazione.dto';

export class UpdatePrenotazioneDto extends PartialType(CreatePrenotazioneDto) {}
