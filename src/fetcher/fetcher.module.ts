import { Module } from '@nestjs/common';
import { FetcherService } from './fetcher.service';
import { FetcherController } from './fetcher.controller';

@Module({
  providers: [FetcherService],
  exports: [FetcherService],
  controllers: [FetcherController],
})
export class FetcherModule {}
