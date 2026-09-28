import { Module } from '@nestjs/common';
import { NotificheController } from './notifiche.controller';
import { NotificheService } from './notifiche.service';

@Module({
  controllers: [NotificheController],
  providers: [NotificheService],
  exports: [NotificheService],
})
export class NotificheModule {}
