import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UtenteController } from './utente/utente.controller';
import { UtenteService } from './utente/utente.service';
import { VeicoloController } from './veicolo/veicolo.controller';
import { VeicoloService } from './veicolo/veicolo.service';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OfficinaModule } from './officina/officina.module';
import { PrismaModule } from './prisma.module';
import { StripeModule } from './stripe/stripe.module';
import { PrenotazioneModule } from './prenotazione/prenotazione.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
      inject: [ConfigService],
    }),
    OfficinaModule,
    StripeModule,
    PrenotazioneModule,
  ],
  controllers: [AppController, UtenteController, VeicoloController],
  providers: [
    AppService,
    UtenteService,
    VeicoloService,
    JwtStrategy,
  ],
})
export class AppModule {}