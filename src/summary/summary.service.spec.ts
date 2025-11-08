import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SummaryService } from './summary.service';

describe('SummaryService', () => {
  let service: SummaryService;
  let configService: ConfigService;

  // 모킹된 Gemini API 응답
  const mockGenerateContent = jest.fn();

  beforeEach(async () => {
    // ConfigService 모킹
    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'GEMINI_API_KEY') {
          return 'test-api-key';
        }
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SummaryService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<SummaryService>(SummaryService);
    configService = module.get<ConfigService>(ConfigService);

    // generativeModel.generateContent 모킹
    // @ts-ignore - private 필드 접근을 위한 우회
    service['generativeModel'] = {
      generateContent: mockGenerateContent,
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('translateWebPage', () => {
    it('should translate web page successfully', async () => {
      const mockUrl = 'https://example.com/article';
      const mockTranslation = '이것은 번역된 텍스트입니다.';

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => mockTranslation,
        },
      });

      const result = await service.translateWebPage(mockUrl);

      expect(result).toBe(mockTranslation);
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.stringContaining(mockUrl),
      );
    });

    it('should throw error when translation fails', async () => {
      const mockUrl = 'https://example.com/article';
      const mockError = new Error('API Error');

      mockGenerateContent.mockRejectedValue(mockError);

      await expect(service.translateWebPage(mockUrl)).rejects.toThrow(
        '번역 실패: API Error',
      );
    });
  });

  describe('summarizeWebPage', () => {
    it('should summarize web page successfully', async () => {
      const mockUrl = 'https://example.com/article';
      const mockSummary = '이것은 요약된 텍스트입니다.';

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => mockSummary,
        },
      });

      const result = await service.summarizeWebPage(mockUrl);

      expect(result).toBe(mockSummary);
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.stringContaining(mockUrl),
      );
    });

    it('should throw error when summarization fails', async () => {
      const mockUrl = 'https://example.com/article';
      const mockError = new Error('API Error');

      mockGenerateContent.mockRejectedValue(mockError);

      await expect(service.summarizeWebPage(mockUrl)).rejects.toThrow(
        '요약 실패: API Error',
      );
    });
  });

  describe('processArticle', () => {
    it('should process article with translation and summary', async () => {
      const mockUrl = 'https://example.com/article';
      const mockTranslation = '번역된 내용';
      const mockSummary = '요약된 내용';

      mockGenerateContent
        .mockResolvedValueOnce({
          response: { text: () => mockTranslation },
        })
        .mockResolvedValueOnce({
          response: { text: () => mockSummary },
        });

      const result = await service.processArticle(mockUrl);

      expect(result).toEqual({
        originalUrl: mockUrl,
        translation: mockTranslation,
        summary: mockSummary,
      });
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    it('should handle errors during article processing', async () => {
      const mockUrl = 'https://example.com/article';
      const mockError = new Error('Processing Error');

      mockGenerateContent.mockRejectedValue(mockError);

      await expect(service.processArticle(mockUrl)).rejects.toThrow();
    });
  });

  describe('constructor', () => {
    it('should throw error when GEMINI_API_KEY is not defined', () => {
      const mockConfigServiceWithoutKey = {
        get: jest.fn(() => null),
      };

      expect(() => {
        new SummaryService(mockConfigServiceWithoutKey as any);
      }).toThrow('GEMINI_API_KEY is not defined in .env');
    });
  });
});
