import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SummaryService } from './summary.service';
import { UnexpectedURLError, SummaryFailedError } from './summary.error';
import { ArticleSummary } from '../shared/article-summary';

describe('SummaryService', () => {
  let service: SummaryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SummaryService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'GEMINI_API_KEY') return 'test-api-key';
              return null;
            }),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SummaryService>(SummaryService);
  });

  describe('parseSummary', () => {
    it('빈 응답 텍스트일 때 UnexpectedURLError를 던져야 함', () => {
      // given
      const url = 'https://example.com/article';
      const emptyResponse = '';

      // when & then
      expect(() => {
        // @ts-expect-error - private 메서드 테스트
        service.parseSummary(url, emptyResponse);
      }).toThrow(SummaryFailedError);
    });

    it('올바른 형식의 응답을 ArticleSummary로 파싱해야 함', () => {
      const url = 'https://example.com/article';
      const validResponse = `## 제목
What's new in Swift 6.1?

## 주요 내용
이 아티클은 Swift 6.1에 도입된 Concurrency 개선을 소개합니다.

## 요약
- async let이 Sendable이 되었습니다.
- actor 메서드에 isolated default arguments가 지원됩니다.
- Custom performance metrics를 지원합니다.`;

      // @ts-expect-error
      const result: ArticleSummary = service.parseSummary(url, validResponse);

      // then
      expect(result).toBeInstanceOf(ArticleSummary);
      expect(result.url).toBe(url);
      expect(result.title).toBe("What's new in Swift 6.1?");
      expect(result.summary).toBe('이 아티클은 Swift 6.1에 도입된 Concurrency 개선을 소개합니다.');
      expect(result.bullets).toHaveLength(3);
      expect(result.bullets[0]).toBe('async let이 Sendable이 되었습니다.');
      expect(result.bullets[1]).toBe('actor 메서드에 isolated default arguments가 지원됩니다.');
      expect(result.bullets[2]).toBe('Custom performance metrics를 지원합니다.');
    });

    it('제목만 있고 주요 내용이 없으면 SummaryFailedError를 던져야 함', () => {
      // given
      const url = 'https://example.com/article';
      const invalidResponse = `## 제목
What's new in Swift 6.1?

## 요약
- async let이 Sendable이 되었습니다.`;

      expect(() => {
        // @ts-expect-error
        service.parseSummary(url, invalidResponse);
      }).toThrow(SummaryFailedError);
    });

    it('주요 내용만 있고 제목이 없으면 SummaryFailedError를 던져야 함', () => {

      const url = 'https://example.com/article';
      const invalidResponse = `## 주요 내용
이 아티클은 Swift 6.1에 도입된 Concurrency 개선을 소개합니다.

## 요약
- async let이 Sendable이 되었습니다.`;

      expect(() => {
        // @ts-expect-error
        service.parseSummary(url, invalidResponse);
      }).toThrow(SummaryFailedError);
    });

    it('다양한 bullet point 형식(-, *, •)을 정규화해야 함', () => {
      // given
      const url = 'https://example.com/article';
      const responseWithMixedBullets = `## 제목
What's new in Swift 6.1?

## 주요 내용
이 아티클은 Swift 6.1에 도입된 Concurrency 개선을 소개합니다.

## 요약
- async let이 Sendable이 되었습니다.
* actor 메서드에 isolated default arguments가 지원됩니다.
• Custom performance metrics를 지원합니다.`;

      // @ts-expect-error
      const result: ArticleSummary = service.parseSummary(url, responseWithMixedBullets);

      expect(result.bullets).toHaveLength(3);
      expect(result.bullets[0]).toBe('async let이 Sendable이 되었습니다.');
      expect(result.bullets[1]).toBe('actor 메서드에 isolated default arguments가 지원됩니다.');
      expect(result.bullets[2]).toBe('Custom performance metrics를 지원합니다.');
    });
  });
});
