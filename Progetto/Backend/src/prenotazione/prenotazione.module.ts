import { Module } from '@nestjs/common';
import { PrenotazioniService } from './prenotazione.service'; // Sostituito con plurale
import { PrenotazioniController } from './prenotazione.controller'; // Sostituito con plurale
import { PrismaService } from '../prisma.service'; // Assicurati che il percorso sia corretto nel tuo progetto

@Module({
  controllers: [PrenotazioniController], // Sostituito con plurale
  providers: [PrenotazioniService, PrismaService], // Sostituito con plurale
})
export class PrenotazioneModule {}