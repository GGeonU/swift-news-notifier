import { Module, forwardRef } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { FetcherModule } from '../fetcher/fetcher.module';

@Module({
  // Controller에서 FetcherService를 직접 호출하므로 FetcherModule만 import
  // SummaryService는 이벤트 기반으로 자동 연결되므로 불필요
  imports: [forwardRef(() => FetcherModule)],
  providers: [NotificationService],
  exports: [NotificationService],
  controllers: [NotificationController],
})
export class NotificationModule {}
