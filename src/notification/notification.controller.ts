import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { FetcherService } from '../fetcher/fetcher.service';
import { SummaryService } from '../summary/summary.service';
import { SlackCommandDto } from './dto/slack-command.dto';

@Controller('notification')
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly fetcherService: FetcherService,
    private readonly summaryService: SummaryService,
  ) {}

  /**
   * POST /notification/test
   * Slack 연동 테스트
   */
  @Post('test')
  async testSlackNotification(): Promise<{ success: boolean; message: string }> {
    try {
      await this.notificationService.sendTestMessage();

      return {
        success: true,
        message: 'Test notification sent to Slack successfully',
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to send test notification',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * POST /notification/slack/check-articles
   * Slack Slash Command: 새로운 아티클 확인 및 요약
   */
  @Post('slack/check-articles')
  async slackCheckArticles(@Body() body: SlackCommandDto) {
    this.logger.log(
      `Slack command received: /check-articles from ${body.user_name}`,
    );

    try {
      return await this.handleCheckArticles();
    } catch (error) {
      this.logger.error(`Slack command error: ${error.message}`, error.stack);
      return {
        response_type: 'ephemeral',
        text: `❌ 오류가 발생했습니다: ${error.message}`,
      };
    }
  }

  /**
   * POST /notification/slack/summarize-article
   * Slack Slash Command: 특정 URL 아티클 요약
   */
  @Post('slack/summarize-article')
  async slackSummarizeArticle(@Body() body: SlackCommandDto) {
    this.logger.log(
      `Slack command received: /summarize-article from ${body.user_name}`,
    );

    try {
      const url = body.text?.trim() || '';

      if (!url) {
        return {
          response_type: 'ephemeral',
          text: '❌ URL을 입력해주세요.\n사용법: `/아티클-요약 https://example.com/article`',
        };
      }

      return await this.handleSummarizeArticle(url);
    } catch (error) {
      this.logger.error(`Slack command error: ${error.message}`, error.stack);
      return {
        response_type: 'ephemeral',
        text: `❌ 오류가 발생했습니다: ${error.message}`,
      };
    }
  }

  /**
   * 새로운 아티클 체크 및 요약 처리
   */
  private async handleCheckArticles() {
    this.logger.log('Processing check articles command...');

    // 즉시 응답 (Slack은 3초 내에 응답해야 함)
    const immediateResponse = {
      response_type: 'in_channel',
      text: '🔍 새로운 아티클을 확인하고 있습니다...',
    };

    // 백그라운드에서 실제 작업 수행
    setImmediate(async () => {
      try {
        const result = await this.fetcherService.fetchSummarizeAndNotify();

        if (result.fetchedCount === 0) {
          await this.notificationService.sendToSlack({
            title: '알림 체크 완료',
            url: 'https://github.com/SAllen0400/swift-news',
            summary: '✅ 새로운 아티클이 없습니다.',
          });
        } else {
          await this.notificationService.sendToSlack({
            title: '알림 체크 완료',
            url: 'https://github.com/SAllen0400/swift-news',
            summary: `✅ 총 ${result.fetchedCount}개의 새로운 아티클을 처리했습니다.\n• 요약 완료: ${result.processedCount}개\n• 알림 전송: ${result.notifiedCount}개`,
          });
        }
      } catch (error) {
        this.logger.error(`Background processing error: ${error.message}`);
        await this.notificationService.sendToSlack({
          title: '알림 체크 실패',
          url: 'https://github.com/SAllen0400/swift-news',
          summary: `❌ 오류가 발생했습니다: ${error.message}`,
        });
      }
    });

    return immediateResponse;
  }

  /**
   * 특정 URL 아티클 요약 처리
   */
  private async handleSummarizeArticle(url: string) {
    this.logger.log(`Processing summarize article command for: ${url}`);

    // URL 유효성 검사
    try {
      new URL(url);
    } catch {
      return {
        response_type: 'ephemeral',
        text: `❌ 유효하지 않은 URL입니다: ${url}`,
      };
    }

    // 즉시 응답
    const immediateResponse = {
      response_type: 'in_channel',
      text: `🔍 아티클을 분석하고 있습니다...\n${url}`,
    };

    // 백그라운드에서 요약 처리
    setImmediate(async () => {
      try {
        const result = await this.summaryService.processArticle(url);

        await this.notificationService.sendToSlack({
          title: '아티클 요약 완료',
          url: result.originalUrl,
          translation: result.translation,
          summary: result.summary,
        });
      } catch (error) {
        this.logger.error(`Summarize error: ${error.message}`);
        await this.notificationService.sendToSlack({
          title: '아티클 요약 실패',
          url: url,
          summary: `❌ 요약 중 오류가 발생했습니다: ${error.message}`,
        });
      }
    });

    return immediateResponse;
  }
}
