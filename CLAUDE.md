# Swift News Notifier

> Swift/iOS 영문 아티클을 AI로 번역 + 요약해서 메신저로 알림받는 서버

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
- ✅ 프레임워크의 맥락을 고려한 개발 진행
- ✅ 프롬프트 엔지니어링 경험

### 3. 실용적 가치
- ✅ 개인 맞춤형 정보 파이프라인 구축
- ✅ 최신 Swift/iOS 트렌드를 놓치지 않기
- ✅ 최소 시간으로 최대 정보 습득

---

## 주요 기능

#### 1. 아티클 수집 (GitHub Collector)
- 지정된 GitHub Repository를 주기적으로 폴링
- 신규 추가된 `.md` 파일 감지
- 마지막 Commit Hash를 저장해 중복 처리 방지

#### 2. 콘텐츠 처리 (AI Processor)
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

## 🤖 AI 협업 규칙

### 1. Nest.js 아키텍처 규칙 (엄격 준수)

#### Module (모듈)
- **역할**: 기능 단위로 코드를 그룹화하는 논리적 컨테이너
- **규칙**:
  - 각 기능은 반드시 독립적인 Module로 분리
  - `@Module()` 데코레이터로 정의 필수
  - `imports`: 필요한 다른 모듈만 선언
  - `exports`: 다른 모듈에서 사용할 Service만 export
  - 순환 참조(Circular Dependency) 절대 금지
  - 모듈 간 직접 의존성은 최소화, Event-Driven Architecture 활용 권장

#### Service (서비스)
- **역할**: 비즈니스 로직의 핵심 담당
- **규칙**:
  - `@Injectable()` 데코레이터 필수
  - HTTP 요청/응답 처리 로직은 절대 포함하지 않음
  - Controller에서 직접 호출되는 비즈니스 로직은 모두 Service에 위치
  - 외부 API 호출, 데이터 처리, 유틸리티 함수 등은 Service에 구현
  - Service 간 직접 의존성은 최소화, EventEmitter 활용 권장

#### Controller (컨트롤러)
- **역할**: HTTP 요청/응답 처리만 담당
- **규칙**:
  - `@Controller()`, `@Get()`, `@Post()` 등 데코레이터 사용
  - 비즈니스 로직은 절대 포함하지 않음
  - 요청 검증(DTO), 응답 포맷팅만 수행
  - 모든 비즈니스 로직은 Service에 위임
  - iOS의 ViewController처럼 "뷰 레이어" 역할만 수행

#### Dependency Injection (의존성 주입)
- **규칙**:
  - Constructor Injection만 사용
  - Service는 Module의 `providers`에 등록
  - Controller는 Module의 `controllers`에 등록
  - Nest.js의 DI 컨테이너를 통해 자동 주입

#### 위반 시 대응
- Module에 비즈니스 로직이 있는 경우 → Service로 이동
- Controller에 비즈니스 로직이 있는 경우 → Service로 이동
- Service에 HTTP 요청/응답 로직이 있는 경우 → Controller로 이동
- 순환 참조가 발생하는 경우 → Event-Driven Architecture로 리팩토링

### 2. 트레이드오프 고려 원칙

모든 질문과 답변은 **트레이드오프를 반드시 고려**해야 합니다.

#### 고려해야 할 트레이드오프 요소
- **성능 vs 가독성**: 코드가 더 빠른가 vs 더 읽기 쉬운가
- **복잡도 vs 단순성**: 기능이 풍부한가 vs 구현이 간단한가
- **유지보수성 vs 개발 속도**: 나중에 수정하기 쉬운가 vs 지금 빠르게 만들 수 있는가
- **확장성 vs 최적화**: 나중에 확장하기 쉬운가 vs 현재 상황에 최적화된가
- **테스트 용이성 vs 구현 편의성**: 테스트하기 쉬운가 vs 빠르게 구현할 수 있는가

#### 답변 형식
모든 기술적 제안이나 결정에는 다음을 포함해야 합니다:
1. **제안하는 방법의 장점**
2. **제안하는 방법의 단점**
3. **대안 방법과의 비교**
4. **현재 프로젝트 상황에서의 권장사항 및 이유**

