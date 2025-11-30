import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebClient } from '@slack/web-api';

export interface ArticleNotification {
  title: string;
  url: string;
  summary: string;
  translation?: string;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly slackClient: WebClient | null;
  private readonly slackChannelId: string | undefined;

  constructor(private configService: ConfigService) {
    const slackToken = this.configService.get<string>('SLACK_BOT_TOKEN');
    this.slackChannelId = this.configService.get<string>('SLACK_CHANNEL_ID');

    if (!slackToken || !this.slackChannelId) {
      this.logger.warn(
        'SLACK_BOT_TOKEN or SLACK_CHANNEL_ID is not defined. Notifications will be skipped.',
      );
      this.slackClient = null;
    } else {
      this.slackClient = new WebClient(slackToken);
      this.logger.log('Slack client initialized successfully');
    }
  }

  /**
   * Slack으로 단일 아티클 알림 전송
   */
  async sendToSlack(article: ArticleNotification): Promise<void> {
    if (!this.slackClient || !this.slackChannelId) {
      this.logger.warn('Slack client not configured. Skipping notification.');
      return;
    }

    try {
      const blocks = this.formatSlackMessage(article);

      await this.slackClient.chat.postMessage({
        channel: this.slackChannelId,
        blocks,
        text: `📰 ${article.title}`, // fallback text
      });

      this.logger.log(`Slack notification sent: ${article.title}`);
    } catch (error) {
      this.logger.error(`Failed to send Slack notification: ${error.message}`);
      throw new Error(`Slack 알림 전송 실패: ${error.message}`);
    }
  }

  /**
   * 여러 아티클을 Slack으로 전송
   */
  async sendMultipleToSlack(articles: ArticleNotification[]): Promise<void> {
    if (articles.length === 0) {
      this.logger.log('No articles to send');
      return;
    }

    this.logger.log(`Sending ${articles.length} articles to Slack...`);

    const results = await Promise.allSettled(
      articles.map((article) => this.sendToSlack(article)),
    );

    const successCount = results.filter((r) => r.status === 'fulfilled').length;
    const failedCount = results.length - successCount;

    if (failedCount > 0) {
      this.logger.warn(`${failedCount} notifications failed to send`);
    }

    this.logger.log(`Successfully sent ${successCount}/${articles.length} notifications`);
  }

  /**
   * Slack 메시지 포맷팅
   */
  private formatSlackMessage(article: ArticleNotification) {
    return [
      {
        type: 'header' as const,
        text: {
          type: 'plain_text' as const,
          text: `📰 ${article.title}`,
          emoji: true,
        },
      },
      {
        type: 'section' as const,
        text: {
          type: 'mrkdwn' as const,
          text: `*핵심 요약*\n${article.summary}`,
        },
      },
      {
        type: 'section' as const,
        text: {
          type: 'mrkdwn' as const,
          text: `<${article.url}|원문 링크 보기>`,
        },
      },
      {
        type: 'divider' as const,
      },
    ];
  }

  /**
   * 테스트 메시지 전송
   */
  async sendTestMessage(): Promise<void> {
    const testArticle: ArticleNotification = {
      title: 'Test Article',
      url: 'https://example.com',
      summary: '이것은 테스트 메시지입니다.',
    };

    await this.sendToSlack(testArticle);
  }
}
