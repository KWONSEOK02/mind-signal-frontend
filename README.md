# mind-signal-frontend

## 1. 프로젝트 개요 (Project Overview)

**Mind Signal Frontend**는 EEG(뇌파) 기반 2인 심리 동기화 측정 · 분석 서비스의 **프론트엔드**입니다.
Operator가 실험 QR 세션을 생성하면 Subject가 모바일로 QR을 스캔해 참여하고, Emotiv Cortex API로 수집된 실시간 EEG·MET 데이터를 Socket.io로 받아 Recharts로 시각화합니다.
졸업 프로젝트로, 팀 협업 + 실시간 파이프라인 운영 + 배포 파이프라인 경험을 핵심 목표로 합니다.

---

## 2. Tech Stack

| 구분 | 기술 |
| :--- | :--- |
| **Framework** | `Next.js 16` (App Router), `React 19`, `TypeScript strict` |
| **Architecture** | `Feature-Sliced Design` (커스텀 번호 체계, `dependency-cruiser` 검증) |
| **Styling** | `Tailwind CSS`, `Recharts` |
| **State / Data** | `Zustand`, `TanStack Query`, `Zod` |
| **Real-time** | `Socket.io client` (EEG 실시간 스트림) |
| **Test** | `Vitest` + `@vitest/browser` (Chromium), `Playwright` (E2E), `Storybook` + `Chromatic`, `MSW` |
| **Quality** | `ESLint`, `Prettier`, `dependency-cruiser` (FSD 경계 검증) |
| **Backend** | `Express + MongoDB + Redis + Socket.io` (별도 레포: mind-signal-backend) |
| **Data Engine** | `FastAPI + Emotiv Cortex API` (별도 레포: mind-signal-data-engine) |
| **External API** | `Google Gemini`, `Google OAuth`, `Kakao OAuth` |
| **DevOps** | `Vercel` (커스텀 도메인 `www.neurosignal.kr`) |

---

## 3. 프로젝트 클론 및 각종 명령어

### 저장소 복제

```bash
git clone https://github.com/KWONSEOK02/mind-signal-frontend.git
```

### 의존성 설치

```bash
npm install
```

### 환경 변수 설정

`.env.example`을 복사해서 `.env.local` (로컬) / `.env.test` (테스트) 파일을 생성합니다.

```bash
cp .env.example .env.local
```

### 개발 서버 실행

```bash
npm run dev
```

### 유닛 · 컴포넌트 테스트 (Vitest + Playwright browser)

```bash
npm run test
```

### E2E 테스트 (Playwright)

```bash
npm run test:e2e
```

### 포맷 자동 수정 / 검증

```bash
npm run format         # Prettier --write
npm run format:check   # CI와 동일 (변경 없음, 검증만)
```

### 린트

```bash
npm run lint           # ESLint
npm run lint:fix       # 자동 수정
```

### FSD 아키텍처 경계 검증 (dependency-cruiser)

```bash
npm run depcruise
```

### 빌드

```bash
npm run build
```

### Storybook

```bash
npm run storybook
```

---

## 4. 프로젝트 구조

```
mind-signal-frontend/
├── node_modules/           # Node.js 모듈
│
├── src/                    # 애플리케이션 소스 코드
│   ├── app/             # 애플리케이션의 엔트리 포인트, 전역 설정, 라우터 정의 //(01-app 역할 대체)next.js의 라우팅 설정 떄문에 번호 안 붙임
│   │   ├── favicon.ico     # Next.js 기본 favicon
│   │   ├── globals.css     # 전역 스타일
│   │   ├── layout.tsx      # Next.js App Router 레이아웃
│   │   └── page.tsx        # Next.js App Router 루트 페이지
│   │
│   ├── 02-processes/       # 비즈니스 프로세스 및 워크플로우 (여러 피처를 조합)
│   │
│   ├── 03-pages/           # 각 라우트별 실제 페이지 컨텐츠 (App Router의 page.tsx에서 임포트하여 사용)
│   │
│   ├── 04-widgets/         # 위젯 (Header, Footer, SurveyList 등 독립적인 UI 블록)
│   │
│   ├── 05-features/        # 특정 기능 구현 (예: 설문 제출, 페어링 시작 버튼 등 상호작용 로직)
│   │
│   ├── 06-entities/        # 도메인 엔티티 (UserCard, EegGraph, SurveyQuestion 등 도메인 모델 관련 UI)
│   │
│   └── 07-shared/          # 범용 유틸리티, 설정, 상수 (공통 UI(Button, Input), API 클라이언트(Axios), Utils)
│       ├── api/            # 공통 API 클라이언트 또는 유틸리티
│       ├── config/         # 환경 설정
│       │   └── config.ts   #
│       ├── lib/            # 공통 라이브러리, 헬퍼 함수 (예상)
│       ├── middlewares/    # 공통 미들웨어 (예상)
│       └── types/          # 공통 타입 정의
│
├── .env.example            # 환경 변수 템플릿 (Git 추적)
├── .env.local              # 로컬 환경 변수 (Git 추적 제외)
├── .env.test               # 테스트 환경 변수 (Git 추적 제외)
├── .eslint.config.mjs      # ESLint 설정 파일
├── .gitattributes          # Git 속성 설정 파일
├── .gitignore              # Git이 무시할 파일 및 폴더 목록
├── .prettierignore         # Prettier가 무시할 파일 및 폴더 목록
├── .prettierrc             # Prettier 설정 파일
├── jest.config.js          # Jest 테스트 설정 파일
├── next-env.d.ts           # Next.js 환경 정의 파일
├── next.config.ts          # Next.js 설정 파일
├── package-lock.json       # 패키지 의존성 잠금 파일
├── package.json            # 프로젝트 메타데이터 및 스크립트
├── postcss.config.mjs      # PostCSS 설정 파일
├── tailwind.config.ts      # tailwind 설정 파일(QR 스타일)
├── public/                 # 정적 파일
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── README.md               # 프로젝트 설명 파일
└── tsconfig.json           # TypeScript 컴파일러 설정 파일
```

