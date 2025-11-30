import { Module } from '@nestjs/common';
import { FetcherService } from './fetcher.service';
import { FetcherController } from './fetcher.controller';
import { SummaryModule } from '../summary/summary.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [SummaryModule, NotificationModule], // SummaryModule과 NotificationModule을 import
  providers: [FetcherService],
  exports: [FetcherService],
  controllers: [FetcherController],
})
export class FetcherModule {}
