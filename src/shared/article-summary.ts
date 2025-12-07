/**
 * 아티클 요약 결과
 */
export class ArticleSummary {
  /**
   * 아티클 URL
   */
  url: string;

  /**
   * 아티클 원제목
   */
  title: string;

  /**
   * 주요 내용 (1-2줄 설명)
   */
  summary: string;

  /**
   * 핵심 포인트 목록 (3-5개의 bullet points)
   */
  bullets: string[];

  constructor(
    url: string,
    title: string,
    summary: string,
    bullets: string[],
  ) {
    this.url = url;
    this.title = title;
    this.summary = summary;
    this.bullets = bullets;
  }
}
