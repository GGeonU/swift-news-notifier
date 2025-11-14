import { Module } from '@nestjs/common';
import { FetcherService } from './fetcher.service';
import { FetcherController } from './fetcher.controller';
import { SummaryModule } from '../summary/summary.module';

@Module({
  imports: [SummaryModule], // SummaryModule을 import
  providers: [FetcherService],
  exports: [FetcherService],
  controllers: [FetcherController],
})
export class FetcherModule {}
