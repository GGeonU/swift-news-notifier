import { Module } from '@nestjs/common';
import { SummaryController } from './summary.controller';
import { SummaryService } from './summary.service';

@Module({
  controllers: [SummaryController],
  providers: [SummaryService],
  exports: [SummaryService], // 다른 모듈에서도 SummaryService를 사용할 수 있도록
})
export class SummaryModule {}
