import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Cron } from '@nestjs/schedule';
import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Article, FetcherState, RepositoryState, RepositoryConfig, REPOSITORY } from './interfaces';
import {
  ArticleFetchedEvent,
  ARTICLE_EVENTS,
} from '../events/article.events';
import {
  CheckArticlesRequestedEvent,
  SummarizeArticleRequestedEvent,
  WEBHOOK_EVENTS,
} from '../events/webhook.events';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class FetcherService {
  private readonly logger = new Logger(FetcherService.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly stateFilePath: string;
  private readonly repository: RepositoryConfig;

  constructor(
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
    private notificationService: NotificationService,
  ) {
    const githubToken = this.configService.get<string>('GITHUB_TOKEN');

    this.axiosInstance = axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        Accept: 'application/vnd.github.v3+json',
        ...(githubToken && { Authorization: `token ${githubToken}` }),
      },
    });

    // Repository 설정
    this.repository = REPOSITORY;

    // 상태 파일 경로 설정
    this.stateFilePath = path.join(process.cwd(), 'data', 'fetcher-state.json');
  }

  /**
   * Repository 키 생성 (owner/repo 형식)
   */
  private getRepositoryKey(owner: string, repo: string): string {
    return `${owner}/${repo}`;
  }

  /**
   * 최신 commit SHA 가져오기
   */
  async getLatestCommitSha(
    owner: string,
    repo: string,
    branch: string = 'main',
  ): Promise<string> {
    try {
      const url = `/repos/${owner}/${repo}/commits/${branch}`;
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
  async getCommitDiff(
    owner: string,
    repo: string,
    baseSha: string,
    headSha: string,
  ): Promise<string> {
    try {
      const url = `/repos/${owner}/${repo}/compare/${baseSha}...${headSha}`;
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
   * Git diff -> Article 변환
   */
  parseNewArticlesFromDiff(diff: string): Article[] {
    const lines = diff.split('\n');
    const articles: Article[] = [];
    const linkRegex = /\[(.+?)\]\((.+?)\)/g; // [Title](URL) 형식

    for (const line of lines) {
      // 추가된 라인만 처리 ('+' 시작)
      if (line.startsWith('+') && !line.startsWith('+++')) {
        let match: RegExpExecArray | null;
        while ((match = linkRegex.exec(line)) !== null) {
          const [, title, url] = match;

          // YouTube 링크는 제외 (아티클만 필요)
          if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
            articles.push({
              title,
              url,
              discoveredAt: new Date(),
            });
          }
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
      const state: FetcherState = JSON.parse(data);

      for (const key in state.repositories) {
        state.repositories[key].lastCheckedAt = new Date(
          state.repositories[key].lastCheckedAt,
        );
      }

      this.logger.log('Loaded state from file');
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
      this.logger.log('State saved to file');
    } catch (error) {
      this.logger.error(`Failed to save state: ${error.message}`);
      throw error;
    }
  }

  /**
   * 최근 N개의 commit SHA 목록 가져오기
   */
  async getRecentCommits(
    owner: string,
    repo: string,
    branch: string = 'main',
    count: number = 5,
    filePath?: string,
  ): Promise<string[]> {
    try {
      const url = `/repos/${owner}/${repo}/commits`;
      this.logger.log(`Fetching recent ${count} commits from: ${url}${filePath ? ` (path: ${filePath})` : ''}`);

      const response = await this.axiosInstance.get(url, {
        params: {
          sha: branch,
          per_page: count,
          ...(filePath && { path: filePath }),
        },
      });

      return response.data.map((commit: any) => commit.sha);
    } catch (error) {
      this.logger.error(`Failed to fetch recent commits: ${error.message}`);
      throw new Error(`GitHub API 호출 실패: ${error.message}`);
    }
  }

  /**
   * 단일 Repository에서 새로운 아티클 수집
   */
  private async fetchFromRepository(
    repoConfig: RepositoryConfig,
    state: FetcherState,
  ): Promise<Article[]> {
    const { owner, repo, branch = 'main' } = repoConfig;
    const repoKey = this.getRepositoryKey(owner, repo);

    this.logger.log(`Checking repository: ${repoKey}`);

    // 1. 최신 commit SHA 가져오기
    const latestSha = await this.getLatestCommitSha(owner, repo, branch);

    // 2. 해당 Repository의 상태 가져오기
    const repoState = state.repositories[repoKey];

    // 첫 실행이면 최근 커밋의 diff를 처리
    if (!repoState) {
      this.logger.log(`First run for ${repoKey}. Processing recent commits...`);

      // 최근 1개 커밋 가져오기
      const recentCommits = await this.getRecentCommits(owner, repo, branch, 1);

      // 가장 오래된 커밋부터 최신 커밋까지의 diff 가져오기
      const oldestSha = recentCommits[recentCommits.length - 1];
      const diff = await this.getCommitDiff(owner, repo, oldestSha, latestSha);

      // 새로운 아티클 파싱
      const newArticles = this.parseNewArticlesFromDiff(diff);

      // 각 아티클마다 이벤트 발행
      for (const article of newArticles) {
        this.logger.log(`Emitting article.fetched event for: ${article.title} from ${repoKey}`);
        this.eventEmitter.emit(
          ARTICLE_EVENTS.NEW_FETCHED,
          new ArticleFetchedEvent(article.title, article.url),
        );
      }

      // 상태 저장
      state.repositories[repoKey] = {
        owner,
        repo,
        lastProcessedCommitSha: latestSha,
        lastCheckedAt: new Date(),
        totalArticlesProcessed: newArticles.length,
      };

      this.logger.log(`First run for ${repoKey}: Found ${newArticles.length} articles from recent commits`);
      return newArticles;
    }

    // 3. 변경사항이 있는지 확인
    if (repoState.lastProcessedCommitSha === latestSha) {
      this.logger.log(`No new commits in ${repoKey}.`);
      return [];
    }

    // 4. Diff 가져오기
    const diff = await this.getCommitDiff(
      owner,
      repo,
      repoState.lastProcessedCommitSha,
      latestSha,
    );

    // 5. 새로운 아티클 파싱
    const newArticles = this.parseNewArticlesFromDiff(diff);

    // 6. 각 아티클마다 이벤트 발행
    for (const article of newArticles) {
      this.logger.log(`Emitting article.fetched event for: ${article.title} from ${repoKey}`);
      this.eventEmitter.emit(
        ARTICLE_EVENTS.FETCHED,
        new ArticleFetchedEvent(article.title, article.url),
      );
    }

    // 7. 상태 업데이트
    repoState.lastProcessedCommitSha = latestSha;
    repoState.lastCheckedAt = new Date();
    repoState.totalArticlesProcessed += newArticles.length;

    this.logger.log(`Found ${newArticles.length} new articles from ${repoKey}`);
    return newArticles;
  }

  /**
   * Repository에서 새로운 아티클 수집 (메인 로직)
   * 각 아티클마다 'article.fetched' 이벤트를 발행
   */
  async fetchNewArticles(): Promise<Article[]> {
    this.logger.log('Starting to fetch new articles...');

    // 1. 저장된 상태 불러오기
    let state = await this.loadState();

    // 첫 실행이면 빈 상태 생성
    if (!state) {
      this.logger.log('First run detected. Initializing state...');
      state = { repositories: {} };
    }

    // 2. 단일 Repository 처리
    try {
      const articles = await this.fetchFromRepository(this.repository, state);

      // 3. 상태 저장
      await this.saveState(state);

      this.logger.log(`Successfully fetched ${articles.length} new articles`);
      return articles;
    } catch (error) {
      const repoKey = this.getRepositoryKey(this.repository.owner, this.repository.repo);
      this.logger.error(`Failed to fetch from ${repoKey}: ${error.message}`);
      throw error;
    }
  }

  /**
   * 매일 오전 9시에 자동으로 새로운 아티클 체크
   */
  @Cron('0 9 * * *', {
    name: 'check-new-articles-daily',
    timeZone: 'Asia/Seoul',
  })
  async scheduledCheckMorning() {
    this.logger.log('Running scheduled article check (Morning 9:00 AM)...');
    try {
      await this.fetchNewArticles();
    } catch (error) {
      this.logger.error(`Scheduled check failed: ${error.message}`);
    }
  }

  /**
   * webhook.check-articles-requested 이벤트 리스너
   * Webhook에서 새로운 아티클 체크 요청이 들어오면 처리
   */
  @OnEvent(WEBHOOK_EVENTS.CHECK_ARTICLES_REQUESTED)
  async handleCheckArticlesRequested(event: CheckArticlesRequestedEvent) {
    this.logger.log(
      `Received check articles request from: ${event.requestedBy}`,
    );

    try {
      const articles = await this.fetchNewArticles();
      if (articles.length === 0) {
        await this.notificationService.sendArticleToSlack({
          title: '알림 체크 완료',
          url: 'https://github.com/SAllen0400/swift-news',
          summary: '✅ 새로운 아티클이 없습니다.',
        });
      } else {
        await this.notificationService.sendArticleToSlack({
          title: '알림 체크 완료',
          url: 'https://github.com/SAllen0400/swift-news',
          summary: `✅ 총 ${articles.length}개의 새로운 아티클이 있습니다!\n귀여운 고라파덕이 아티클을 요약하고 있습니다...`,
        });
      }
    } catch (error) {
      this.logger.error(`Check articles request failed: ${error.message}`);
      await this.notificationService.sendArticleToSlack({
        title: '알림 체크 실패',
        url: 'https://github.com/SAllen0400/swift-news',
        summary: `❌ 오류가 발생했습니다: ${error.message}`,
      });
    }
  }

  /**
   * webhook.summarize-article-requested 이벤트 리스너
   * Webhook에서 특정 URL 아티클 요약 요청이 들어오면 처리
   */
  @OnEvent(WEBHOOK_EVENTS.SUMMARIZE_ARTICLE_REQUESTED)
  async handleSummarizeArticleRequested(event: SummarizeArticleRequestedEvent) {
    this.logger.log(
      `Received summarize article request for: ${event.url} by ${event.requestedBy}`,
    );

    // article.fetched 이벤트를 발행하면 SummaryService가 자동으로 처리
    this.eventEmitter.emit(
      ARTICLE_EVENTS.FETCHED,
      new ArticleFetchedEvent('수동 요청 아티클', event.url),
    );
  }
}
