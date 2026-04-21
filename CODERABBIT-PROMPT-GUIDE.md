# CodeRabbit Prompt Guide — Mind Signal Frontend

`.coderabbit.yaml`의 `path_instructions`를 작성·확장할 때 참조하는 가이드.
이 문서는 `.coderabbit.yaml` 설정 파일의 companion 문서임 — 파일 자체를 대체하지 않음.

---

## 1. CodeRabbit이란

CodeRabbit은 GitHub PR에 자동으로 코드 리뷰를 달아주는 AI 리뷰어임.
PR이 열리면 요약(high-level summary), 파일별 인라인 코멘트, 이슈 심각도 태그를 자동 생성함.
레포별 규칙은 `.coderabbit.yaml`로 정의하고, `path_instructions`에 경로 패턴별 리뷰 프롬프트를 작성함.

CodeRabbit은 **로직·아키텍처·보안 리뷰** 도구임. 포맷팅(Prettier/ESLint가 담당)과 커밋 메시지 컨벤션(commitlint가 담당)은 CodeRabbit의 역할이 아님.

---

## 2. MS(Mind Signal) FE 레포에서의 사용 원칙

### 2-1. 한국어 명사형 종결 주석 감시

이 레포의 코딩 컨벤션에 따라 모든 코드 주석은 명사형으로 종결함.

- 올바른 형식: `// 소켓 연결 초기화함`, `// API 응답 파싱함`, `// 인증 토큰 주입 완료`
- 잘못된 형식: `// 소켓 연결을 초기화합니다`, `// API 응답을 파싱하는 함수`, `// ~하는 로직`

CodeRabbit이 이 규칙 위반을 발견하면 NIT 코멘트를 달도록 `path_instructions`에 명시함.

### 2-2. FSD 번호 레이어 경계 위반 감지

FE FSD 레이어 구조 (번호가 클수록 더 foundational):

```text
01-app/       ← Next.js routes, Providers, root layout
03-pages/     ← page-level components (app/에서 import)
04-widgets/   ← Navbar, Footer, SignalChart
05-features/  ← auth, sessions, signals, chat-assistant
07-shared/    ← api, config, types, constants, utils
```

의존성 방향: 번호가 작은 레이어 → 번호가 큰 레이어 import만 허용.
역방향 import(예: `07-shared`에서 `05-features` import)는 MUST_FIX 위반.

`dependency-cruiser`가 1차 방어(CI 게이트), CodeRabbit은 리뷰 레벨 2차 방어임.
CodeRabbit은 `dependency-cruiser`가 잡지 못하는 **의도적 경계 우회 패턴** (예: 동적 import, 우회 재export)을 리뷰 코멘트로 지적함.

### 2-3. React 19 + React Compiler 관례 — manual 최적화 지양

React Compiler (Forget)가 활성화되어 있음. 다음 패턴은 불필요하거나 위험함:

- `useMemo`, `useCallback` 수동 추가 — Compiler가 자동 처리하므로 SHOULD_FIX
- `React.memo()` 불필요한 래핑 — Compiler가 자동 처리하므로 SHOULD_FIX
- 이미 Compiler가 처리 중인 컴포넌트에 중복 최적화 추가 시 SHOULD_FIX 코멘트

### 2-4. `'use client'` 디렉티브 명시 위치 검증

- `useState`, `useEffect`, `useRef`, 브라우저 API(`localStorage`, `window` 등), 이벤트 핸들러를 사용하는 모든 컴포넌트 최상단에 `'use client'` 선언 필수
- 누락 시 MUST_FIX (SSR 환경에서 hydration 에러 발생)
- `'use client'` 없이 Client-only API를 사용하는 컴포넌트 = MUST_FIX

### 2-5. Zod form 검증 + `07-shared/config/config.ts` env parse

- 환경변수는 반드시 `src/07-shared/config/config.ts`의 `config` 객체 경유
- `process.env.NEXT_PUBLIC_*` 직접 접근 = MUST_FIX
- form onSubmit 핸들러에서 Zod 검증 없이 서버로 전송 = SHOULD_FIX

### 2-6. Axios instance 경유 강제 (직접 fetch/axios 금지)

- 모든 API 호출은 `src/07-shared/api/base.ts`의 Axios 인스턴스 사용 필수
- `fetch()` 직접 사용 = MUST_FIX (JWT 인터셉터 우회)
- `axios.create()` 별도 인스턴스 생성 = MUST_FIX
- 자세한 패턴: `.claude/rules/api-patterns.md` 참조

---

