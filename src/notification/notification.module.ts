import { Module, forwardRef } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { FetcherModule } from '../fetcher/fetcher.module';
import { SummaryModule } from '../summary/summary.module';

@Module({
  // Controller에서는 직접 호출이 필요하므로 forwardRef 사용
  imports: [forwardRef(() => FetcherModule), forwardRef(() => SummaryModule)],
  providers: [NotificationService],
  exports: [NotificationService],
  controllers: [NotificationController],
})
export class NotificationModule {}
