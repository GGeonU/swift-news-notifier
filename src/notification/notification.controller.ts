import { Controller, Post, HttpException, HttpStatus } from '@nestjs/common';
import { NotificationService } from './notification.service';

@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * POST /notification/test
   * Slack 연동 테스트
   */
  @Post('test')
  async testSlackNotification(): Promise<{ success: boolean; message: string }> {
    try {
      await this.notificationService.sendTestMessage();

      return {
        success: true,
        message: 'Test notification sent to Slack successfully',
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to send test notification',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
