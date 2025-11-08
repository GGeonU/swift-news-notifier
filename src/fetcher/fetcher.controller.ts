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
   * GET /fetcher/latest-commit
   * 최신 commit SHA 조회 (테스트용)
   */
  @Get('latest-commit')
  async getLatestCommit(): Promise<{ sha: string }> {
    try {
      const sha = await this.fetcherService.getLatestCommitSha();
      return { sha };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch latest commit',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
