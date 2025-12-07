import { Controller, Post, Body, Logger } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { SlackCommandRequest } from './dto/slack-command-request.dto';
import { SlackCommandResponse } from './dto/slack-command-response.dto';

/**
 * 외부 Webhook 요청을 처리하는 컨트롤러
 * Slack Slash Command 등의 외부 통합 엔드포인트 담당
 */
@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly webhookService: WebhookService) {}

  /**
   * POST /webhook/slack/check-articles
   * Slack Slash Command: 새로운 아티클 확인 및 요약
   */
  @Post('slack/check-articles')
  async slackCheckArticles(@Body() body: SlackCommandRequest): Promise<SlackCommandResponse> {
    this.logger.log(
      `Slack command received: /check-articles from ${body.user_name}`,
    );

    if (body.text && body.text.trim() !== '') {
      return {
        response_type: 'ephemeral',
        text: '❌ 커맨드 뒤에 입력된 텍스트가 있습니다.\n혹시 `/아티클-요약` 명령어를 사용하고 싶으신가요? 아니라면 텍스트 없이 다시 시도해주세요.',
      };
    }

    try {
      const immediateResponse: SlackCommandResponse = {
        response_type: 'in_channel',
        text: '🔍 새로 업데이트된 아티클이 있는지 확인하고 있습니다...',
      };

      // 백그라운드에서 이벤트 발행 (Handle Asyncronous)
      setImmediate(async () => {
        await this.webhookService.requestCheckArticles(body.user_name);
      });

      return immediateResponse;
    } catch (error) {
      this.logger.error(`Slack command error: ${error.message}`, error.stack);
      return {
        response_type: 'ephemeral',
        text: `❌ 서버 내부 오류가 발생했습니다: ${error.message}`,
      };
    }
  }

  /**
   * POST /webhook/slack/summarize-article
   * Slack Slash Command: 특정 URL 아티클 요약
   */
  @Post('slack/summarize-article')
  async slackSummarizeArticle(@Body() body: SlackCommandRequest): Promise<SlackCommandResponse> {
    this.logger.log(
      `Slack command received: /summarize-article from ${body.user_name}`,
    );

    const url = body.text?.trim() || '';

    if (!url) {
      return {
        response_type: 'ephemeral',
        text: '❌ 커맨드 뒤에 요약할 아티클의 URL을 입력해주세요.\n사용법: `/아티클-요약 https://example.com/article`',
      };
    }

    // URL 유효성 검사
    try {
      new URL(url);
    } catch {
      return {
        response_type: 'ephemeral',
        text: '❌ 유효하지 않은 URL입니다. URL을 확인한 후 다시 시도해주세요.',
      };
    }

    try {
      const immediateResponse: SlackCommandResponse = {
        response_type: 'in_channel',
        text: `🔍 아티클을 분석하고 있습니다...`,
      };

      // 백그라운드에서 이벤트 발행 (비동기 처리)
      setImmediate(async () => {
        await this.webhookService.requestSummarizeArticle(url, body.user_name);
      });

      return immediateResponse;
    } catch (error) {
      this.logger.error(`Slack command error: ${error.message}`, error.stack);
      return {
        response_type: 'ephemeral',
        text: `❌ 서버 내부 오류가 발생했습니다: ${error.message}`,
      };
    }
  }
}
