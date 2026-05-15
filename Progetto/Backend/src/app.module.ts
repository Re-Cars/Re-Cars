import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UtenteController } from './utente.controller';
import { UtenteService } from './utente.service';
import { PrismaService } from './prisma.service';

@Module({
  imports: [],
  controllers: [AppController, UtenteController],
  providers: [AppService, UtenteService, PrismaService],
})
export class AppModule {}