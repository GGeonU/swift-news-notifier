/**
 * 아티클 데이터 인터페이스
 */
export interface Article {
  /** 아티클 제목 */
  title: string;

  /** 아티클 URL */
  url: string;

  /** 발견된 시각 */
  discoveredAt: Date;

  /** 소스 (예: 'github', 'rss' 등) */
  source?: string;
}
