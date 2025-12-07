import { ArticleSummary } from '../shared/article-summary';

/**
 * 아티클 관련 이벤트 정의
 */

export const ARTICLE_EVENTS = {
  NEW_FETCHED: 'article.new.fetched',
  SUMMARY_COMPLETED: 'article.summary.completed',
  SUMMARY_FAILED: 'article.summary.failed',
  CHECK_COMPLETED: 'article.check.completed',
  CHECK_FAILED: 'article.check.failed',
} as const;

/**
 * 새로운 아티클이 발견되었을 때 발행되는 이벤트
 */
export class ArticleFetchedEvent {
  constructor(
    public readonly title: string,
    public readonly url: string,
  ) {}
}

/**
 * 아티클 요약이 완료되었을 때 발행되는 이벤트
 */
export class ArticleSummaryCompletedEvent {
  constructor(
    public readonly article: ArticleSummary,
  ) {}
}

/**
 * 아티클 요약이 실패했을 때 발행되는 이벤트
 */
export class ArticleSummaryFailedEvent {
  constructor(
    public readonly url: string,
    public readonly errorMessage: string,
  ) {}
}

/**
 * 아티클 체크가 완료되었을 때 발행되는 이벤트
 */
export class ArticleCheckCompletedEvent {
  constructor(
    public readonly articleCount: number,
    public readonly message: string,
  ) {}
}

/**
 * 아티클 체크가 실패했을 때 발행되는 이벤트
 */
export class ArticleCheckFailedEvent {
  constructor(
    public readonly errorMessage: string,
  ) {}
}