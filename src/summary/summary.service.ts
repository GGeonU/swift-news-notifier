import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GoogleGenerativeAI,
  GenerativeModel,
} from '@google/generative-ai';

@Injectable()
export class SummaryService {
  private readonly logger = new Logger(SummaryService.name);
  private generativeAI: GoogleGenerativeAI;
  private generativeModel: GenerativeModel;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined in .env');
    }

    this.generativeAI = new GoogleGenerativeAI(apiKey);
    this.generativeModel = this.generativeAI.getGenerativeModel(
      { model: 'gemini-2.5-flash' }
    );
  }

  /**
   * URL의 웹페이지를 한글로 번역
   */
  async translateWebPage(url: string): Promise<string> {
    const prompt = `
당신은 Swift/iOS 기술 아티클 전문 번역가입니다.
아래 URL의 웹페이지를 읽고 한국어로 번역해주세요.

**번역 규칙:**
1. Swift, iOS, Xcode, SwiftUI 등 기술 용어는 영어 원문을 유지하세요
2. 자연스러운 한국어로 번역하되, 전문 개발자가 이해하기 쉽게 작성하세요
3. 코드 블록은 그대로 유지하세요
4. 본문 내용만 번역하고, 광고나 네비게이션은 제외하세요

**URL:**
${url}

**한국어 번역:**
`;

    try {
      this.logger.log(`Translating web page: ${url}`);
      const result = await this.generativeModel.generateContent(prompt);
      const response = result.response;
      return response.text();
    } catch (error) {
      this.logger.error(`Translation failed: ${error.message}`);
      throw new Error(`번역 실패: ${error.message}`);
    }
  }

  /**
   * URL의 웹페이지를 3-5줄로 요약
   */
  async summarizeWebPage(url: string): Promise<string> {
    const prompt = `
당신은 Swift/iOS 기술 아티클 요약 전문가입니다.

아래 URL의 웹페이지를 읽고 핵심 내용을 **3-5줄로 요약**해주세요.

**요약 규칙:**
1. 기술적으로 가장 중요한 포인트만 추출
2. 개발자가 "읽을 가치가 있는지" 판단할 수 있도록
3. 간결하고 명확하게
4. 기술 용어는 영어 원문 유지
5. summary 내용은 마크다운 형식으로 요약

**URL:**
${url}

**핵심 요약:**
`;

    try {
      this.logger.log(`Summarizing web page: ${url}`);
      const result = await this.generativeModel.generateContent(prompt);
      const response = result.response;
      return response.text();
    } catch (error) {
      this.logger.error(`Summarization failed: ${error.message}`);
      throw new Error(`요약 실패: ${error.message}`);
    }
  }

  /**
   * 전체 프로세스: URL 전달 → 번역 + 요약 (1번의 API 호출)
   */
  async processArticle(url: string): Promise<{
    originalUrl: string;
    translation: string;
    summary: string;
  }> {
    this.logger.log(`Processing article: ${url}`);

    const prompt = `
당신은 Swift/iOS 기술 아티클 전문가입니다.
아래 URL의 웹페이지를 읽고 **한국어 번역**과 **핵심 요약**을 제공해주세요.

**번역 규칙:**
1. Swift, iOS, Xcode, SwiftUI 등 기술 용어는 영어 원문을 유지하세요.
2. 자연스러운 한국어로 번역하되, 전문 개발자가 이해하기 쉽게 작성하세요.
3. 코드 블록은 그대로 유지하세요
4. 본문 내용만 번역하고, 광고나 네비게이션은 제외하세요
5. 번역은 해당 아티클이 어떤 내용인지에 대한 1~2줄 이내로 작성하세요.

**요약 규칙:**
1. 기술적으로 가장 중요한 포인트만 추출하세요.
2. 개발자가 "읽을 가치가 있는지" 판단할 수 있도록 요약하세요.
3. 3-5줄로 간결하고 명확하게 요약하세요. Bullet Point 형식으로 작성하세요.
4. 기술이나 프레임워크에 대한 맥락은 번역하지 않고 영어 원문을 유지하세요.
5. 마크다운 형식으로 작성하세요.

**URL:**
${url}

**응답 형식 (반드시 이 형식을 따라주세요):**
## 번역
[여기에 한국어 번역 내용 1-2줄]

## 요약
[여기에 핵심 요약 3-5줄]
`;

    try {
      const result = await this.generativeModel.generateContent(prompt);
      const response = result.response.text();


      // 응답 파싱
      const translationMatch = response.match(/## 번역\s+([\s\S]*?)(?=## 요약|$)/);
      const summaryMatch = response.match(/## 요약\s+([\s\S]*?)$/);

      console.log(response);
      console.log(translationMatch);

      const translation = translationMatch ? translationMatch[1].trim() : response;
      const summary = summaryMatch ? summaryMatch[1].trim() : '요약을 생성할 수 없습니다.';

      return {
        originalUrl: url,
        translation,
        summary,
      };
    } catch (error) {
      this.logger.error(`Article processing failed: ${error.message}`);
      throw new Error(`아티클 처리 실패: ${error.message}`);
    }
  }
}
