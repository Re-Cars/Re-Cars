import { Module } from '@nestjs/common';

import { AssistenteController } from './assistente.controller';
import { AssistenteService } from './assistente.service';
import { GeminiClient } from './gemini.client';

@Module({
  controllers: [AssistenteController],
  providers: [AssistenteService, GeminiClient],
})
export class AssistenteModule {}
