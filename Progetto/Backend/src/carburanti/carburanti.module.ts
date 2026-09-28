import { Module } from '@nestjs/common';
import { CarburantiController } from './carburanti.controller';
import { CarburantiService } from './carburanti.service';

@Module({
  controllers: [CarburantiController],
  providers: [CarburantiService],
})
export class CarburantiModule {}
