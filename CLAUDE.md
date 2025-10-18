# Swift News Notifier

> Swift/iOS 영문 아티클을 AI로 번역 + 요약해서 메신저로 알림받는 서버

## 📌 업데이트 내역

- **2025-10-18**: AI 번역/요약 모듈 구현 완료
- **2025-09-27**: Init & 전반적인 프로젝트 개요 추가

---

## 🎯 프로젝트 개요

### 문제 상황
- Swift/iOS 아티클은 대부분 **영어 원문**
- 영어를 쓱 보고 이해하기 어려움
- 관심 있는 아티클만 시간 써서 직접 읽고 싶음
- GitHub에 `.md`로 모아놓은 아티클 알림이 메일로 오는데 **접근성이 안좋음**

### 해결 방법
1. GitHub Repository에서 새로운 아티클을 **자동으로 수집**
2. **AI로 한글 번역 + 핵심 내용 요약**
3. **Slack 또는 카카오톡으로 푸시 알림**

---

## 🛠️ 프로젝트 스펙

### 기술 스택
- **Backend Framework**: Nest.js (TypeScript)
- **AI**: Google Gemini API
- **Notification**: Slack Webhook / 카카오톡 메시지 API
- **Scheduling**: @nestjs/schedule (Cron)
- **Data Fetching**: GitHub API, Axios

### 팀 구성
- **박건우** (20231671, 미디어경영학과) - iOS 개발자
- **AI 협업 도구**:
  - Claude Code (회사 플랜)
  - Cursor (Student Plan)
  - Google Gemini (Student Plan)

---

## 🎓 프로젝트 목표

### 1. 기술 학습
- ✅ **Nest.js** 프레임워크 학습
- ✅ 백엔드 개발 경험 (백엔드 경험 없는 상태에서 시작)
- ✅ 실제 운영 가능한 소규모 프로젝트 완성

### 2. AI 도구 활용
- ✅ Claude Code, Cursor, Gemini를 **적극적으로 활용**
- ✅ 프레임워크의 **맥락을 고려한 개발** 진행
- ✅ 프롬프트 엔지니어링 경험

### 3. 실용적 가치
- ✅ 개인 맞춤형 정보 파이프라인 구축
- ✅ 최신 Swift/iOS 트렌드를 놓치지 않기
- ✅ 최소 시간으로 최대 정보 습득

---

## 🏗️ 아키텍처

```
┌──────────────────┐    ┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│   Scheduler      │───▶│ GitHub Collector│───▶│ AI Processor │───▶│ Notification    │
│   (Cron Job)     │    │   (Service)     │    │  (Service)   │    │   Sender        │
│ @nestjs/schedule │    │ - GitHub API    │    │ - Gemini API │    │ - Slack/Kakao   │
└──────────────────┘    └─────────────────┘    └──────────────┘    └─────────────────┘
```

### 주요 기능

#### 1. 아티클 수집 (GitHub Collector)
- 지정된 GitHub Repository를 주기적으로 폴링
- 신규 추가된 `.md` 파일 감지
- 마지막 Commit Hash를 저장해 중복 처리 방지

#### 2. 콘텐츠 처리 (AI Processor) ✅ **구현 완료**
- 마크다운 파일을 파싱
- Gemini API로 한국어 번역
- 핵심 내용 3-5줄 요약
- 기술 용어는 영어 원문 유지

#### 3. 알림 발송 (Notifier)
- Slack Webhook 또는 카카오톡 메시지 API
- 번역/요약 + 원문 링크 포함
- 가독성 높은 메시지 템플릿

#### 4. 로깅 및 상태 관리
- 각 파이프라인의 성공/실패 기록
- 처리한 아티클 중복 방지

---

## 📁 프로젝트 구조

```
src/
├── ai/                     # ✅ AI 번역/요약 모듈
│   ├── ai.module.ts
│   ├── ai.service.ts       # Gemini API 연동
│   ├── ai.controller.ts    # 테스트용 HTTP API
│   └── dto/
│       └── translate.dto.ts
├── github/                 # ⏳ TODO: GitHub 수집 모듈
├── notification/           # ⏳ TODO: 알림 발송 모듈
├── scheduler/              # ⏳ TODO: 스케줄링 모듈
├── app.module.ts
└── main.ts
```

---

## 🚀 시작하기

### 1. 의존성 설치
```bash
pnpm install
```

### 2. 환경 변수 설정
`.env` 파일에 API 키 입력:
```bash
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
```

### 3. 개발 서버 실행
```bash
pnpm start:dev
```

### 4. AI 번역 테스트
```bash
curl -X POST http://localhost:3000/ai/translate \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://raw.githubusercontent.com/사용자/레포/main/아티클.md"
  }'
```

---

## 🧠 Nest.js 핵심 개념 정리

### Module (모듈)
- 기능 단위로 코드를 그룹화하는 **논리적 컨테이너**
- iOS의 Swift Package와 유사하지만 **물리적으로 완전히 분리되지는 않음**
- `@Module()` 데코레이터로 정의
- `imports`: 다른 모듈 가져오기
- `exports`: 다른 모듈에서 사용 가능하게 제공

### Service (서비스)
- **비즈니스 로직**을 담당
- `@Injectable()` 데코레이터로 DI 가능하게 만듦
- iOS의 Manager/Service 클래스와 유사

### Controller (컨트롤러)
- **HTTP 요청을 받아서 Service에 전달**
- `@Controller()`, `@Get()`, `@Post()` 등 데코레이터 사용
- iOS의 ViewController나 API Router 역할

### Dependency Injection (의존성 주입)
- Constructor에서 자동으로 인스턴스 주입
- Nest.js가 의존성 그래프를 자동으로 관리
- iOS의 Swinject와 유사하지만 프레임워크 내장

---

## ⚠️ 구현 시 고려사항

### 1. GitHub API
- **Rate Limit**: Personal Access Token 필수
- **파일 구조 변경**: 특정 폴더만 타겟팅
- **Commit Hash 저장**: 중복 처리 방지

### 2. AI 처리
- **비용 관리**: API 호출 횟수 제한
- **토큰 제한**: 긴 아티클은 chunking 필요
- **프롬프트 엔지니어링**: 기술 용어 유지, 자연스러운 번역

### 3. 외부 API 의존성
- **API 키 보안**: `.env` 파일로 분리, `.gitignore` 필수
- **재시도 로직**: 일시적 장애 대응
- **에러 로깅**: 실패 추적 가능하게

### 4. Nest.js 학습
- **점진적 구조화**: 간단하게 시작 → 모듈 분리
- **DI 이해**: Module - Controller - Service 역할 분리
- **CLI 활용**: `nest generate` 명령어로 boilerplate 생성

---

## 📝 TODO

- [x] AI 번역/요약 모듈 구현
- [ ] GitHub 수집 모듈 구현
- [ ] Slack/카카오톡 알림 모듈 구현
- [ ] 스케줄링 (Cron Job) 구현
- [ ] 중복 처리 방지 로직
- [ ] 에러 핸들링 및 로깅
- [ ] 배포 환경 설정

---

## 🔗 참고 자료

- [Nest.js 공식 문서](https://docs.nestjs.com/)
- [Google Gemini API](https://ai.google.dev/)
- [GitHub API](https://docs.github.com/en/rest)
- [Slack Webhook API](https://api.slack.com/messaging/webhooks)
