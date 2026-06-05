import { Module } from '@nestjs/common';
import { OfficinaService } from './officina.service';
import { OfficinaController } from './officina.controller';

@Module({
  controllers: [OfficinaController],
  providers: [OfficinaService],
})
export class OfficinaModule {}
