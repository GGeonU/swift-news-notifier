import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  CheckArticlesRequestedEvent,
  SummarizeArticleRequestedEvent,
  WEBHOOK_EVENTS,
} from '../events/webhook.events';

/**
 * Webhook 요청을 이벤트로 변환하는 서비스
 * 직접 비즈니스 로직을 실행하지 않고, 이벤트를 발행하여 다른 모듈과 느슨한 결합 유지
 */
@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * 새로운 아티클 체크 요청 처리
   * webhook.check-articles-requested 이벤트를 발행
   */
  async requestCheckArticles(requestedBy: string): Promise<void> {
    this.logger.log(
      `Emitting check articles request event from: ${requestedBy}`,
    );

    this.eventEmitter.emit(
      WEBHOOK_EVENTS.CHECK_ARTICLES_REQUESTED,
      new CheckArticlesRequestedEvent(requestedBy),
    );
  }

  /**
   * 특정 URL 아티클 요약 요청 처리
   * webhook.summarize-article-requested 이벤트를 발행
   */
  async requestSummarizeArticle(
    url: string,
    requestedBy: string,
  ): Promise<void> {
    this.logger.log(
      `Emitting summarize article request event for: ${url} by ${requestedBy}`,
    );

    this.eventEmitter.emit(
      WEBHOOK_EVENTS.SUMMARIZE_ARTICLE_REQUESTED,
      new SummarizeArticleRequestedEvent(url, requestedBy),
    );
  }
}
