import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotificationService } from './notification.service';
import { ArticleSummary } from '../shared/article-summary';
import { Block, KnownBlock } from '@slack/web-api';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'SLACK_BOT_TOKEN') return 'test-token';
              if (key === 'SLACK_CHANNEL_ID') return 'test-channel';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  describe('buildArticleSummaryBlocks', () => {
    it('올바른 Block 구조를 반환해야 함', () => {
      // given
      const article = new ArticleSummary(
        'https://example.com/article',
        'Test Article Title',
        '이것은 테스트 요약입니다.',
        ['첫 번째 포인트', '두 번째 포인트', '세 번째 포인트']
      );

      // @ts-expect-error
      const blocks: (Block | KnownBlock)[] = service.buildArticleSummaryBlocks(article);

      // then
      expect(blocks).toHaveLength(5); // header + section(요약) + section(요약 Bullet points) + section(링크) + divider

      // Header 블록 검증
      expect(blocks[0]).toEqual({
        type: 'header',
        text: {
          type: 'plain_text',
          text: '📰 Test Article Title',
          emoji: true,
        },
      });

      // 요약 Section 블록 검증
      expect(blocks[1]).toMatchObject({
        type: 'section',
        text: {
          type: 'mrkdwn',
        },
      });

      // 요약 Bullet points Section 블록 검증
      expect(blocks[2]).toMatchObject({
        type: 'section',
        text: {
          type: 'mrkdwn',
        },
      });

      // 링크 Section 블록 검증
      expect(blocks[3]).toEqual({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '<https://example.com/article|🔗 원문 링크 보기>',
        },
      });

      // Divider 블록 검증
      expect(blocks[4]).toEqual({
        type: 'divider',
      });
    });
  });

  describe('buildErrorMessageBlocks', () => {
    it('올바른 에러 Block 구조를 반환해야 함', () => {
      // given
      const url = 'https://example.com/failed-article';
      const errorMessage = '아티클을 가져올 수 없습니다.';

      // @ts-expect-error
      const blocks: (Block | KnownBlock)[] = service.buildErrorMessageBlocks(url, errorMessage);

      // then
      expect(blocks).toHaveLength(4); // header + section(error) + section(url) + divider

      // Header 블록 검증
      expect(blocks[0]).toEqual({
        type: 'header',
        text: {
          type: 'plain_text',
          text: '❌ 아티클 요약 실패',
          emoji: true,
        },
      });

      // 에러 메시지 Section 블록 검증
      expect(blocks[1]).toEqual({
        type: 'section',
        text: {
          type: 'plain_text',
          text: errorMessage,
        },
      });

      // URL Section 블록 검증
      expect(blocks[2]).toEqual({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*URL:*\n${url}`,
        },
      });

      // Divider 블록 검증
      expect(blocks[3]).toEqual({
        type: 'divider',
      });
    });
  });
});
