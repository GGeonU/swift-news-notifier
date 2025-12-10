# Swift News Notifier

> 숭실대학교 2025년 2학기 고급웹프로그래밍 기말프로젝트
> Swift/iOS 영문 아티클을 AI로 요약해서 Slack으로 알림받는 자동화 서버 - 고라고라고라파덕


<p align="center">
  <img src="https://nestjs.com/img/logo-small.svg" width="60" alt="Nest Logo" />
  <img src="https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg" width="60" alt="AI" />
  <img src="https://a.slack-edge.com/80588/marketing/img/icons/icon_slack_hash_colored.png" width="60" alt="Slack" />
</p>

## 📌 프로젝트 개요

### 문제 인식
- Swift/iOS 아티클을 제공하는 Repository https://github.com/SAllen0400/swift-news 
- Repository에 모아놓은 아티클 알림이 필요하면 이메일로만 오는데 접근성이 떨어짐
- 추가로 Swift/iOS 아티클은 대부분 영어 원문이라 내용을 빠르게 훑어보기 어려움
- 관심 있는 아티클만 골라서 읽고 싶지만, 제목만으로는 내용 판단이 어려움

### 프로젝트 목표
1. Nest.js 프레임워크 학습: 실제 입력과 출력 명세를 가진 백엔드 개발 트로젝트 진행해보기
2. 개발 전 과정에 AI 도구 적극 활용: Claude Code, Cursor 등의 AI 개발 도구 활용 & 생성형 AI를 활용해서 아티클의 내용 요약
3. 실용적 서비스: 나에게 필요한 서비스가 뭔지 고민 + 실제로 사용했을 때 도움이 될 수 있는 의미 있는 서비스 기획하기

### 👨‍💻 개발자
- **박건우** (20231671, 미디어경영학과)
- iOS 개발자 → 백엔드 개발 경험 X

## 🛠️ 사용 기술 스택

### Backend
- **Nest.js** (TypeScript): 모듈화된 구조, Dependency Injection
- **@nestjs/schedule**: Cron Job 스케줄링
- **@nestjs/event-emitter**: 이벤트 기반 아키텍처

### 외부 API
- **GitHub REST API**: Repository 모니터링 및 Diff 추출
- **Google Gemini API**: AI 기반 아티클 요약
- **Slack Web API**: Block Kit을 활용한 메시지 전송

### Testing
- **Jest**: Unit Testing
- **Mocking**: 외부 API 의존성 분리

## 📁 프로젝트 구조

```
src/
├── fetcher/                     # GitHub 아티클 수집 모듈
│   ├── fetcher.service.ts       # GitHub API 연동
│   ├── fetcher.service.spec.ts  # Unit Tests
│   └── interfaces/
│       ├── article.interface.ts
│       ├── fetcher-state.interface.ts
│       └── repository.config.ts
│
├── summary/                     # AI 요약 모듈
│   ├── summary.service.ts       # Gemini API 연동
│   ├── summary.controller.ts    # HTTP API (테스트용)
│   ├── summary.service.spec.ts  # Unit Tests
│   └── errors/
│       └── summary.error.ts     # Custom Error Classes
│
├── notification/                # Slack 알림 모듈
│   ├── notification.service.ts  # Slack Block Kit API
│   └── notification.service.spec.ts
│
├── webhook/                     # Slack Command 처리
│   ├── webhook.controller.ts    # Slack Slash Commands
│   ├── webhook.service.ts
│   └── webhook.service.spec.ts
│
├── events/                      # 이벤트 정의
│   ├── article.events.ts        # 아티클 관련 이벤트
│   └── webhook.events.ts        # Webhook 이벤트
│
├── shared/                      # 공통 유틸리티
│   ├── article-summary.ts       # Value Object
│   └── semaphore.ts             # 동시성 제어
│
└── app.module.ts                # Root Module
```

---

## 🏗️ 시스템 아키텍처

### 전체 흐름

```
┌──────────────────┐    ┌─────────────────┐
│  Slack Command   │───▶│ Webhook Handler │
│ /check-articles  │    │   (Controller)  │  
└──────────────────┘    └─────────────────┘ 
                                 ↓
┌──────────────────┐    ┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│    Scheduler     │───▶│ GitHub Fetcher  │───▶│    Summary   │───▶│  Notification   │
│   (Cron Job)     │    │   (Service)     │    │              │    │   (Slack)       │
│ @nestjs/schedule │    │ - GitHub API    │    │ - Gemini API │    │ - Slack API     │
└──────────────────┘    └─────────────────┘    └──────────────┘    └─────────────────┘
         ↓                       ↓                      ↓                    ↓
      매일 9시               새 아티클 감지          AI 요약 생성          Slack 메시지 발송
```


## 🚀 핵심 기능

