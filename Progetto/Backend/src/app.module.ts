import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UtenteController } from './utente/utente.controller';
import { UtenteService } from './utente/utente.service';
import { PrismaService } from './prisma.service';
import { VeicoloController } from './veicolo/veicolo.controller';
import { VeicoloService } from './veicolo/veicolo.service';
import { JwtModule } from '@nestjs/jwt';          
import { PassportModule } from '@nestjs/passport'; 
import { JwtStrategy } from './jwt.strategy'; 
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PassportModule,                               
    JwtModule.registerAsync({
      imports:[ConfigModule],
      useFactory:( config: ConfigService)  =>({                          
      secret: process.env.JWT_SECRET, // generato con  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
      signOptions: { expiresIn: '1h' },
    }),
    inject: [ConfigService],
  }),
  ],
  controllers: [AppController, UtenteController, VeicoloController],
  providers: [
    AppService,
    UtenteService,
    PrismaService,
    VeicoloService,
    JwtStrategy,                                   
  ],
})
export class AppModule {}