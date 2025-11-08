import { Module } from '@nestjs/common';
import { FetcherService } from './fetcher.service';
import { FetcherController } from './fetcher.controller';

@Module({
  providers: [FetcherService],
  exports: [FetcherService],
  controllers: [FetcherController], // 다른 모듈에서 사용 가능하도록 export
})
export class FetcherModule {}
