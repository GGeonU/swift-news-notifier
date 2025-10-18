import { Body, Controller, Post, HttpException, HttpStatus } from '@nestjs/common';
import { SummaryService } from './summary.service';
import { TranslateRequestDto, TranslateResponseDto } from './dto/translate.dto';

@Controller('summary')
export class SummaryController {
  constructor(private readonly summaryService: SummaryService) {}

  /**
   * POST /summary/translate
   * 마크다운 URL을 받아서 번역 + 요약 결과 반환
   */
  @Post('translate')
  async translate(
    @Body() request: TranslateRequestDto,
  ): Promise<TranslateResponseDto> {
    if (!request.url) {
      throw new HttpException(
        'URL is required in request body',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const result = await this.summaryService.processArticle(request.url);
      return result;
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to process article',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