## 3. 프롬프트 패턴 레시피 — FE 특화 4개

`.coderabbit.yaml`의 `path_instructions`에 붙여 넣어 재사용 가능한 프롬프트 예시.

### 레시피 1: TSX 컴포넌트 — FSD 경계 체크

```yaml
- path: "src/**/*.tsx"
  instructions: |
    FSD layer boundary check (번호가 작은 레이어는 번호가 큰 레이어만 import 가능):
    - 07-shared MUST NOT import from 05-features, 04-widgets, 03-pages.
    - 05-features MUST NOT import from 04-widgets or 03-pages.
    - Flag any upward cross-layer import as MUST_FIX.

    React Compiler (Forget) is active — do NOT add manual memoization:
    - Manual `useMemo`, `useCallback`, or `React.memo()` without a documented reason = SHOULD_FIX.
    - Flag with: "React Compiler handles this automatically. Remove unless you have a measured perf reason."

    Security:
    - Hardcoded secrets or API keys = MUST_FIX.
    - `dangerouslySetInnerHTML` without explicit sanitization = MUST_FIX.
    - Unvalidated redirects = MUST_FIX.

    Korean comment style:
    - All inline comments must end in a noun form (명사형 종결): ~함, ~임, ~반환, ~처리, ~사용.
    - Sentence-ending forms (~합니다, ~하는 함수) are a NIT violation.

    Do NOT comment on formatting — Prettier and ESLint own that.
```

### 레시피 2: Hook 파일 — Server/Client boundary + `'use client'` 검증

```yaml
- path: "src/**/*.ts"
  instructions: |
    Server/Client boundary:
    - Any hook or utility using `useState`, `useEffect`, `useRef`, `localStorage`,
      `window`, `document`, or event handlers must be in a file with `'use client'`
      at the top, OR called only from a component with `'use client'`.
    - Flag missing `'use client'` in a file that uses browser APIs as MUST_FIX.

    API call pattern:
    - All HTTP calls must go through the Axios instance in `src/07-shared/api/base.ts`.
    - Direct `fetch()` or standalone `axios.create()` = MUST_FIX.
    - `process.env.NEXT_PUBLIC_*` direct access = MUST_FIX — use `config` from config.ts.

    FSD boundary:
    - 07-shared utilities MUST NOT import from 05-features or above.
    - Flag cross-layer upward imports as MUST_FIX.

    Do NOT comment on formatting.
```

### 레시피 3: Route/API 핸들러 — Zod validation + `NextResponse.json` 사용 확인

```yaml
- path: "src/app/**/route.ts"
  instructions: |
    Next.js App Router API route rules:
    - All POST/PUT/PATCH handlers must validate the request body with Zod before processing.
      Missing validation = MUST_FIX.
    - Responses must use `NextResponse.json(...)` — never `res.json()` (Pages Router style).
      Wrong response method = MUST_FIX.
    - Auth-protected routes must verify the JWT token early in the handler.
      Flag missing auth check on routes that access user-specific data as MUST_FIX.
    - Errors must not be silently swallowed (empty catch block) = MUST_FIX.
    - Environment access via `config` object only — direct `process.env.*` = MUST_FIX.

    Do NOT comment on formatting or import ordering.
```

### 레시피 4: 한국어 명사형 주석 스타일 NIT 패턴

```yaml
- path: "src/**"
  instructions: |
    Korean comment convention (명사형 종결):
    - All Korean comments in code blocks must end with a noun-form terminator:
      ~함, ~임, ~반환, ~생성, ~처리, ~사용, ~완료, ~연결, ~구독, ~발생, ~주입.
    - Prohibited endings: ~합니다, ~입니다, ~하는 함수, ~하는 역할, ~하는 로직.
    - Flag violations as NIT with a corrected version in the comment.
    - English comments are exempt from this rule.
```

---

## 4. `.coderabbit.yaml` 편집 가이드

### 현재 FE `.coderabbit.yaml` 설정 요약

현재 `mind-signal-frontend/.coderabbit.yaml`의 핵심 설정:

