import { Module } from '@nestjs/common';
import { OfficinaService } from './officina.service';
import { OfficinaController } from './officina.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificheModule } from '../notifiche/notifiche.module';
import { SESSIONE_JWT } from '../auth-cookie.util';

@Module({
  imports: [
    ConfigModule,
    NotificheModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: SESSIONE_JWT },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [OfficinaController],
  providers: [OfficinaService],
})
export class OfficinaModule {}
