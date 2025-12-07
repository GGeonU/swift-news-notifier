/**
 * GitHub Repository 설정
 */
export interface RepositoryConfig {
  owner: string;
  repo: string;
  branch?: string;
}

/**
 * 추적할 단일 Repository
 */
export const REPOSITORY: RepositoryConfig = {
  owner: 'SAllen0400',
  repo: 'swift-news',
  branch: 'main',
};
