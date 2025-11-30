import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotificationService } from './notification.service';
import { ArticleSummarizedEvent } from '../events/article.events';

jest.mock('@slack/web-api');

describe('NotificationService', () => {
  let service: NotificationService;
  const mockPostMessage = jest.fn();

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'SLACK_BOT_TOKEN') return 'test-token';
      if (key === 'SLACK_CHANNEL_ID') return 'test-channel';
      return null;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);

    // Slack WebClient 모킹
    (service as any).slackClient = {
      chat: {
        postMessage: mockPostMessage,
      },
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('constructor', () => {
    it('SLACK_BOT_TOKEN과 SLACK_CHANNEL_ID가 있으면 Slack client를 초기화해야 합니다', () => {
      expect((service as any).slackClient).toBeDefined();
      expect((service as any).slackChannelId).toBe('test-channel');
    });

    it('SLACK_BOT_TOKEN이 없으면 경고 로그를 출력하고 client를 null로 설정해야 합니다', () => {
      const mockConfigWithoutToken = {
        get: jest.fn(() => null),
      };

      const serviceWithoutToken = new NotificationService(
        mockConfigWithoutToken as any,
      );

      expect((serviceWithoutToken as any).slackClient).toBeNull();
    });
  });

  describe('sendToSlack', () => {
    it('단일 아티클 알림을 Slack으로 전송해야 합니다', async () => {
      const article = {
        title: 'Test Article',
        url: 'https://example.com/test',
        summary: '• 테스트 요약 1\n• 테스트 요약 2',
        translation: '테스트 번역 내용',
      };

      mockPostMessage.mockResolvedValue({ ok: true });

      await service.sendToSlack(article);

      expect(mockPostMessage).toHaveBeenCalledTimes(1);
      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'test-channel',
          text: `📰 ${article.title}`,
          blocks: expect.any(Array),
          mrkdwn: true,
        }),
      );
    });

    it('Slack client가 설정되지 않았으면 전송을 스킵해야 합니다', async () => {
      (service as any).slackClient = null;

      const loggerWarnSpy = jest.spyOn((service as any).logger, 'warn');

      const article = {
        title: 'Test Article',
        url: 'https://example.com/test',
        summary: '테스트 요약',
      };

      await service.sendToSlack(article);

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Slack client not configured'),
      );
      expect(mockPostMessage).not.toHaveBeenCalled();
    });

    it('Slack API 호출 실패 시 에러를 던져야 합니다', async () => {
      const article = {
        title: 'Test Article',
        url: 'https://example.com/test',
        summary: '테스트 요약',
      };

      const mockError = new Error('Slack API error');
      mockPostMessage.mockRejectedValue(mockError);

      await expect(service.sendToSlack(article)).rejects.toThrow(
        'Slack 알림 전송 실패',
      );
    });

    it('메시지 블록에 헤더, 본문, 링크, 구분선이 포함되어야 합니다', async () => {
      const article = {
        title: 'Test Article',
        url: 'https://example.com/test',
        summary: '테스트 요약',
      };

      mockPostMessage.mockResolvedValue({ ok: true });

      await service.sendToSlack(article);

      const blocks = mockPostMessage.mock.calls[0][0].blocks;
      expect(blocks).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'header' }),
          expect.objectContaining({ type: 'section' }),
          expect.objectContaining({ type: 'divider' }),
        ]),
      );
    });
  });

  describe('sendMultipleToSlack', () => {
    it('여러 아티클을 순차적으로 전송해야 합니다', async () => {
      const articles = [
        { title: 'Article 1', url: 'https://example.com/1', summary: '요약 1' },
        { title: 'Article 2', url: 'https://example.com/2', summary: '요약 2' },
        { title: 'Article 3', url: 'https://example.com/3', summary: '요약 3' },
      ];

      mockPostMessage.mockResolvedValue({ ok: true });

      await service.sendMultipleToSlack(articles);

      expect(mockPostMessage).toHaveBeenCalledTimes(3);
    });

    it('빈 배열이 전달되면 아무것도 전송하지 않아야 합니다', async () => {
      await service.sendMultipleToSlack([]);

      expect(mockPostMessage).not.toHaveBeenCalled();
    });

    it('일부 전송 실패 시에도 나머지는 계속 전송되어야 합니다', async () => {
      const articles = [
        { title: 'Article 1', url: 'https://example.com/1', summary: '요약 1' },
        { title: 'Article 2', url: 'https://example.com/2', summary: '요약 2' },
        { title: 'Article 3', url: 'https://example.com/3', summary: '요약 3' },
      ];

      mockPostMessage
        .mockResolvedValueOnce({ ok: true })
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce({ ok: true });

      await service.sendMultipleToSlack(articles);

      expect(mockPostMessage).toHaveBeenCalledTimes(3);
    });
  });

  describe('handleArticleSummarized', () => {
    it('article.summarized 이벤트를 받아 Slack으로 전송해야 합니다', async () => {
      const event = new ArticleSummarizedEvent(
        'Test Article',
        'https://example.com/test',
        '테스트 번역',
        '테스트 요약',
      );

      mockPostMessage.mockResolvedValue({ ok: true });

      await service.handleArticleSummarized(event);

      expect(mockPostMessage).toHaveBeenCalledTimes(1);
      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          text: '📰 Test Article',
        }),
      );
    });

    it('전송 실패 시 에러를 로깅하지만 다른 알림은 계속되어야 합니다', async () => {
      const event = new ArticleSummarizedEvent(
        'Failed Article',
        'https://example.com/failed',
        '번역',
        '요약',
      );

      const mockError = new Error('Slack error');
      mockPostMessage.mockRejectedValue(mockError);

      const loggerSpy = jest.spyOn((service as any).logger, 'error');

      await service.handleArticleSummarized(event);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send Slack notification'),
      );
    });
  });

  describe('convertToSlackMarkdown', () => {
    it('마크다운 헤더를 Slack 형식으로 변환해야 합니다', () => {
      const text = '## 요약\n내용';
      const result = (service as any).convertToSlackMarkdown(text);
      expect(result).toContain('*📝 요약*');
    });

    it('불렛 포인트를 변환해야 합니다', () => {
      const text = '- 항목 1\n* 항목 2';
      const result = (service as any).convertToSlackMarkdown(text);
      expect(result).toContain('• 항목 1');
      expect(result).toContain('• 항목 2');
    });

    it('링크를 Slack 형식으로 변환해야 합니다', () => {
      const text = '[링크 텍스트](https://example.com)';
      const result = (service as any).convertToSlackMarkdown(text);
      expect(result).toBe('<https://example.com|링크 텍스트>');
    });

    it('볼드 텍스트를 변환해야 합니다', () => {
      const text = '**볼드 텍스트**';
      const result = (service as any).convertToSlackMarkdown(text);
      expect(result).toBe('*볼드 텍스트*');
    });

    it('인라인 코드를 유지해야 합니다', () => {
      const text = '`코드`';
      const result = (service as any).convertToSlackMarkdown(text);
      expect(result).toBe('`코드`');
    });

    it('코드 블록을 유지해야 합니다', () => {
      const text = '```swift\nlet x = 1\n```';
      const result = (service as any).convertToSlackMarkdown(text);
      expect(result).toContain('```');
      expect(result).toContain('let x = 1');
    });
  });

  describe('splitTextIntoChunks', () => {
    it('짧은 텍스트는 그대로 반환해야 합니다', () => {
      const text = '짧은 텍스트';
      const result = (service as any).splitTextIntoChunks(text, 100);
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(text);
    });

    it('긴 텍스트를 여러 청크로 분할해야 합니다', () => {
      const text = 'A'.repeat(150);
      const result = (service as any).splitTextIntoChunks(text, 50);
      expect(result.length).toBeGreaterThan(1);
    });

    it('줄 단위로 분할해야 합니다', () => {
      const text = '첫 번째 줄\n'.repeat(10);
      const result = (service as any).splitTextIntoChunks(text, 50);
      expect(result.length).toBeGreaterThan(1);
      result.forEach((chunk: string) => {
        expect(chunk.length).toBeLessThanOrEqual(50);
      });
    });

    it('한 줄이 너무 길면 강제로 잘라야 합니다', () => {
      const text = 'A'.repeat(100);
      const result = (service as any).splitTextIntoChunks(text, 50);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toContain('...');
    });
  });

  describe('formatSlackMessage', () => {
    it('번역과 요약이 모두 있으면 두 섹션을 포함해야 합니다', () => {
      const article = {
        title: 'Test Article',
        url: 'https://example.com/test',
        translation: '번역 내용',
        summary: '요약 내용',
      };

      const blocks = (service as any).formatSlackMessage(article);

      const sectionBlocks = blocks.filter(
        (block: any) => block.type === 'section',
      );
      expect(sectionBlocks.length).toBeGreaterThanOrEqual(2);
    });

    it('번역이 없으면 요약만 포함해야 합니다', () => {
      const article = {
        title: 'Test Article',
        url: 'https://example.com/test',
        summary: '요약 내용',
      };

      const blocks = (service as any).formatSlackMessage(article);

      expect(blocks).toContainEqual(
        expect.objectContaining({
          type: 'section',
          text: expect.objectContaining({
            text: expect.stringContaining('요약'),
          }),
        }),
      );
    });

    it('메시지에 헤더가 포함되어야 합니다', () => {
      const article = {
        title: 'Test Article',
        url: 'https://example.com/test',
        summary: '요약',
      };

      const blocks = (service as any).formatSlackMessage(article);

      expect(blocks[0]).toMatchObject({
        type: 'header',
        text: expect.objectContaining({
          text: '📰 Test Article',
        }),
      });
    });

    it('메시지에 원문 링크가 포함되어야 합니다', () => {
      const article = {
        title: 'Test Article',
        url: 'https://example.com/test',
        summary: '요약',
      };

      const blocks = (service as any).formatSlackMessage(article);

      expect(blocks).toContainEqual(
        expect.objectContaining({
          type: 'section',
          text: expect.objectContaining({
            text: expect.stringContaining(article.url),
          }),
        }),
      );
    });

    it('메시지에 구분선이 포함되어야 합니다', () => {
      const article = {
        title: 'Test Article',
        url: 'https://example.com/test',
        summary: '요약',
      };

      const blocks = (service as any).formatSlackMessage(article);

      expect(blocks).toContainEqual({ type: 'divider' });
    });

    it('긴 텍스트는 여러 섹션으로 분할되어야 합니다', () => {
      const longSummary = 'A'.repeat(3000);
      const article = {
        title: 'Test Article',
        url: 'https://example.com/test',
        summary: longSummary,
      };

      const blocks = (service as any).formatSlackMessage(article);

      const sectionBlocks = blocks.filter(
        (block: any) => block.type === 'section',
      );
      expect(sectionBlocks.length).toBeGreaterThan(1);
    });
  });
});
