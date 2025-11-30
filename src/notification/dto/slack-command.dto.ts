/**
 * Slack Slash Command 요청 바디
 * https://api.slack.com/interactivity/slash-commands#app_command_handling
 */
export class SlackCommandDto {
  token: string;
  team_id: string;
  team_domain: string;
  channel_id: string;
  channel_name: string;
  user_id: string;
  user_name: string;
  command: string;
  text: string; // 커맨드 뒤에 입력된 텍스트 (예: URL)
  api_app_id: string;
  response_url: string;
  trigger_id: string;
}
