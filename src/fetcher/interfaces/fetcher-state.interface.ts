/**
 * 단일 Repository의 처리 상태
 */
export interface RepositoryState {
  /** Repository owner */
  owner: string;

  /** Repository name */
  repo: string;

  /** 마지막으로 처리한 commit SHA */
  lastProcessedCommitSha: string;

  /** 마지막 체크 시각 */
  lastCheckedAt: Date;

  /** 총 처리한 아티클 수 */
  totalArticlesProcessed: number;
}

/**
 * 전체 Fetcher의 처리 상태를 저장하는 인터페이스
 */
export interface FetcherState {
  /** Repository별 상태 맵 (key: "owner/repo") */
  repositories: Record<string, RepositoryState>;
}
