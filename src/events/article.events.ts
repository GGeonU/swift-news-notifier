/**
 * 아티클 관련 이벤트 정의
 */

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
export class ArticleSummarizedEvent {
  constructor(
    public readonly title: string,
    public readonly url: string,
    public readonly translation: string,
    public readonly summary: string,
  ) {}
}

/**
 * 이벤트 이름 상수
 */
export const ARTICLE_EVENTS = {
  FETCHED: 'article.fetched',
  SUMMARIZED: 'article.summarized',
} as const;
