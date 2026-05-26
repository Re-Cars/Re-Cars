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
import { JwtStrategy } from './utente/jwt.strategy'; 

@Module({
  imports: [
    PassportModule,                               
    JwtModule.register({                           
      secret: process.env.JWT_SECRET, // generato con  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
      signOptions: { expiresIn: '1h' },
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