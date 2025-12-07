/**
 * Slack Slash Command 응답 타입
 * @see https://api.slack.com/interactivity/slash-commands#responding_to_commands
 */
export interface SlackCommandResponse {
  /**
   * 응답 타입
   * - in_channel: 채널의 모든 사용자에게 표시
   * - ephemeral: 명령을 실행한 사용자에게만 표시
   */
  response_type: 'in_channel' | 'ephemeral';

  /**
   * 표시할 메시지 텍스트
   */
  text: string;
}
