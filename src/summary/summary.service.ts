import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  GoogleGenerativeAI,
  GenerativeModel,
} from '@google/generative-ai';
import {
  ArticleFetchedEvent,
  ArticleSummaryCompletedEvent,
  ArticleSummaryFailedEvent,
  ARTICLE_EVENTS,
} from '../events/article.events';
import { ArticleSummary } from '../shared/article-summary';
import {
  SummaryError,
  UnexpectedURLError,
  SummaryFailedError,
} from './summary.error';

@Injectable()
export class SummaryService {
  private readonly logger = new Logger(SummaryService.name);
  private generativeAI: GoogleGenerativeAI;
  private generativeModel: GenerativeModel;

  constructor(
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined in .env');
    }

    this.generativeAI = new GoogleGenerativeAI(apiKey);
    this.generativeModel = this.generativeAI.getGenerativeModel(
      { model: 'gemini-2.5-flash' }
    );
  }

  /**
   * article.fetched 이벤트 리스너
   * 새로운 아티클이 발견되면 요약을 진행
   */
  @OnEvent(ARTICLE_EVENTS.NEW_FETCHED)
  async handleNewArticleFetched(event: ArticleFetchedEvent) {
    this.logger.log(`Received article.fetched event for: ${event.title}`,);

    try {
      const article = await this.summarizeArticle(event.url);
      this.logger.log(
        `Emitting article.summary.completed event for: ${article.title}`,
      );
      this.eventEmitter.emit(
        ARTICLE_EVENTS.SUMMARY_COMPLETED,
        new ArticleSummaryCompletedEvent(article),
      );
    } catch (error) {
      this.logger.error(
        `Emitting article.summary.failed event for: ${event.title}`,
      );
      this.eventEmitter.emit(
        ARTICLE_EVENTS.SUMMARY_FAILED,
        new ArticleSummaryFailedEvent(
          event.url, 
          error.message
        ),
      );
    }
  }

  /**
   * 실제 아티클 요약 진행
   */
  private async summarizeArticle(url: string): Promise<ArticleSummary> {
    this.logger.log(`Summarizing article: ${url}`);

    const prompt = `
당신은 Swift/iOS 기술 아티클 요약 전문가입니다.

**1단계: 주제 확인**
- 먼저 아래 URL의 아티클이 Swift, iOS, iPadOS, watchOS, tvOS, visionOS, macOS, SwiftUI, UIKit, Combine, Xcode 등 Apple 플랫폼 개발과 관련된 내용인지 확인하세요.
- Apple 플랫폼 개발과 전혀 관련 없는 주제라면 (예: 안드로이드 개발, 웹 개발, 백엔드, 데이터베이스, AI/ML만 다루는 글 혹은 개발과 관련 없는 페이지 등) "NOT_SWIFT_IOS_TOPIC" 문자열만 반환하세요.

**2단계: 요약 (Apple 개발 관련 주제인 경우만)**
**임무: 아래 URL의 아티클을 읽고 매우 짧게 요약하세요.**
**중요: 전체 아티클을 번역하지 마세요! 핵심만 간단히 요약하세요!**
**예외: 링크의 내용을 가져오지 못하거나 요약을 진행할 수 없는 경우, 페이지에서 내용을 찾을 수 없는 경우 빈 문자열을 반환하세요.**

**주요 내용 (1-2줄):**
- 이 아티클이 무엇에 관한 것인지 한 문장으로 설명
- 기술 용어는 영어로 유지

**요약 (3-5개의 Bullet Point):**
- 가장 중요한 핵심 포인트만 추출
- 각 포인트는 한 줄로 간결하게
- 기술 용어는 영어로 유지, 나머지는 한국어로 번역
- 마크다운 Bullet Point 형식 (- 로 시작)

**URL:**
${url}

**출력 형식 (무조건 이 형식만 따라서 출력하세요):**
## 제목
[아티클 제목 원문 그대로]

## 주요 내용
[1-2줄 설명]

## 요약
- [핵심 포인트 1]
- [핵심 포인트 2]
- [핵심 포인트 3]

**출력 예시:**
## 제목
What's new in Swift 6.1?

## 주요 내용
이 아티클은 Swift 6.1에 도입된 Concurrency 개선, Custom performance metrics, 그리고 Void 타입의 Codable 채택 등 주요 변경사항을 소개합니다. iOS 개발자들은 이를 통해 Swift의 최신 발전 방향을 이해하고 더 안전하며 효율적인 코드를 작성하는 데 필요한 인사이트를 얻을 수 있습니다.

## 요약
- Concurrency 관련하여 async let이 Sendable이 되고 actor 메서드에 isolated default arguments가 지원되는 등 안전성과 사용성이 개선되었습니다.
- SE-0410을 통해 개발자가 직접 정의하는 Custom performance metrics를 지원하여 Swift 테스트 시 더욱 정밀한 성능 분석이 가능해졌습니다.
- Void 타입이 Encodable 및 Decodable 프로토콜을 채택하여, 응답 바디가 없는 API 처리 시 코드를 간소화할 수 있습니다.
- Swift Package Manager가 Swift 6 및 Swift 5 모드를 동시에 지원하여 패키지 호환성 및 마이그레이션 편의성이 향상되었습니다.
- UnsafeRawBufferPointer의 일부 initializer가 Deprecate 되고, _Concurrency.AsyncStream이 Sendable이 되는 등 전반적인 타입 안전성과 개발 편의성이 강화되었습니다.
`;
    try {
      const result = await this.generativeModel.generateContent(prompt);
      const response = result.response.text();
      // 응답이 빈 문자열인 경우, 링크의 내용을 가져오지 못했다고 판단하고 에러 발생.
      if (response.trim() === '') {
        throw new UnexpectedURLError(
          url,
          '해당 링크의 내용을 가져올 수 없습니다. 링크를 확인한 후 다시 시도해주세요.'
        );
      }
      return this.parseSummary(url, response);
    } catch (error) {
      if (error instanceof SummaryError) {
        this.logger.error(`Summary failed: ${error.message}`);
        throw error;
      }
      this.logger.error(`Unexpected error during article summary: ${error.message}`);
      throw new SummaryFailedError(
        url, 
        `요약 진행 과정 중 예상치 못한 문제가 발생했습니다. 관리자에게 문의해주세요.`
      );
    }
  }

  /**
   * 응답 텍스트를 ArticleSummary 객체로 파싱
   */
  private parseSummary(url: string, response: string): ArticleSummary {
    // 주제 검증 실패 체크
    if (response.trim() === 'NOT_SWIFT_IOS_TOPIC') {
      throw new SummaryFailedError(
        url,
        '이 아티클은 Swift/iOS 관련 주제가 아닌 것 같습니다. Swift, iOS, Apple 플랫폼 개발 관련 아티클을 요청해주세요!'
      );
    }

    const titleMatch = response.match(/## 제목\s+([\s\S]*?)(?=\n## |$)/);
    const summaryMatch = response.match(/## 주요 내용\s+([\s\S]*?)(?=\n## |$)/);
    const bulletsMatch = response.match(/## 요약\s+([\s\S]*?)$/);

    if (!titleMatch || !summaryMatch) {
      throw new SummaryFailedError(
        url,
        '요약 진행 과정 중 문제가 발생했습니다. 관리자에게 문의해주세요.'
      );
    }

    console.log("response", response);

    const title = titleMatch[1].trim();
    let summary = summaryMatch[1].trim();

    let bullets: string[] = [];
    if (bulletsMatch) {
      const bulletsText = bulletsMatch[1];
      console.log('Bullets raw text:', JSON.stringify(bulletsText));

      bullets = bulletsText
        .split('\n')
        .map((line) => line.trim())
        .map((line) => line.replace(/^[-*•\-−–—]\s*/, ''))
        .filter((line) => line.length > 0);
    } else {
      // ## 요약 섹션이 없으면 주요 내용을 bullet으로 변환
      this.logger.warn(`No ## 요약 section found, converting summary to bullets`);
      // 문장을 bullet point로 분리 (한 문장씩 bullet으로)
      bullets = summary
        .split(/\.\s+/)
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .map(s => s.endsWith('.') ? s : s + '.');

      // summary는 첫 문장만 유지
      summary = bullets[0] || summary;
    }

    return new ArticleSummary(url, title, summary, bullets);
  }
}
