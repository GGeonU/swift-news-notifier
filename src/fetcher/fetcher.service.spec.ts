import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FetcherService } from './fetcher.service';
import { Article } from './interfaces';

describe('FetcherService', () => {
  let service: FetcherService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FetcherService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config: Record<string, any> = {
                GITHUB_TOKEN: 'test-token',
                GITHUB_REPO_OWNER: 'SAllen0400',
                GITHUB_REPO_NAME: 'swift-news',
                GITHUB_REPO_BRANCH: 'main',
                FETCHER_STATE_FILE_PATH: './data/fetcher-state.json',
              };
              return config[key] ?? defaultValue;
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

    service = module.get<FetcherService>(FetcherService);
  });

  describe('parseNewArticlesFromDiff', () => {
    it('Markdown 링크를 올바르게 파싱해야 함', () => {
      // given
      const diff = `+# December 2, 2025
+[Swift News - YouTube Video](https://youtu.be/YCRvVfDGQuY)
+
+[Swift SDK for Android](https://www.swift.org/blog/nightly-swift-sdk-for-android/)
+[Shipaton 2025 Winners](https://www.revenuecat.com/blog/company/shipaton-2025-winners/)
+[RevenueCat App Growth Anual YouTube](https://www.youtube.com/playlist?list=PLsFOrkX_y0B6o8zs8PUOWQbUi_nTQn_uD)
+[SwiftUI Scroll Performance: The 120FPS Challenge](https://blog.jacobstechtavern.com/p/swiftui-scroll-performance-the-120fps)
+[Foundation Models Framework Q&A](https://antongubarenko.substack.com/p/ios-26-foundation-model-framework-f6d)
+[Foundation Models Framework Code Along](https://www.youtube.com/watch?v=S5F196tqRMI)
+[iPhone 17 Screen Sizes](https://useyourloaf.com/blog/iphone-17-screen-sizes/)
+[Text Concatenation vs Text Interpolation](https://nilcoalescing.com/blog/TextConcatenationVsTextInterpolationInSwiftUI/)`;

      const articles: Article[] = service.parseNewArticlesFromDiff(diff);

      // YouTube 링크 3개 제외, 일반 아티클 6개만 포함되어야 함
      expect(articles).toHaveLength(6);

      expect(articles[0]).toEqual({
        title: 'Swift SDK for Android',
        url: 'https://www.swift.org/blog/nightly-swift-sdk-for-android/',
        discoveredAt: expect.any(Date),
      });

      expect(articles[5]).toEqual({
        title: 'Text Concatenation vs Text Interpolation',
        url: 'https://nilcoalescing.com/blog/TextConcatenationVsTextInterpolationInSwiftUI/',
        discoveredAt: expect.any(Date),
      });
    });

    it('YouTube 링크는 제외해야 함', () => {
      const diff = `+[Swift News - YouTube Video](https://youtu.be/YCRvVfDGQuY)
+[RevenueCat App Growth Anual YouTube](https://www.youtube.com/playlist?list=PLsFOrkX_y0B6o8zs8PUOWQbUi_nTQn_uD)
+[Foundation Models Framework Code Along](https://www.youtube.com/watch?v=S5F196tqRMI)`;
      const articles: Article[] = service.parseNewArticlesFromDiff(diff);
      expect(articles).toHaveLength(0);
    });

    it('빈 diff는 빈 배열을 반환해야 함', () => {
      const diff = '';
      const articles: Article[] = service.parseNewArticlesFromDiff(diff);
      expect(articles).toHaveLength(0);
    });
  });
});
