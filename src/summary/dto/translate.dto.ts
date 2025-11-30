import { ArticleSummaryDto } from './article-summary.dto';

// 번역 요청 DTO
export class TranslateRequestDto {
  url: string; // 마크다운 파일 URL
}

// 번역 응답 DTO
export class TranslateResponseDto {
  originalUrl: string; // 원본 URL
  articleSummary: ArticleSummaryDto; // 구조화된 요약 정보
}
