import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { WebClient, Block, KnownBlock } from '@slack/web-api';
import {
  ArticleSummaryCompletedEvent,
  ArticleSummaryFailedEvent,
  ARTICLE_EVENTS,
} from '../events/article.events';
import { ArticleSummary } from 'src/shared/article-summary';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly slackClient: WebClient | null;
  private readonly slackChannelID: string | undefined;

  constructor(private configService: ConfigService) {
    const slackToken = this.configService.get<string>('SLACK_BOT_TOKEN');
    this.slackChannelID = this.configService.get<string>('SLACK_CHANNEL_ID');

    if (!slackToken || !this.slackChannelID) {
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
   * article.summary.completed 이벤트 리스너
   * 아티클 요약이 완료되면 자동으로 Slack 알림 전송
   */
  @OnEvent(ARTICLE_EVENTS.SUMMARY_COMPLETED)
  async handleArticleSummaryCompleted(event: ArticleSummaryCompletedEvent) {
    this.logger.log(
      `Received article.summarized event for: ${event.article.title}`,
    );
    const blocks = this.buildArticleSummaryBlocks(event.article);
    try {
      await this.sendSlackMessage(blocks);
      this.logger.log(
        `Successfully sent Slack notification for: ${event.article.title}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send Slack notification for "${event.article.title}": ${error.message}`,
      );
    }
  }

  /**
   * article.summary.failed 이벤트 리스너
   * 아티클 요약이 실패하면 에러 알림 전송
   */
  @OnEvent(ARTICLE_EVENTS.SUMMARY_FAILED)
  async handleArticleSummaryFailed(event: ArticleSummaryFailedEvent) {
    this.logger.log(
      `Received article.summary.failed event for: ${event.url}`,
    );
    const blocks = this.buildErrorMessageBlocks(event.url, event.errorMessage);
    try {
      await this.sendSlackMessage(blocks);
      this.logger.log(
        `Successfully sent error notification for: ${event.url}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send error notification for "${event.url}": ${error.message}`,
      );
    }
  }

  /**
   * Slack으로 메시지 전송 (아티클 요약 성공 또는 실패)
   */
  private async sendSlackMessage(blocks: (Block | KnownBlock)[]): Promise<void> {
    if (!this.slackClient || !this.slackChannelID) {
      this.logger.warn('Slack client not configured. Skipping notification.');
      return;
    }
    try {
      await this.slackClient.chat.postMessage({
        channel: this.slackChannelID,
        blocks,
        mrkdwn: true
      });
    } catch (error) {
      this.logger.error(`Failed to send message: ${error.message}`);
      throw new Error(`Slack 메시지 전송 실패: ${error.message}`);
    }
  }

  /**
   * Slack 메시지 포맷팅 (아티클 요약 성공)
   */
  private buildArticleSummaryBlocks(article: ArticleSummary): (Block | KnownBlock)[] {
    const formattedSummary = this.convertToSlackMarkdown(article.summary);

    const blocks: (Block | KnownBlock)[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `📰 ${article.title}`,
          emoji: true,
        },
      },
    ];

    // 요약 섹션
    if (formattedSummary) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: formattedSummary,
        },
      });
    }

    // 원문 링크
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `<${article.url}|🔗 원문 링크 보기>`,
      },
    });

    // 구분선
    blocks.push({
      type: 'divider',
    });

    return blocks;
  }

  /**
   * Slack 에러 메시지 포맷팅 (아티클 요약 실패)
   */
  private buildErrorMessageBlocks(url: string, errorMessage: string): (Block | KnownBlock)[] {
    const blocks: (Block | KnownBlock)[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '❌ 아티클 요약 실패',
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'plain_text',
          text: errorMessage,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*URL:*\n${url}`,
        },
      },
      {
        type: 'divider',
      },
    ];

    return blocks;
  }

  /**
   * 마크다운을 Slack mrkdwn 형식으로 변환
   */
  private convertToSlackMarkdown(text: string): string {
    return (
      text
        // ## 번역 -> *🌐 번역*
        .replace(/^##\s+주요 내용\s*$/gm, '*🌐 주요 내용*')
        // ## 요약 -> *📝 요약*
        .replace(/^##\s+요약\s*$/gm, '*📝 요약*')
        // 나머지 ## 제목 -> *제목*
        .replace(/^##\s+(.+)$/gm, '*$1*')
        // ### 제목 -> *제목*
        .replace(/^###\s+(.+)$/gm, '_$1_')
        // **텍스트** -> *텍스트* (이미 Slack 형식)
        .replace(/\*\*(.+?)\*\*/g, '*$1*')
        // __텍스트__ -> _텍스트_
        .replace(/__(.+?)__/g, '_$1_')
        // [링크](url) -> <url|링크>
        .replace(/\[(.+?)\]\((.+?)\)/g, '<$2|$1>')
        // 코드 블록 유지
        .replace(/```(.+?)```/gs, '```$1```')
        // 인라인 코드 유지
        .replace(/`(.+?)`/g, '`$1`')
        // 불렛 포인트 변환: - 또는 * -> •
        .replace(/^[*-]\s+/gm, '• ')
        // 빈 줄 정리
        .replace(/\n{3,}/g, '\n\n')
        .trim()
    );
  }
}
