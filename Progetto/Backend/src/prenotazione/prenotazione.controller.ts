import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { PrenotazioniService } from './prenotazione.service';
import { CreatePrenotazioneDto } from './dto/create-prenotazione.dto';
import { JwtAuthGuard } from '../jwt-auth.guard'; // Adatta il percorso se necessario
import type { Request } from 'express';

@Controller('prenotazioni')
export class PrenotazioniController {
  constructor(private readonly prenotazioniService: PrenotazioniService) {}

  @UseGuards(JwtAuthGuard) // Rendi l'endpoint protetto se serve l'utente loggato
  @Post()
  async creaPrenotazione(
    @Body() dto: CreatePrenotazioneDto,
    @Req() req: Request,
  ) {
    // Estrai l'id dell'utente loggato dal token JWT (sub o id)
    const utenteId = Number((req.user as any).sub); 
    
    return this.prenotazioniService.crea(utenteId, dto);
  }
}