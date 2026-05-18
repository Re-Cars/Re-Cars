import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UtenteController } from './utente/utente.controller';
import { UtenteService } from './utente/utente.service';
import { PrismaService } from './prisma.service';
import { VeicoloController } from './veicolo/veicolo.controller';
import { VeicoloService } from './veicolo/veicolo.service';

@Module({
  imports: [],
  controllers: [AppController, UtenteController, VeicoloController],
  providers: [AppService, UtenteService, PrismaService, VeicoloService],
})
export class AppModule {}