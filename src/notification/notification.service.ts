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
        text: `📰 ${article.title}`,
        mrkdwn: true
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
    // 마크다운을 Slack mrkdwn 형식으로 변환
    const formattedSummary = this.convertToSlackMarkdown(article.summary);
    const formattedTranslation = article.translation
      ? this.convertToSlackMarkdown(article.translation)
      : null;

    const blocks: any[] = [
      {
        type: 'header' as const,
        text: {
          type: 'plain_text' as const,
          text: `📰 ${article.title}`,
          emoji: true,
        },
      },
    ];

    // 번역이 있으면 번역 섹션 추가
    if (formattedTranslation) {
      blocks.push({
        type: 'section' as const,
        text: {
          type: 'mrkdwn' as const,
          text: `*🌐 번역*\n${formattedTranslation}`,
        },
      });
    }

    // 요약 섹션
    blocks.push({
      type: 'section' as const,
      text: {
        type: 'mrkdwn' as const,
        text: `*📝 핵심 요약*\n${formattedSummary}`,
      },
    });

    // 원문 링크
    blocks.push({
      type: 'section' as const,
      text: {
        type: 'mrkdwn' as const,
        text: `<${article.url}|🔗 원문 링크 보기>`,
      },
    });

    // 구분선
    blocks.push({
      type: 'divider' as const,
    });

    return blocks;
  }

  /**
   * 마크다운을 Slack mrkdwn 형식으로 변환
   */
  private convertToSlackMarkdown(text: string): string {
    return (
      text
        // ## 제목 -> *제목*
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

  /**
   * 테스트 메시지 전송
   */
  async sendTestMessage(): Promise<void> {
    const testArticle: ArticleNotification = {
      title: 'Swift 6.0의 새로운 기능 소개',
      url: 'https://example.com/swift-6-features',
      translation: `## 번역

Swift 6.0은 **동시성 안정성**을 크게 개선하고 새로운 기능을 도입했습니다.

주요 변경사항:
- *Sendable* 프로토콜 강화
- \`async/await\` 패턴 개선
- **Data race 감지** 기능 추가

코드 예시:
\`\`\`swift
actor DataManager {
    func fetchData() async throws -> Data {
        // 안전한 동시성 처리
    }
}
\`\`\``,
      summary: `## 요약

• Swift 6.0의 가장 큰 변화는 **컴파일 타임 데이터 레이스 감지**입니다.
• \`Sendable\` 프로토콜이 더 엄격해져서 동시성 안전성이 향상되었습니다.
• 기존 코드에서 마이그레이션이 필요할 수 있으니 [마이그레이션 가이드](https://swift.org/migration)를 참고하세요.`,
    };

    await this.sendToSlack(testArticle);
  }
}
