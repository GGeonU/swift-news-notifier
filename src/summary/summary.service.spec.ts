import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SummaryService } from './summary.service';
import {
  ArticleFetchedEvent,
  ARTICLE_EVENTS,
} from '../events/article.events';

describe('SummaryService', () => {
  let service: SummaryService;
  const mockGenerateContent = jest.fn();

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'GEMINI_API_KEY') {
        return 'test-api-key';
      }
      return null;
    }),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SummaryService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<SummaryService>(SummaryService);

    // generativeModel.generateContent 모킹
    (service as any).generativeModel = {
      generateContent: mockGenerateContent,
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('constructor', () => {
    it('GEMINI_API_KEY가 없으면 에러를 던져야 합니다', () => {
      const mockConfigServiceWithoutKey = {
        get: jest.fn(() => null),
      };

      expect(() => {
        new SummaryService(
          mockConfigServiceWithoutKey as any,
          mockEventEmitter as any,
        );
      }).toThrow('GEMINI_API_KEY is not defined in .env');
    });
  });

  describe('processArticle', () => {
    it('아티클을 정상적으로 처리하고 번역/요약을 반환해야 합니다', async () => {
      const mockUrl = 'https://example.com/article';
      const mockResponse = `
## 주요 내용
이 아티클은 Swift Concurrency에 관한 내용입니다.

## 요약
- async/await 패턴 소개
- Task와 TaskGroup 활용법
- Actor를 통한 thread-safe 코드 작성
      `;

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => mockResponse,
        },
      });

      const result = await service.processArticle(mockUrl);

      expect(result).toMatchObject({
        originalUrl: mockUrl,
        translation: expect.stringContaining('Swift Concurrency'),
        summary: expect.stringContaining('async/await'),
      });
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.stringContaining(mockUrl),
      );
    });

    it('주요 내용 섹션이 없으면 빈 문자열을 반환해야 합니다', async () => {
      const mockUrl = 'https://example.com/article';
      const mockResponse = `
## 요약
- 핵심 포인트 1
- 핵심 포인트 2
      `;

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => mockResponse,
        },
      });

      const result = await service.processArticle(mockUrl);

      expect(result.translation).toBe('');
      expect(result.summary).toContain('핵심 포인트');
    });

    it('요약 섹션이 없으면 전체 응답을 summary로 사용해야 합니다', async () => {
      const mockUrl = 'https://example.com/article';
      const mockResponse = '전체 응답 텍스트';

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => mockResponse,
        },
      });

      const result = await service.processArticle(mockUrl);

      expect(result.summary).toBe(mockResponse);
    });

    it('API 호출 실패 시 에러를 던져야 합니다', async () => {
      const mockUrl = 'https://example.com/article';
      const mockError = new Error('API Error');

      mockGenerateContent.mockRejectedValue(mockError);

      await expect(service.processArticle(mockUrl)).rejects.toThrow(
        '아티클 처리 실패: API Error',
      );
    });
  });

  describe('handleArticleFetched', () => {
    it('article.fetched 이벤트를 받아 처리하고 article.summarized 이벤트를 발행해야 합니다', async () => {
      const mockEvent = new ArticleFetchedEvent(
        'Test Article',
        'https://example.com/test',
      );
      const mockResponse = `
## 주요 내용
테스트 아티클 내용

## 요약
- 테스트 포인트 1
- 테스트 포인트 2
      `;

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => mockResponse,
        },
      });

      await service.handleArticleFetched(mockEvent);

      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
      expect(mockEventEmitter.emit).toHaveBeenCalledTimes(1);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        ARTICLE_EVENTS.SUMMARIZED,
        expect.objectContaining({
          title: 'Test Article',
          url: 'https://example.com/test',
          translation: expect.stringContaining('테스트 아티클'),
          summary: expect.stringContaining('테스트 포인트'),
        }),
      );
    });

    it('처리 실패 시 에러를 로깅하지만 다른 아티클 처리는 계속되어야 합니다', async () => {
      const mockEvent = new ArticleFetchedEvent(
        'Failed Article',
        'https://example.com/failed',
      );
      const mockError = new Error('Processing failed');

      mockGenerateContent.mockRejectedValue(mockError);

      const loggerSpy = jest.spyOn((service as any).logger, 'error');

      await service.handleArticleFetched(mockEvent);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to process article'),
      );
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('여러 아티클을 순차적으로 처리할 수 있어야 합니다', async () => {
      const mockEvents = [
        new ArticleFetchedEvent('Article 1', 'https://example.com/1'),
        new ArticleFetchedEvent('Article 2', 'https://example.com/2'),
        new ArticleFetchedEvent('Article 3', 'https://example.com/3'),
      ];

      const mockResponse = `
## 주요 내용
테스트 내용

## 요약
- 포인트 1
      `;

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => mockResponse,
        },
      });

      for (const event of mockEvents) {
        await service.handleArticleFetched(event);
      }

      expect(mockGenerateContent).toHaveBeenCalledTimes(3);
      expect(mockEventEmitter.emit).toHaveBeenCalledTimes(3);
    });
  });

  describe('prompt structure', () => {
    it('프롬프트에 URL이 포함되어야 합니다', async () => {
      const mockUrl = 'https://example.com/swift-article';
      const mockResponse = '## 주요 내용\n내용\n\n## 요약\n- 요약';

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => mockResponse,
        },
      });

      await service.processArticle(mockUrl);

      const callArg = mockGenerateContent.mock.calls[0][0];
      expect(callArg).toContain(mockUrl);
      expect(callArg).toContain('**URL:**');
    });

    it('프롬프트에 출력 형식 지시사항이 포함되어야 합니다', async () => {
      const mockUrl = 'https://example.com/article';
      const mockResponse = '## 주요 내용\n내용\n\n## 요약\n- 요약';

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => mockResponse,
        },
      });

      await service.processArticle(mockUrl);

      const callArg = mockGenerateContent.mock.calls[0][0];
      expect(callArg).toContain('## 주요 내용');
      expect(callArg).toContain('## 요약');
      expect(callArg).toContain('출력 형식');
    });
  });
});
