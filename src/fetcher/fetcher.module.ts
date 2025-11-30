import { Module } from '@nestjs/common';
import { FetcherService } from './fetcher.service';
import { FetcherController } from './fetcher.controller';

@Module({
  // 이벤트 기반 아키텍처로 변경되어 다른 모듈 import 불필요
  providers: [FetcherService],
  exports: [FetcherService],
  controllers: [FetcherController],
})
export class FetcherModule {}