- `language: ko-KR` — 리뷰 코멘트 언어 한국어
- `reviews.profile: chill` — 보수적인 리뷰 강도 (과도한 nitpick 최소화)
- `reviews.auto_review.enabled: true` — PR 자동 리뷰 활성화 (drafts 제외)
- `reviews.auto_review.base_branches: [main, dev]` — main, dev 대상 PR만 자동 리뷰
- `chat.auto_reply: true` — `@coderabbitai` 멘션 시 자동 답변
- `reviews.path_instructions` — 경로별 **6개** 규칙 등록됨:
  - `src/07-shared/**`: 최하위 레이어 import 위반 + `process.env` 직접 접근 금지
  - `src/05-features/**`: FSD 상위 레이어 import 금지 + Axios 인스턴스 사용 강제
  - `src/03-pages/**`: 다른 page 직접 import 금지
  - `src/**/*.tsx`: `any` 타입 금지 + `'use client'` 위치 확인 + 보안 점검
  - `src/**/*.test.{ts,tsx}`: happy path + error path 커버리지
  - `e2e/**/*.spec.ts`: flaky selector 방지 + 테스트 간 상태 격리

> **주의**: `ignore_formatting` 키가 현재 `.coderabbit.yaml`에 없음.
> 포맷팅 코멘트를 억제하려면 각 `path_instructions` 항목에 `"Do NOT comment on formatting."` 한 줄 추가 권장.

### 새 규칙 추가 시 주의점

1. **YAML 들여쓰기**: `path_instructions` 항목은 2-space 들여쓰기. `instructions` 블록은 `|` (리터럴 블록 스칼라) 사용.

   ```yaml
   path_instructions:
     - path: "src/**/*.tsx"
       instructions: |
         첫 번째 줄.
         두 번째 줄.
   ```

2. **glob 패턴**: `"src/**/*.tsx"` (큰따옴표 필수). `**`는 재귀 디렉토리 매칭.
   - `src/**/route.ts` — App Router API route 파일
   - `src/07-shared/**` — shared 레이어 전체
   - `e2e/**/*.spec.ts` — Playwright E2E 테스트

3. **tone_instructions 우선순위**: `profile: chill`은 전체 리뷰 강도를 낮춤.
   path_instructions 안에서 `MUST_FIX`로 명시하면 chill 설정보다 강제력이 높음.
   중요한 규칙은 반드시 `MUST_FIX`로 태그할 것.

4. **`chat.auto_reply: true`** — CodeRabbit이 PR 코멘트에 자동 답변함.
   CodeRabbit에게 직접 질문하려면 PR 코멘트에 `@coderabbitai` 멘션.

---

## 5. 리뷰 사이클

```text
PR 생성
  ↓
CodeRabbit 자동 분석 (수 분 소요)
  ↓
high-level summary + 파일별 인라인 코멘트 생성
  ↓
개발자: 코멘트 확인 + 수정
  ↓
`@coderabbitai review` 코멘트 → 재리뷰 트리거
  ↓
머지
```

### 심각도 3단계

| 태그 | 의미 | 대응 |
|---|---|---|
| `MUST_FIX` | 아키텍처·보안·기능 버그 — 머지 전 반드시 수정 | 즉시 수정 후 재리뷰 |
| `SHOULD_FIX` | 품질·유지보수성 이슈 — 강력 권장 | 현 PR 또는 후속 PR |
| `NIT` | 스타일·네이밍 소수의견 — 선택적 | 무시하거나 기회 시 반영 |

> **Phase 14 PR #40 (SEQUENTIAL UX) 사례**: FE PR에서 CodeRabbit은 BE PR #41 대비 nitpick 수가 적었음.
> React Compiler 활성화와 Prettier/ESLint 사전 통과 덕분에 포맷·최적화 관련 코멘트가 줄어든 것으로 분석됨.
> MUST_FIX는 후속 PR로 미루지 않는 것을 원칙으로 함.

---

## 6. 기존 `.coderabbit.yaml` 설정 요약

파일 위치: `mind-signal-frontend/.coderabbit.yaml`

| 항목 | 현재 값 | 비고 |
|---|---|---|
| 리뷰 언어 | `ko-KR` | 한국어 코멘트 |
| 리뷰 강도 | `chill` | 과도한 nitpick 방지 |
| 포맷팅 무시 | 설정 없음 (각 path_instructions에 개별 명시 필요) | BE는 `ignore_formatting: true` 있음 |
| 자동 리뷰 | `true` (draft 제외) | main, dev 브랜치 대상 |
| 채팅 자동 답변 | `true` | `@coderabbitai` 멘션 시 |
| path_instructions 수 | 6개 | 07-shared / 05-features / 03-pages / tsx / test / e2e |

현재 `path_instructions`의 `src/05-features/**` 항목에 FSD 번호 레이어 방향 규칙이 명시되어 있음.
React Compiler 관련 `useMemo`/`useCallback` 지양 규칙 및 `'use client'` 위치 검증은 `src/**/*.tsx` 항목에 추가 권장.
