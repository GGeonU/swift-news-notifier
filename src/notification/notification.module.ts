import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';

@Module({
  providers: [NotificationService],
  exports: [NotificationService],
  controllers: [NotificationController], // 다른 모듈에서 사용 가능하도록 export
})
export class NotificationModule {}
