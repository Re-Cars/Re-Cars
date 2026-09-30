import { Module } from '@nestjs/common';
import { VerificaEmailService } from './verifica-email.service';

@Module({
  providers: [VerificaEmailService],
  exports: [VerificaEmailService],
})
export class VerificaEmailModule {}
