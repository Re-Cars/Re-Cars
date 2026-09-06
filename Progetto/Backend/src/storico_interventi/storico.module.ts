import { Module } from '@nestjs/common';
import { StoricoController } from './storico.controller';
import { StoricoService } from './storico.service';
import { PrismaModule } from '../prisma.module'; 

@Module({
  imports: [PrismaModule],
  controllers: [StoricoController],
  providers: [StoricoService],
})
export class StoricoModule {}