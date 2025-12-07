/**
 * GitHub Repository 설정
 */
export interface RepositoryConfig {
  owner: string;
  repo: string;
  branch?: string;
}

export const REPOSITORY: RepositoryConfig = {
  owner: 'SAllen0400',
  repo: 'swift-news',
  branch: 'main',
};
