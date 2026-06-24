import { Module } from '@nestjs/common';
import { PrenotazioniService } from './prenotazione.service';
import { PrenotazioniController } from './prenotazione.controller';
import { PrismaService } from '../prisma.service';
import { AppMailerModule } from '../mailer.module';

@Module({
  imports: [AppMailerModule], // ← importa AppModule che esporta MailerModule
  controllers: [PrenotazioniController],
  providers: [PrenotazioniService, PrismaService],
})
export class PrenotazioneModule {}