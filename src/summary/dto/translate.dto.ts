// 번역 요청 DTO
export class TranslateRequestDto {
  url: string; // 마크다운 파일 URL
}

// 번역 응답 DTO
export class TranslateResponseDto {
  originalUrl: string; // 원본 URL
  translation: string; // 번역된 전체 텍스트
  summary: string; // 핵심 요약 (3-5줄)
}
