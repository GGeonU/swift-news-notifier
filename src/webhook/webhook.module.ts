import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';

/**
 * Webhook 모듈
 * 외부 시스템(Slack, 카카오톡 등)의 webhook 요청을 처리
 */
@Module({
  controllers: [WebhookController],
  providers: [WebhookService],
  exports: [WebhookService],
})
export class WebhookModule {}
