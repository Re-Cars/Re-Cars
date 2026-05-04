import { Controller, Post, Body } from '@nestjs/common';
import { UtenteService } from './utente.service';
import { CreateUtenteDto } from './utente/dto/create-utente.dto';

@Controller('auth')
export class UtenteController {
  

  constructor(private readonly utenteService: UtenteService) {}

  @Post('register')
  async register(@Body() datiRicevuti: CreateUtenteDto) {
    return this.utenteService.registra(datiRicevuti);
  }
}