### 1. https://github.com/SAllen0400/swift-news Repository의 아티클 자동 수집
* 매일 9시 GitHub Repository의 Commit Diff를 분석하여 새로운 아티클 감지
* 새로운 아티클이 있는 경우, Diff에서 URL을 파싱해 아티클 내용을 Gemini를 통해 요약
* 이렇게 요약된 내용을 슬랙 채널을 통해 전송
![화면 기록 2025-12-10 17 43 39](https://github.com/user-attachments/assets/0373fe1d-eb77-4b5d-924d-04883614b2ac)

### 2. 특정 Swift/iOS 아티클 URL에 대한 요약 제공
* Slack Slash Command를 통해 원하는 아티클에 요약을 진행하는 서비스 제공
* ngrok을 통해 서버를 외부로 열어놓고, Slack Slash Command가 해당 API를 통해 접근할 수 있도록 구현
* 호출 시 제공된 URL을 파싱해 아티클 내용을 Gemini를 통해 요약
* 이렇게 요약된 내용을 슬랙 채널을 통해 전송


## 중요 의사결정 과정 및 트러블 슈팅

### 1. 모듈 간 너무 깊은 의존성 문제 → Event-Driven Architecture 도입
- 처음엔 Notification 모듈에서 Slack Slash Command에 대한 Controller 로직, Fetcher 로직을 모두 수행
- NotificationModule -> FetcherModule -> SummaryModule -> NotificationModule 의 순환 참조 발생
- 그래서, Slack Slash Command에 대한 Controller 로직을 WebhookModule로 분리, 그러나 4개의 모듈이 선형적으로 강하게 커플링 되는 문제 발견
  - WebhookModule -> FetcherModule -> SummaryModule -> NotificationModule 로, 모듈간의 깊은 의존성 발생 
  - NotificationModule을 테스트하려면, 의존을 갖고 있는 모듈에 대해 모두 Mocking이 필요 테스트가 어려움
  - Service 들이 구체적인 구현에 강하게 의존하게 됨
  - 특정 모듈의 코드를 변경했을 때, 의존하고 있는 모듈들의 모든 코드를 수정해야하는 경우도 있었음
- 그래서, 각 모듈간의 의존성이 없는, 이벤트 기반의 구조로 리팩토링

                     ┌─────────────────────────┐
                     │   EventEmitter (중앙)    │
                     └────────────┬────────────┘
                                  │
              ┌───────────────────┼───────────────────┐───────────────────────┐
              │                   │                   │                       │
              ↓                   ↓                   ↓                       ↓
      ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌──────────────────┐ 
      │  WebhookModule  │ │  FetcherModule  │ │  SummaryModule  │ │NotificationModule│
      └────────┬────────┘ └────────┬────────┘ └────────┬────────┘ └─────────┬────────┘ 


### 2. 실제 동작 테스트가 어려움 - 테스트 코드 적극 도입
- 프로젝트 핵심 로직이 웹페이지 -> 생성형 AI를 통한 요약이기 때문에 무료 플랜으로는 호출 한도에 걸리기도 했음
- 응답 -> 슬랙 메시지로 보내는 포맷팅, 특정 형태의 메시지가 Entity로 잘 변환이 되는지와 같은 로직들을 실제 응답으로 매번 확인하기 어려움
- 테스트 코드를 도입: 실제 개발에서도 작은 로직이 변경되었을 때, 테스트코드를 통해서 확인하며 프로젝트의 안정성을 높임 

### 3. AI 적극 활용
- 단순히 코드를 작성하게 시키는게 아닌 전반적인 방향성을 공유할 수 있도록, CLAUDE.md 작성
- 실제 요약 로직 적용시에도 질문을 최대한 구체적으로 해서 원하는 결과를 얻을 수 있도록 프롬프팅.

```
// 모듈 의존성이 깊어지면서 생기는 문제 해결
모듈간의 의존성이 깊은 뎁스로 생기면 어떤 부분이 문제가 될 수 있어?
Nest.js 에서는 이를 어떤 방식들로 해결하고, 트레이드오프를 고려해서 현재 상황에 적용할 수 있는 해결책을 고려해줘.
```

* 최초 아티클 요약 프롬프팅
```
당신은 Swift/iOS 기술 아티클 요약 전문가입니다.
**중요: 전체 아티클을 번역하지 마세요! 핵심만 간단히 요약하세요!**

**주요 내용 (1-2줄):**
- 기술 용어는 영어로 유지

**요약 (3-5개의 Bullet Point):**
- 기술 용어는 영어로 유지, 나머지는 한국어로 번역
```

* 일반적으로는 잘 요약이 되었으나, 요청 마다 답변의 내용이나 형식이 조금씩 달라지는 경우가 있었음 (예시 이외의 텍스트가 더 추가된다거나 하는)
* 요약 형식의 Preset 제공, 예외 케이스 추가 (URL 파싱 불가), 더 디테일한 요구 사항 명세 등으로
* 더 일관적이고 의미있는 응답이 올 수 있도록 프롬프팅 진행

```
당신은 Swift/iOS 기술 아티클 요약 전문가입니다.

**임무: 아래 URL의 아티클을 읽고 매우 짧게 요약하세요.**
**중요: 전체 아티클을 번역하지 마세요! 핵심만 간단히 요약하세요!**
**예외: 링크의 내용을 가져오지 못하거나 요약을 진행할 수 없는 경우, 페이지에서 내용을 찾을 수 없는 경우 빈 문자열을 반환하세요.**

**주요 내용 (1-2줄):**
- 이 아티클이 무엇에 관한 것인지 한 문장으로 설명
- 기술 용어는 영어로 유지

**요약 (3-5개의 Bullet Point):**
- 가장 중요한 핵심 포인트만 추출
- 각 포인트는 한 줄로 간결하게
- 기술 용어는 영어로 유지, 나머지는 한국어로 번역
- 마크다운 Bullet Point 형식 (- 로 시작)

**URL:**
${url}

**출력 형식 (무조건 이 형식만 따라서 출력하세요):**
## 제목
[아티클 제목 원문 그대로]

## 주요 내용
[1-2줄 설명]

## 요약
- [핵심 포인트 1]
- [핵심 포인트 2]
- [핵심 포인트 3]

**출력 예시:**
## 제목
What's new in Swift 6.1?

## 주요 내용
이 아티클은 Swift 6.1에 도입된 Concurrency 개선, Custom performance metrics, 그리고 Void 타입의 Codable 채택 등 주요 변경사항을 소개합니다. iOS 개발자들은 이를 통해 Swift의 최신 발전 방향을 이해하고 더 안전하며 효율적인 코드를 작성하는 데 필요한 인사이트를 얻을 수 있습니다.

## 요약
- Concurrency 관련하여 async let이 Sendable이 되고 actor 메서드에 isolated default arguments가 지원되는 등 안전성과 사용성이 개선되었습니다.
- SE-0410을 통해 개발자가 직접 정의하는 Custom performance metrics를 지원하여 Swift 테스트 시 더욱 정밀한 성능 분석이 가능해졌습니다.
- Void 타입이 Encodable 및 Decodable 프로토콜을 채택하여, 응답 바디가 없는 API 처리 시 코드를 간소화할 수 있습니다.
- Swift Package Manager가 Swift 6 및 Swift 5 모드를 동시에 지원하여 패키지 호환성 및 마이그레이션 편의성이 향상되었습니다.
- UnsafeRawBufferPointer의 일부 initializer가 Deprecate 되고, _Concurrency.AsyncStream이 Sendable이 되는 등 전반적인 타입 안전성과 개발 편의성이 강화되었습니다.
```

### 4. 🚀 예외 케이스 및 에러 핸들링 대응
### 전체 요약 중 새로운 아티클 확인 요청이 들어온 경우
* Repository에 새로운 아티클이 올라와서, 업데이트된 아티클 전체를 요약 중인데 새로운 확인 요청이 Webhook을 통해 들어온 경우
* Queue 등을 고려했으나, 당장은 구현이 간단한 Flag를 통해서 중복 요청이 핸들링 될 수 있도록 변경

### Slack Slack Command에 올바른 파라미터가 들어오지 않은 경우
* 특정 URL 요약을 요청하는 커맨드에 파라미터를 입력하지 않은 경우

![화면 기록 2025-12-10 17 25 32](https://github.com/user-attachments/assets/ac758f8b-88c0-4c04-a445-5a6e8b593fc9)

* 특정 URL 요약을 요청하는 커맨드에 Valid하지 않은 URL을 입력한 경우

![화면 기록 2025-12-10 17 23 58](https://github.com/user-attachments/assets/24edddbd-d41c-40d4-9f81-0e3b6b585cc5)


* 모종의 이유로 Gemini가 URL 내 내용을 제대로 읽을 수 없는 경우

<img width="653" height="463" alt="image" src="https://github.com/user-attachments/assets/f79c9b26-5105-4a96-aa8e-ed9b1cb4acae" />

## 🚀 실행 방법

### 1. 환경 변수 설정

`.env` 파일 생성:
```bash
# Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# GitHub Settings
GITHUB_TOKEN=your_github_token_here
GITHUB_REPO_OWNER=SAllen0400
GITHUB_REPO_NAME=swift-news
GITHUB_REPO_BRANCH=main

# Slack Settings
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_CHANNEL_ID=C1234567890
SLACK_SIGNING_SECRET=your_slack_signing_secret

# Fetcher Settings
FETCHER_STATE_FILE_PATH=./data/fetcher-state.json

# Application Settings
PORT=3000
```

### 2. 의존성 설치

```bash
pnpm install
```

### 3. 개발 서버 실행

```bash
# Watch 모드
pnpm start:dev

# 프로덕션 모드
pnpm start:prod
```

### 4. 테스트 실행

```bash
# Unit Tests
pnpm test

# 특정 테스트 실행
pnpm test -- fetcher.service.spec.ts
```


## 🔍 향후 개선 사항

### 1. 다중 Repository 지원
현재는 1개 Repository만 모니터링하지만, 여러 Repository를 동시에 추적하도록 확장 가능

### 2. 사용자 맞춤 키워드 필터링
관심 키워드(SwiftUI, Combine 등)만 알림받도록 필터링 기능 추가

### 3. 데이터베이스 도입
파일 기반 상태 저장 → PostgreSQL/MongoDB로 전환하여 검색 및 통계 기능 추가

## 기타 문의 사항
- 미디어경영학과 20231671 박건우
- ggeonu0613@gmail.com
- 010-2402-7030
