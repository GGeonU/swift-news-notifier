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
  ArticleSummarizedEvent,
  ARTICLE_EVENTS,
} from '../events/article.events';
import { ArticleSummaryDto } from './dto/article-summary.dto';

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
   * 새로운 아티클이 발견되면 자동으로 요약 처리
   */
  @OnEvent(ARTICLE_EVENTS.FETCHED)
  async handleArticleFetched(event: ArticleFetchedEvent) {
    this.logger.log(
      `Received article.fetched event for: ${event.title}`,
    );

    try {
      const result = await this.processArticle(event.url);
      const { articleSummary } = result;

      this.logger.log(
        `Emitting article.summarized event for: ${articleSummary.title}`,
      );
      this.eventEmitter.emit(
        ARTICLE_EVENTS.SUMMARIZED,
        new ArticleSummarizedEvent(
          articleSummary.title,
          result.originalUrl,
          articleSummary.summary,
          articleSummary.toMarkdown(),
        ),
      );
    } catch (error) {
      this.logger.error(
        `Failed to process article "${event.title}": ${error.message}`,
      );
      // 실패해도 다른 아티클 처리는 계속 진행
    }
  }

  async processArticle(url: string): Promise<{
    originalUrl: string;
    articleSummary: ArticleSummaryDto;
  }> {
    this.logger.log(`Processing article: ${url}`);

    const prompt = `
당신은 Swift/iOS 기술 아티클 요약 전문가입니다.

**임무: 아래 URL의 아티클을 읽고 매우 짧게 요약하세요.**
**중요: 전체 아티클을 번역하지 마세요! 핵심만 간단히 요약하세요!**

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

**출력 형식 (이 형식만 출력하세요):**
## 제목
[아티클 제목 원문 그대로]

## 주요 내용
[1-2줄 설명]

## 요약
- [핵심 포인트 1]
- [핵심 포인트 2]
- [핵심 포인트 3]
`;
    try {
      const result = await this.generativeModel.generateContent(prompt);
      const response = result.response.text();

      // 각 섹션 파싱
      const titleMatch = response.match(/## 제목\s+([\s\S]*?)(?=\n## |$)/);
      const summaryMatch = response.match(/## 주요 내용\s+([\s\S]*?)(?=\n## |$)/);
      const bulletsMatch = response.match(/## 요약\s+([\s\S]*?)$/);

      const title = titleMatch ? titleMatch[1].trim() : '제목 없음';
      const summary = summaryMatch ? summaryMatch[1].trim() : '';

      // Bullet points 파싱 (-, *, • 등 다양한 형식 지원)
      let bullets: string[] = [];
      if (bulletsMatch) {
        bullets = bulletsMatch[1]
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.length > 0)
          .map((line) => line.replace(/^[-*•]\s*/, ''));
      }

      const articleSummary = new ArticleSummaryDto(title, summary, bullets);

      return {
        originalUrl: url,
        articleSummary,
      };
    } catch (error) {
      this.logger.error(`Article processing failed: ${error.message}`);
      throw new Error(`아티클 처리 실패: ${error.message}`);
    }
  }
}
