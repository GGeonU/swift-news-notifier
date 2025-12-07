/**
 * Slack Slash Command 요청 바디
 * https://api.slack.com/interactivity/slash-commands#app_command_handling
 */
export class SlackCommandRequest {
  user_id: string;
  user_name: string;
  text: string | undefined; // 커맨드 뒤에 입력된 텍스트 (예: URL)
}
