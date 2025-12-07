import {
  Controller
} from '@nestjs/common';
import { NotificationService } from './notification.service';

@Controller('notification')
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
  ) {}

  // 이벤트 기반으로 동작하므로 HTTP 엔드포인트 없음
  // 향후 필요시 추가 예정
}
