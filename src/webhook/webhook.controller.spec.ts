import { Test, TestingModule } from '@nestjs/testing';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { SlackCommandRequest } from './dto/slack-command-request.dto';
import { SlackCommandResponse } from './dto/slack-command-response.dto';

describe('WebhookController', () => {
  let controller: WebhookController;
  let webhookService: WebhookService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhookController],
      providers: [
        {
          provide: WebhookService,
          useValue: {
            requestCheckArticles: jest.fn(),
            requestSummarizeArticle: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<WebhookController>(WebhookController);
    webhookService = module.get<WebhookService>(WebhookService);
  });

  describe('slackCheckArticles', () => {
    it('텍스트가 없으면 정상적으로 처리해야 함 (undefined)', async () => {
      // given
      const body: SlackCommandRequest = {
        user_id: 'U123456',
        user_name: 'testuser',
        text: undefined,
      };

      // when
      const result: SlackCommandResponse = await controller.slackCheckArticles(body);

      // then
      expect(result.response_type).toBe('in_channel');
      expect(result.text).toContain('새로 업데이트된 아티클이 있는지 확인하고 있습니다');
    });

    it('텍스트가 빈 문자열이면 정상적으로 처리해야 함', async () => {
      // given
      const body: SlackCommandRequest = {
        user_id: 'U123456',
        user_name: 'testuser',
        text: '',
      };

      // when
      const result: SlackCommandResponse = await controller.slackCheckArticles(body);

      // then
      expect(result.response_type).toBe('in_channel');
      expect(result.text).toContain('새로 업데이트된 아티클이 있는지 확인하고 있습니다');
    });

    it('텍스트가 공백만 있으면 정상적으로 처리해야 함', async () => {
      // given
      const body: SlackCommandRequest = {
        user_id: 'U123456',
        user_name: 'testuser',
        text: '   ',
      };

      // when
      const result: SlackCommandResponse = await controller.slackCheckArticles(body);

      // then
      expect(result.response_type).toBe('in_channel');
      expect(result.text).toContain('새로 업데이트된 아티클이 있는지 확인하고 있습니다');
    });

    it('텍스트가 입력되면 안내 메시지를 반환해야 함', async () => {
      // given
      const body: SlackCommandRequest = {
        user_id: 'U123456',
        user_name: 'testuser',
        text: 'some text',
      };

      // when
      const result: SlackCommandResponse = await controller.slackCheckArticles(body);

      // then
      expect(result.response_type).toBe('ephemeral');
      expect(result.text).toContain('커맨드 뒤에 입력된 텍스트가 있습니다');
    });

    it('WebhookService의 requestCheckArticles를 호출해야 함', async () => {
      // given
      const body: SlackCommandRequest = {
        user_id: 'U123456',
        user_name: 'testuser',
        text: undefined,
      };

      // when
      await controller.slackCheckArticles(body);

      // setImmediate는 비동기이므로 약간의 대기 필요
      await new Promise((resolve) => setImmediate(resolve));

      // then
      expect(webhookService.requestCheckArticles).toHaveBeenCalledWith('testuser');
    });
  });

  describe('slackSummarizeArticle', () => {
    it('유효한 URL이 입력되면 정상적으로 처리해야 함', async () => {
      // given
      const body: SlackCommandRequest = {
        user_id: 'U123456',
        user_name: 'testuser',
        text: 'https://example.com/article',
      };
      const result: SlackCommandResponse = await controller.slackSummarizeArticle(body);
      expect(result.response_type).toBe('in_channel');
      expect(result.text).toContain('아티클을 분석하고 있습니다');
    });

    it('URL이 비어있으면 에러 메시지를 반환해야 함', async () => {
      const body: SlackCommandRequest = {
        user_id: 'U123456',
        user_name: 'testuser',
        text: undefined,
      };
      const result: SlackCommandResponse = await controller.slackSummarizeArticle(body);
      expect(result.response_type).toBe('ephemeral');
      expect(result.text).toContain('커맨드 뒤에 요약할 아티클의 URL을 입력해주세요');
    });

    it('URL이 공백이면 에러 메시지를 반환해야 함', async () => {
      // given
      const body: SlackCommandRequest = {
        user_id: 'U123456',
        user_name: 'testuser',
        text: '   ',
      };
      const result: SlackCommandResponse = await controller.slackSummarizeArticle(body);
      expect(result.response_type).toBe('ephemeral');
      expect(result.text).toContain('커맨드 뒤에 요약할 아티클의 URL을 입력해주세요');
    });

    it('유효하지 않은 URL이 입력되면 에러 메시지를 반환해야 함', async () => {
      // given
      const body: SlackCommandRequest = {
        user_id: 'U123456',
        user_name: 'testuser',
        text: 'not-a-valid-url',
      };
      const result: SlackCommandResponse = await controller.slackSummarizeArticle(body);
      expect(result.response_type).toBe('ephemeral');
      expect(result.text).toContain('유효하지 않은 URL입니다');
    });
  });
});
