/**
 * 아티클 처리 관련 커스텀 에러 클래스들
 */

/**
 * 아티클 처리 기본 에러
 */
export class SummaryError extends Error {
  constructor(message: string, public readonly url: string) {
    super(message);
    this.name = 'SummaryError';
  }
}

/**
 * 아티클 요약 진행 중 모종의 이유로 실패한 경우
 */
export class UnexpectedURLError extends SummaryError {
  constructor(url: string, reason: string) {
    super(`URL 접근 실패: ${reason}`, url);
    this.name = 'UnexpectedURLError';
  }
}

/**
 * Article 요약 진행 중 모종의 이유로 실패한 경우
 */
export class SummaryFailedError extends SummaryError {
  constructor(url: string, reason: string) {
    super(`아티클 요약 실패: ${reason}`, url);
    this.name = 'SummaryFailedError';
  }
}