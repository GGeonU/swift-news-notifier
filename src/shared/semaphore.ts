/**
 * 간단한 Semaphore 구현
 * 동시 실행 개수를 제한하는 동기화 메커니즘
 */
export class Semaphore {
  private permits: number;
  private queue: (() => void)[] = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  /**
   * Semaphore 획득 (실행 권한 요청)
   * permits가 0이면 대기
   */
  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return Promise.resolve();
    }

    // 대기 큐에 추가
    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
    });
  }

  /**
   * Semaphore 반환 (실행 완료)
   * 대기 중인 요청이 있으면 다음 요청 실행
   */
  release(): void {
    this.permits++;

    // 대기 중인 요청이 있으면 실행
    const resolve = this.queue.shift();
    if (resolve) {
      this.permits--;
      resolve();
    }
  }

  /**
   * 현재 사용 가능한 permits 수
   */
  availablePermits(): number {
    return this.permits;
  }
}