### 폴더 구조 표현 원칙

이 프로젝트의 FSD (Feature-Sliced Design) 폴더 구조는 다음과 같은 원칙에 따라 README.md에 표현됩니다:

- **`01-app/` 및 `07-shared/`**: 애플리케이션의 엔트리/전역 규약(예: app wiring, 전역 미들웨어, 공통 에러/설정 등)을 담는 계층입니다. **이 계층 내에서는 `01-app/`의 모든 내부 파일과 `07-shared/config/config.ts` 파일의 존재를 상세히 표기합니다.** 온보딩에 중요한 진입점이 있는 경우, README에 내부 구조를 상대적으로 상세히 표기합니다.
- **`02-processes/` ~ `06-entities/`**: 비즈니스 도메인/기능 단위로 확장되는 계층입니다. README에는 최상위 폴더(도메인)만 노출하고, **그 하위 계층(예: `05-features/auth/` 또는 `06-entities/users/`)은 1단계 하위 폴더까지만 표시합니다.** 내부 파일 및 더 깊은 하위 폴더 구조는 원칙적으로 각 도메인의 `index.ts` (Public API)를 통해 접근하도록 합니다. 이를 통해 계층 간 결합도를 낮추고 내부 변경의 영향을 최소화합니다.
- **세분화 기준**: 한 폴더에 파일이 증가해 가독성이 떨어지면(예: 6~8개 이상) `api/`, `model/`, `lib/` 등 하위 폴더로 점진적으로 분리하는 것을 원칙으로 합니다.

---

## 5. 협업 가이드라인 (Contribution Guidelines)

### Git Workflow

- `main` (Production): 최종 배포 브랜치 — 직접 push 금지. `dev`에서만 PR 올림
- `dev` (Staging): 개발 통합 브랜치 — 모든 `feat/*` 기능 브랜치의 PR 대상
- `feat/#{이슈번호}-{작업명}`: 이슈 기반 기능 브랜치
- `fix/#{이슈번호}-{작업명}`: 이슈 기반 버그 수정 브랜치
- `docs/#{이슈번호}-{작업명}`: 문서 작업 브랜치
- `refactor/#{이슈번호}-{작업명}`, `chore/#{이슈번호}-{작업명}`: 그 외 목적별 브랜치

### 작업 흐름 (모든 변경은 이슈 기반)

모든 코드 변경은 반드시 **GitHub Issue를 먼저 생성**한 뒤 진행합니다. **`main` 직접 commit은 금지**이며, `dev` 직접 commit도 원칙적으로 금지합니다. 오타·로컬 세팅·사소한 문서 수정도 예외 없이 이슈 → 브랜치 → PR 절차를 따릅니다.

1. **Issue 생성**: GitHub Issues → New Issue → 템플릿 선택 후 작업 내용 등록 (제목: `feat: 작업 내용`)
2. **브랜치 생성**: 이슈 페이지 Development → Create a branch → **base를 `dev`로 설정** → `타입/#{이슈번호}-{작업명}` 형식
3. **개발**: 기능 구현. 커밋 전 로컬 검증(§6) 통과 필수
4. **PR**: **base를 `dev`로 설정**하여 PR 생성 (main 아님). Reviewers / Assignees / Labels 지정
5. **코드리뷰**: 팀원 1명 이상의 Approve + CodeRabbit 리뷰 확인
6. **머지**: 승인 완료 후 `feat/*` → `dev` 머지
7. **Issue Close**: 머지 직후 해당 이슈 close
8. **릴리스**: `dev`가 안정화되면 `dev` → `main` PR을 별도 생성, CI + CodeRabbit 리뷰 통과 후 머지

### 프로젝트 규칙

