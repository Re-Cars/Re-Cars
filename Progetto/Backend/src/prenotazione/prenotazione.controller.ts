import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { PrenotazioniService } from './prenotazione.service';
import { CreatePrenotazioneDto } from './dto/create-prenotazione.dto';
import { JwtAuthGuard } from '../jwt-auth.guard'; // Adatta il percorso se necessario
import { CurrentUser } from '../current-user.decorator';
import type { JwtPayload } from '../jwt-payload.interface';

@Controller('prenotazioni')
export class PrenotazioniController {
  constructor(private readonly prenotazioniService: PrenotazioniService) {}

  @UseGuards(JwtAuthGuard) // Rendi l'endpoint protetto se serve l'utente loggato
  @Post()
  async creaPrenotazione(
    @Body() dto: CreatePrenotazioneDto,
    @CurrentUser() user: JwtPayload,
  ) {
    // Estrai l'id dell'utente loggato dal token JWT (sub o id)
    const utenteId = Number(user.sub);

    return this.prenotazioniService.crea(utenteId, dto);
  }

  @UseGuards(JwtAuthGuard) // Rendi l'endpoint protetto se serve l'utente loggato
  @Get()
  async Stampa(@CurrentUser() user: JwtPayload) {
    const utenteId = Number(user.sub);
    return this.prenotazioniService.trovaPerUtente(utenteId);
  }

  /**
   * L'utente può solo annullare una sua prenotazione ancora aperta
   * (in attesa o confermata); gli altri cambi di stato li fa l'officina.
   */
  @UseGuards(JwtAuthGuard)
  @Patch(':id/stato')
  async aggiornaStato(
    @Param('id', ParseIntPipe) id: number,
    @Body('stato') stato: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.prenotazioniService.annullaDaUtente(
      id,
      Number(user.sub),
      stato,
    );
  }
}
