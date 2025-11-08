import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { SummaryController } from './summary.controller';
import { SummaryService } from './summary.service';
import { TranslateRequestDto } from './dto/translate.dto';

describe('SummaryController', () => {
  let controller: SummaryController;
  let service: SummaryService;

  const mockSummaryService = {
    processArticle: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SummaryController],
      providers: [
        {
          provide: SummaryService,
          useValue: mockSummaryService,
        },
      ],
    }).compile();

    controller = module.get<SummaryController>(SummaryController);
    service = module.get<SummaryService>(SummaryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('translate', () => {
    it('should return translation and summary successfully', async () => {
      const mockRequest: TranslateRequestDto = {
        url: 'https://example.com/article',
      };

      const mockResult = {
        originalUrl: mockRequest.url,
        translation: '번역된 내용입니다.',
        summary: '요약된 내용입니다.',
      };

      mockSummaryService.processArticle.mockResolvedValue(mockResult);

      const result = await controller.translate(mockRequest);

      expect(result).toEqual(mockResult);
      expect(mockSummaryService.processArticle).toHaveBeenCalledWith(
        mockRequest.url,
      );
      expect(mockSummaryService.processArticle).toHaveBeenCalledTimes(1);
    });

    it('should throw BAD_REQUEST when url is missing', async () => {
      const mockRequest = { url: '' } as TranslateRequestDto;

      await expect(controller.translate(mockRequest)).rejects.toThrow(
        new HttpException(
          'URL is required in request body',
          HttpStatus.BAD_REQUEST,
        ),
      );

      expect(mockSummaryService.processArticle).not.toHaveBeenCalled();
    });

    it('should throw INTERNAL_SERVER_ERROR when service fails', async () => {
      const mockRequest: TranslateRequestDto = {
        url: 'https://example.com/article',
      };

      const mockError = new Error('Service Error');
      mockSummaryService.processArticle.mockRejectedValue(mockError);

      await expect(controller.translate(mockRequest)).rejects.toThrow(
        new HttpException(
          'Service Error',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });

    it('should handle unknown errors', async () => {
      const mockRequest: TranslateRequestDto = {
        url: 'https://example.com/article',
      };

      mockSummaryService.processArticle.mockRejectedValue('Unknown Error');

      await expect(controller.translate(mockRequest)).rejects.toThrow(
        new HttpException(
          'Failed to process article',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });
  });
});
