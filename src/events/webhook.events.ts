/**
 * Webhook 관련 이벤트 정의
 */
export const WEBHOOK_EVENTS = {
  CHECK_ARTICLES_REQUESTED: 'webhook.check-articles-requested',
  SUMMARIZE_ARTICLE_REQUESTED: 'webhook.summarize-article-requested',
} as const;

/**
 * 아티클 체크 요청 이벤트
 */
export class CheckArticlesRequestedEvent {
  constructor(
    public readonly requestedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

/**
 * 특정 아티클 요약 요청 이벤트
 */
export class SummarizeArticleRequestedEvent {
  constructor(
    public readonly url: string,
    public readonly requestedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}
