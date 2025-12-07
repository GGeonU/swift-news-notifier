import { Controller } from '@nestjs/common';
import { SummaryService } from './summary.service';

@Controller('summary')
export class SummaryController {
  constructor(private readonly summaryService: SummaryService) {}

  // 이벤트 기반으로 동작하므로 HTTP 엔드포인트 없음
  // 향후 필요시 추가 예정
}
