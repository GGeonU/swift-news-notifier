/**
 * 아티클 요약 결과를 담는 DTO
 */
export class ArticleSummaryDto {
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

  constructor(title: string, summary: string, bullets: string[]) {
    this.title = title;
    this.summary = summary;
    this.bullets = bullets;
  }

  /**
   * Slack 전송을 위한 마크다운 형식 생성
   */
  toMarkdown(): string {
    const bulletPoints = this.bullets.map((bullet) => `- ${bullet}`).join('\n');
    return `## 주요 내용\n${this.summary}\n\n## 요약\n${bulletPoints}`;
  }
}