- **PR은 작은 단위로.** 하나의 PR은 하나의 이슈 · 하나의 기능에만 집중합니다.
- 세부 작업은 이슈 체크리스트로 관리합니다.
- 머지 직전 `dev` 최신 변경 사항을 `pull` 하여 충돌을 최소화합니다.

### 개발 가이드라인

- 코딩 스타일: **ESLint + Prettier** 기준
- 변수 / 함수 네이밍: **camelCase**, 컴포넌트: **PascalCase**
- 폴더 네이밍: **kebab-case**, 복수형 (도메인/개념 단위 명사로만 구성, 역할은 파일명에서 표현)
- 파일 네이밍: **단수형**, **kebab-case + dot(.)** role suffix (예: `auth-modal.tsx`, `use-auth.ts`)
- TypeScript strict mode, `any` 금지 — `unknown` 또는 명시 타입
- **React Compiler (Forget) 활성** — `useMemo` / `useCallback` / `memo()` 수동 추가 금지 (Compiler가 자동 처리)
- 주석 스타일: JSDoc (Google Style), 종결 어미는 명사형 (`~함`, `~처리`, `~반환`)

---

## 6. CI 파이프라인 & AI 코드 리뷰

PR이 올라오면 아래 순서로 자동 검증됩니다. **모든 단계를 통과해야 머지 가능합니다.**

```
  PR 생성
     ↓
┌─── CI 자동 검증 ──────────────────────────────┐
│ 1. format:check    → 포맷 (Prettier)          │
│ 2. typecheck       → 타입 에러 (tsc)          │
│ 3. depcruise       → FSD 레이어 경계          │  ← FAIL 시
│ 4. lint            → ESLint 정적 분석         │     머지 차단
│ 5. test            → Vitest + Playwright      │
│ 6. build           → Next.js 프로덕션 빌드    │
└────────────────────────────────────────────────┘
     ↓ CI 통과한 코드만
┌─── CodeRabbit AI 리뷰 ────────────────────────┐
│ • FSD 레이어 위반 / any 타입 / use client     │
│ • 비즈니스 로직 / 보안 / 테스트 커버리지      │
└────────────────────────────────────────────────┘
```

### CI가 자동으로 잡아주는 것

| 도구 | 검증 항목 |
|------|----------|
| **Prettier** | 포맷, 들여쓰기, 줄바꿈 |
| **TypeScript (tsc)** | 타입 에러, `any` 사용, strict 위반 |
| **dependency-cruiser** | FSD 레이어 의존성 위반 (no-db-in-features, no-upward-from-shared 등 4규칙) |
| **ESLint** | 코드 품질, React hooks 규칙, import 순서 |
| **Vitest + Playwright browser** | 유닛 · 컴포넌트 테스트 (Chromium 실브라우저) |
| **Next.js build** | 빌드 에러, 정적 최적화 실패 |

### PR 전 로컬에서 확인하는 법

```bash
npm run format        # 포맷 자동 수정
npm run typecheck     # 타입 검사
npm run depcruise     # FSD 경계 검사
npm run lint:fix      # 린트 자동 수정
npm run test          # 테스트
npm run build         # 빌드
```

순서: `format → typecheck → depcruise → lint:fix → test → build` — 한 단계라도 실패하면 멈추고 수정 후 재실행.

---

## 7. 커밋 메시지 컨벤션

**Conventional Commits** 규칙을 따릅니다. Gitmoji 이모지는 사용하지 않습니다.

### 형식

```
{type}({scope}): {description}
```

예시:

```
feat(signals): add SEQUENTIAL measurement state machine hook
fix(results): handle null similarity data fallback
refactor(pairing-engine): split subject state transition logic
docs(readme): clarify CI pipeline steps
```

### 타입 목록

| 타입 | 용도 |
|------|------|
| feat | 새 기능 |
| fix | 버그 수정 |
| refactor | 리팩토링 (기능 변경 없는 구조 개선) |
| style | 포맷·세미콜론·공백 (로직 변경 없음) |
| docs | 문서 변경 |
| chore | 빌드·설정·패키지 |
| test | 테스트 추가·수정 |
| perf | 성능 개선 |
| ci | CI 설정 |
| revert | 이전 커밋 되돌리기 |

- 태스크 1개 = 커밋 1개
- `main` 브랜치 직접 commit 금지 — 반드시 `feat/#{이슈번호}-{작업명}` 브랜치에서 작업 후 `dev`로 PR

---

## 8. 브랜치 네이밍 컨벤션

```
{타입}/#{이슈번호}-{작업명}
```

예시:

- `feat/#14-sequential-measurement`
- `fix/#27-socket-reconnect`
- `docs/#31-readme-ci-section`
- `refactor/#22-pairing-engine-split`
- `chore/#18-upgrade-next-16`

이슈에서 "Create a branch"로 자동 생성할 때 base branch는 항상 `dev`로 설정합니다.
