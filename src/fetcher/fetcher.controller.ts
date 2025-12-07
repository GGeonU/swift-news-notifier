import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { FetcherService } from './fetcher.service';
import { Article } from './interfaces';

@Controller('fetcher')
export class FetcherController {
  constructor(private readonly fetcherService: FetcherService) {}

  /**
   * GET /fetcher/check
   * 새로운 아티클을 수집하고 결과 반환
   */
  @Get('check')
  async checkNewArticles(): Promise<{
    success: boolean;
    articlesCount: number;
    articles: Article[];
  }> {
    try {
      const articles = await this.fetcherService.fetchNewArticles();

      return {
        success: true,
        articlesCount: articles.length,
        articles,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch new articles',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /fetcher/process
   * 새로운 아티클을 수집하고 이벤트 발행 (이벤트 기반 아키텍처)
   * 이제 fetchNewArticles()를 호출하면 자동으로 이벤트가 전파되어
   * Summary → Notification까지 처리됩니다.
   */
  // @Get('process')
  // async fetchAndSummarize(): Promise<{
  //   success: boolean;
  //   fetchedCount: number;
  //   message: string;
  // }> {
  //   try {
  //     const articles = await this.fetcherService.fetchNewArticles();

  //     return {
  //       success: true,
  //       fetchedCount: articles.length,
  //       message: `${articles.length}개의 아티클이 발견되었습니다. 이벤트가 발행되어 자동으로 요약 및 알림이 처리됩니다.`,
  //     };
  //   } catch (error) {
  //     throw new HttpException(
  //       error.message || 'Failed to process articles',
  //       HttpStatus.INTERNAL_SERVER_ERROR,
  //     );
  //   }
  // }
}
