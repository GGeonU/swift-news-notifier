import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';

@Injectable()
export class SummaryService {
  private readonly logger = new Logger(SummaryService.name);
  private genAI: GoogleGenerativeAI;
  private model;

  constructor(private configService: ConfigService) {
    // Gemini API 초기화
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined in .env');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
  }

  /**
   * URL에서 마크다운 콘텐츠 가져오기
   */
  async fetchMarkdownFromUrl(url: string): Promise<string> {
    try {
      this.logger.log(`Fetching markdown from: ${url}`);
      const response = await axios.get(url, {
        headers: {
          Accept: 'text/plain, text/markdown, text/*, */*',
        },
      });

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch markdown: ${error.message}`);
      throw new Error(`마크다운 파일을 가져올 수 없습니다: ${error.message}`);
    }
  }

  /**
   * 영문 텍스트를 한글로 번역
   */
  async translateToKorean(text: string): Promise<string> {
    const prompt = `
당신은 Swift/iOS 기술 아티클 전문 번역가입니다.

아래 영문 기술 아티클을 한국어로 번역해주세요.

**번역 규칙:**
1. Swift, iOS, Xcode, SwiftUI 등 기술 용어는 영어 원문을 유지하세요
2. 자연스러운 한국어로 번역하되, 전문 개발자가 이해하기 쉽게 작성하세요
3. 코드 블록은 그대로 유지하세요
4. 마크다운 포맷은 그대로 유지하세요

**원문:**
${text}

**한국어 번역:**
`;

    try {
      this.logger.log('Translating to Korean...');
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      return response.text();
    } catch (error) {
      this.logger.error(`Translation failed: ${error.message}`);
      throw new Error(`번역 실패: ${error.message}`);
    }
  }

  /**
   * 텍스트를 3-5줄로 요약
   */
  async summarize(text: string): Promise<string> {
    const prompt = `
당신은 Swift/iOS 기술 아티클 요약 전문가입니다.

아래 기술 아티클의 핵심 내용을 **3-5줄로 요약**해주세요.

**요약 규칙:**
1. 기술적으로 가장 중요한 포인트만 추출
2. 개발자가 "읽을 가치가 있는지" 판단할 수 있도록
3. 간결하고 명확하게
4. 기술 용어는 영어 원문 유지

**아티클 내용:**
${text.substring(0, 3000)} // 토큰 제한 고려해서 앞부분만

**핵심 요약:**
`;

    try {
      this.logger.log('Summarizing article...');
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      return response.text();
    } catch (error) {
      this.logger.error(`Summarization failed: ${error.message}`);
      throw new Error(`요약 실패: ${error.message}`);
    }
  }

  /**
   * 전체 프로세스: 가져오기 → 번역 → 요약
   */
  async processArticle(url: string): Promise<{
    originalUrl: string;
    translation: string;
    summary: string;
  }> {
    // 1. 마크다운 가져오기
    const markdown = await this.fetchMarkdownFromUrl(url);

    // 2. 번역
    const translation = await this.translateToKorean(markdown);

    // 3. 요약
    const summary = await this.summarize(markdown);

    return {
      originalUrl: url,
      translation,
      summary,
    };
  }
}
