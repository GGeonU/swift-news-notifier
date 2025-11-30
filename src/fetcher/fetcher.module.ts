import { Module } from '@nestjs/common';
import { FetcherService } from './fetcher.service';
import { FetcherController } from './fetcher.controller';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [NotificationModule],
  providers: [FetcherService],
  exports: [FetcherService],
  controllers: [FetcherController],
})
export class FetcherModule {}
