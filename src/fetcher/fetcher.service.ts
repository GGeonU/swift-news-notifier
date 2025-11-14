import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Article, FetcherState } from './interfaces';
import { SummaryService } from '../summary/summary.service';

@Injectable()
export class FetcherService {
  private readonly logger = new Logger(FetcherService.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly stateFilePath: string;

  // GitHub Repository 정보
  private readonly GITHUB_OWNER = 'SAllen0400';
  private readonly GITHUB_REPO = 'swift-news';
  private readonly GITHUB_BRANCH = 'main';

  constructor(
    private configService: ConfigService,
    private summaryService: SummaryService,
  ) {
    const githubToken = this.configService.get<string>('GITHUB_TOKEN');

    this.axiosInstance = axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        Accept: 'application/vnd.github.v3+json',
        ...(githubToken && { Authorization: `token ${githubToken}` }),
      },
    });

    // 상태 파일 경로 설정
    this.stateFilePath = path.join(process.cwd(), 'data', 'fetcher-state.json');
  }

  /**
   * 최신 commit SHA 가져오기
   */
  async getLatestCommitSha(): Promise<string> {
    try {
      const url = `/repos/${this.GITHUB_OWNER}/${this.GITHUB_REPO}/commits/${this.GITHUB_BRANCH}`;
      this.logger.log(`Fetching latest commit SHA from: ${url}`);

      const response = await this.axiosInstance.get(url);
      return response.data.sha;
    } catch (error) {
      this.logger.error(`Failed to fetch latest commit SHA: ${error.message}`);
      throw new Error(`GitHub API 호출 실패: ${error.message}`);
    }
  }

  /**
   * 두 commit 간의 diff 가져오기
   */
  async getCommitDiff(baseSha: string, headSha: string): Promise<string> {
    try {
      const url = `/repos/${this.GITHUB_OWNER}/${this.GITHUB_REPO}/compare/${baseSha}...${headSha}`;
      this.logger.log(`Fetching diff: ${baseSha}...${headSha}`);

      const response = await this.axiosInstance.get(url, {
        headers: {
          Accept: 'application/vnd.github.diff', // diff 형식으로 받기
        },
      });

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch commit diff: ${error.message}`);
      throw new Error(`Diff 가져오기 실패: ${error.message}`);
    }
  }

  /**
   * Diff에서 추가된 아티클 링크만 추출
   */
  parseNewArticlesFromDiff(diff: string): Article[] {
    const addedLines = diff
      .split('\n')
      .filter((line) => line.startsWith('+')); // '+' = 추가된 라인

    const articles: Article[] = [];
    const linkRegex = /\[(.+?)\]\((.+?)\)/g; // [Title](URL) 패턴

    for (const line of addedLines) {
      let match: RegExpExecArray | null;
      while ((match = linkRegex.exec(line)) !== null) {
        const [, title, url] = match;

        // YouTube 링크는 제외 (아티클만 필요)
        if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
          articles.push({
            title,
            url,
            discoveredAt: new Date(),
            source: 'github',
          });
        }
      }
    }

    this.logger.log(`Parsed ${articles.length} new articles from diff`);
    return articles;
  }

  /**
   * 저장된 상태 불러오기
   */
  async loadState(): Promise<FetcherState | null> {
    try {
      const data = await fs.readFile(this.stateFilePath, 'utf-8');
      const state = JSON.parse(data);

      // Date 객체로 변환
      state.lastCheckedAt = new Date(state.lastCheckedAt);

      this.logger.log(`Loaded state: last SHA = ${state.lastProcessedCommitSha}`);
      return state;
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.logger.log('No existing state found. This is the first run.');
        return null;
      }
      this.logger.error(`Failed to load state: ${error.message}`);
      throw error;
    }
  }

  /**
   * 상태 저장하기
   */
  async saveState(state: FetcherState): Promise<void> {
    try {
      // data 디렉토리가 없으면 생성
      const dataDir = path.dirname(this.stateFilePath);
      await fs.mkdir(dataDir, { recursive: true });

      await fs.writeFile(
        this.stateFilePath,
        JSON.stringify(state, null, 2),
        'utf-8',
      );

      this.logger.log(`State saved: SHA = ${state.lastProcessedCommitSha}`);
    } catch (error) {
      this.logger.error(`Failed to save state: ${error.message}`);
      throw error;
    }
  }

  /**
   * 새로운 아티클 수집 (메인 로직)
   */
  async fetchNewArticles(): Promise<Article[]> {
    this.logger.log('Starting to fetch new articles...');

    // 1. 최신 commit SHA 가져오기
    const latestSha = await this.getLatestCommitSha();

    // 2. 저장된 상태 불러오기
    const state = await this.loadState();

    // 첫 실행이면 현재 SHA만 저장하고 종료
    if (!state) {
      this.logger.log('First run detected. Saving current state...');
      await this.saveState({
        lastProcessedCommitSha: latestSha,
        lastCheckedAt: new Date(),
        totalArticlesProcessed: 0,
      });
      return [];
    }

    // 3. 변경사항이 있는지 확인
    if (state.lastProcessedCommitSha === latestSha) {
      this.logger.log('No new commits found. Nothing to process.');
      return [];
    }

    // 4. Diff 가져오기
    const diff = await this.getCommitDiff(state.lastProcessedCommitSha, latestSha);

    // 5. 새로운 아티클 파싱
    const newArticles = this.parseNewArticlesFromDiff(diff);

    // 6. 상태 업데이트
    await this.saveState({
      lastProcessedCommitSha: latestSha,
      lastCheckedAt: new Date(),
      totalArticlesProcessed: state.totalArticlesProcessed + newArticles.length,
    });

    this.logger.log(`Successfully fetched ${newArticles.length} new articles`);
    return newArticles;
  }

  /**
   * 새로운 아티클을 수집하고 각 아티클을 AI로 번역/요약
   */
  async fetchAndSummarizeArticles(): Promise<
    Array<{
      article: Article;
      originalUrl: string;
      translation: string;
      summary: string;
    }>
  > {
    this.logger.log('Starting to fetch and summarize articles...');

    // 1. 새로운 아티클 수집
    const articles = await this.fetchNewArticles();

    if (articles.length === 0) {
      this.logger.log('No new articles to summarize');
      return [];
    }

    this.logger.log(`Processing ${articles.length} articles with AI...`);

    // 2. 각 아티클을 병렬로 처리 (AI 요약)
    const results = await Promise.allSettled(
      articles.map(async (article) => {
        try {
          this.logger.log(`Processing article: ${article.title}`);
          const summaryResult = await this.summaryService.processArticle(
            article.url,
          );

          return {
            article,
            ...summaryResult,
          };
        } catch (error) {
          this.logger.error(
            `Failed to process article "${article.title}": ${error.message}`,
          );
          throw error;
        }
      }),
    );

    // 3. 성공한 결과만 반환
    const successfulResults = results
      .filter((result) => result.status === 'fulfilled')
      .map((result) => (result as PromiseFulfilledResult<any>).value);

    const failedCount = results.length - successfulResults.length;
    if (failedCount > 0) {
      this.logger.warn(
        `${failedCount} articles failed to process. Successfully processed: ${successfulResults.length}`,
      );
    } else {
      this.logger.log(
        `Successfully processed all ${successfulResults.length} articles`,
      );
    }

    return successfulResults;
  }
}
