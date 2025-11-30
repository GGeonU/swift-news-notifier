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

  /**
   * GET /fetcher/process
   * 새로운 아티클을 수집하고 AI로 번역/요약까지 완료
   */
  @Get('process')
  async fetchAndSummarize(): Promise<{
    success: boolean;
    processedCount: number;
    results: Array<{
      article: Article;
      originalUrl: string;
      translation: string;
      summary: string;
    }>;
  }> {
    try {
      const results = await this.fetcherService.fetchAndSummarizeArticles();

      return {
        success: true,
        processedCount: results.length,
        results,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to process articles',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /fetcher/run
   * 전체 파이프라인 실행: 수집 → 번역/요약 → Slack 알림
   */
  @Get('run')
  async runFullPipeline(): Promise<{
    success: boolean;
    fetchedCount: number;
    processedCount: number;
    notifiedCount: number;
  }> {
    try {
      const result = await this.fetcherService.fetchSummarizeAndNotify();

      return {
        success: true,
        ...result,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to run full pipeline',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