예시:
```
이 문제를 해결하는 방법은 A와 B가 있습니다.

**방법 A (Event-Driven Architecture)**
- 장점: 모듈 간 결합도 낮음, 확장성 좋음, 테스트 용이
- 단점: 초기 구현 복잡도 높음, 디버깅 어려움
- 적합한 경우: 모듈이 많고 서로 독립적인 경우

**방법 B (직접 의존성)**
- 장점: 구현 간단, 직관적, 디버깅 쉬움
- 단점: 모듈 간 결합도 높음, 변경 시 영향 범위 큼
- 적합한 경우: 모듈이 적고 관계가 명확한 경우

**현재 프로젝트 권장사항**: [상황 분석 후 권장 방법 제시]
```

### 3. 애매한 질문 처리 원칙

질문이 애매하거나 불명확한 경우, 반드시 확인을 요청

#### 확인 절차
1. **질문의 의도 파악**: 사용자가 정확히 무엇을 원하는지 이해했는지 확인
2. **맥락 확인**: 현재 프로젝트의 어떤 부분과 관련된 질문인지 확인
3. **구체화 요청**: 필요한 경우 구체적인 예시나 시나리오 요청

#### Swift/iOS 비유 활용
사용자가 iOS 개발자이므로, Nest.js 개념을 Swift/iOS 맥락으로 비유하여 질문하는 것이 효과적입니다.

**비유 예시**:
- **Module**: Swift Package 또는 Framework
- **Service**: Manager 클래스 또는 Service 객체
- **Controller**: ViewController 또는 API Router
- **Dependency Injection**: Swinject 또는 Protocol-based DI
- **Event-Driven**: NotificationCenter 또는 Combine Publisher

**비유 활용 시나리오**:
```
질문이 애매한 경우:
"이 기능을 어디에 구현해야 할까요?"

확인 질문:
"이 기능은 HTTP 요청을 받아서 처리하는 건가요, 아니면 비즈니스 로직을 수행하는 건가요?
iOS로 비유하면, ViewController에서 직접 처리할 로직인가요, 아니면 별도의 Manager 클래스에 두어야 할 로직인가요?"
```

### 4. 코드 작성 규칙

#### 코드 스타일
- TypeScript strict mode 준수
- Nest.js 공식 스타일 가이드 준수
- 비동기 처리는 async/await 사용
- 에러 처리는 Custom Exception Class 활용

#### 테스트
- 주요 비즈니스 로직은 Unit Test 작성
- Service 메서드는 반드시 테스트 가능하도록 설계
- Mock을 활용한 의존성 격리

### 5. 질문 및 답변 가이드라인

#### 질문 시 고려사항
- 구체적인 시나리오 제공, 현재 구현 상태 설명
- 예상되는 문제점 명시

#### 답변 시 필수 사항
- Nest.js 아키텍처 규칙 준수 여부 확인
- 트레이드오프 분석 포함
- 코드 예시 제공 시 Module, Service, Controller 역할 명확히 구분
- 현재 프로젝트 맥락을 고려한 권장 사항 제시

### 6. 리팩토링 및 개선 제안

#### 리팩토링이 필요한 경우
- Controller에 비즈니스 로직이 있는 경우
- Service에 HTTP 요청/응답 로직이 있는 경우
- 모듈 간 순환 참조가 발생하는 경우
- 테스트하기 어려운 구조인 경우

#### 개선 제안 시
- 현재 구조의 문제점 명확히 지적
- 개선 방안과 트레이드오프 설명
- 단계별 마이그레이션 계획 제시
- 코드 예시 포함

---

## 📌 추가 규칙

### 프로젝트 컨텍스트 유지
- 이 프로젝트는 Nest.js 학습을 목적으로 하는 프로젝트입니다
- 실용적인 기능 구현과 함께 Nest.js의 모범 사례를 따르는 것이 중요합니다
- iOS 개발 경험을 활용하되, Nest.js의 관례를 우선시합니다
