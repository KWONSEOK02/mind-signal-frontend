# mind-signal-frontend (뇌파 시그널 프로젝트)

## 1. 📝 프로젝트 개요 (Project Overview)
**Next.js (App Router)** 환경에서 **FSD(Feature-Sliced Design)** 구조를 채택하여 설계된 뇌파 분석 및 매칭 서비스 인터페이스입니다.

---
## 2. 🛠️ Tech Stack
 구분 | 기술 |
| :--- | :--- |
| **front-end** | `Next.js`, `TypeScript`, `JWT`, `Jest`, `ESLint` `React Query`, `Zustand`, `Zod`, `Tailwind CSS`|
| **External API** | `Google Gemini (LLM)`|
| **DevOps** | `vercel`|
---
## 3. 🚀 프로젝트 클론 및 각종 명령어

### 저장소 복제
```bash
git clone https://github.com/KWONSEOK02/mind-signal-frontend.git
```

### 의존성 설치
```bash
npm install
```

### 환경 변수 설정
.env.example 복사해서 .env.local (로컬) / .env.test (테스트)파일을 생성합니다.

### 개발 서버 실행
```bash
npm run dev 
``` 
### 테스트 서버 실행
```bash
npm run test
``` 
### prettier 실행 (코드 포맷 정리)
```bash
npm run format
``` 
### 린트 검사
```bash
npm run lint
 ``` 
### 빌드 검사
```bash
npm run build
 ``` 
---

## 5. 📁 프로젝트 구조
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

### 💡 폴더 구조 표현 원칙

이 프로젝트의 FSD (Feature-Sliced Design) 폴더 구조는 다음과 같은 원칙에 따라 README.md에 표현됩니다:

- **`01-app/` 및 `07-shared/`**: 애플리케이션의 엔트리/전역 규약(예: app wiring, 전역 미들웨어, 공통 에러/설정 등)을 담는 계층입니다. **이 계층 내에서는 `01-app/`의 모든 내부 파일과 `07-shared/config/config.ts` 파일의 존재를 상세히 표기합니다.** 온보딩에 중요한 진입점이 있는 경우, README에 내부 구조를 상대적으로 상세히 표기합니다.
- **`02-processes/` ~ `06-entities/`**: 비즈니스 도메인/기능 단위로 확장되는 계층입니다. README에는 최상위 폴더(도메인)만 노출하고, **그 하위 계층(예: `05-features/auth/` 또는 `06-entities/users/`)은 1단계 하위 폴더까지만 표시합니다.** 내부 파일 및 더 깊은 하위 폴더 구조는 원칙적으로 각 도메인의 `index.ts` (Public API)를 통해 접근하도록 합니다. 이를 통해 계층 간 결합도를 낮추고 내부 변경의 영향을 최소화합니다.
- **세분화 기준**: 한 폴더에 파일이 증가해 가독성이 떨어지면(예: 6~8개 이상) `api/`, `model/`, `lib/` 등 하위 폴더로 점진적으로 분리하는 것을 원칙으로 합니다.

---

## 6. 🤝 협업 가이드라인 (Contribution Guidelines)

### Git Workflow
- `master` (Production): 최종 배포 브랜치
- `develop` (Staging): 개발 완료 코드를 병합하는 메인 브랜치
- `feat/*`, `fix/*`, `docs/*`: 기능별, 목적별 브랜치

### 작업 흐름
1. `develop` 브랜치에서 `feat/my-new-feature` 브랜치를 생성하여 작업을 시작합니다.
2. 기능 완료 후 **Pull Request(PR)** 를 생성합니다.
3. 1명 이상의 팀원에게 **Approve(리뷰 승인)** 를 받습니다.
4. Merge 전, `develop` 최신 변경 사항을 `pull` 하여 충돌을 최소화합니다.

### 프로젝트 규칙
- **PR은 작은 단위로.** 하나의 PR은 하나의 기능에만 집중합니다.
- 세부 작업은 체크리스트로 관리합니다.
- 작업 충돌을 방지하기 위해 회의 중 역할을 명확히 나눕니다.

### 개발 가이드라인
- 코딩 스타일: **ESLint + Prettier** 기준
- 변수 네이밍 규칙: **camelCase / PascalCase**   
- 폴더 네이밍 규칙: **kebab-case** (-)사용, **복수형**(s)사용, 도메인/개념 단위 명사로만 구성, 역할(role)은 폴더가 아니라 내부 파일에서 표현
- 파일 네이밍 규칙: **단수형 사용**, **kebab-case + dot(.)** role suffix, 역할이 있을 때만 dot으로 구분, 의미 단위가 하나면 dot 없이 사용 가능
- 주석 스타일: **JSDoc (Google Style)**
- TypeScript strict mode 사용

### 커밋 및 브랜치 컨벤션
- 커밋 메시지 및 브랜치는 **Conventional Commits 규칙 준수**


📄 상세 컨벤션 문서 (Notion)  

---

## 📝 커밋 컨벤션
**Conventional Commits** 규칙 준수

- `feat:` 새 기능
- `fix:` 버그 수정
- `docs:` 문서 변경
- `style:` 코드 포매팅, 공백/정렬, 주석 정리 등 로직 변경이 없는 스타일 수정
- `refactor:` 코드 리팩토링
- `perf:` 성능 개선
- `test:` 테스트 관련
- `chore:` 빌드·배포·패키지 설정, 설정 파일 수정, 잡무성 정리 작업
- `ci:` CI 설정
- `revert:` 이전 커밋 되돌리기

**메시지 형식**
```
feat(sessions): pairing token 기반 세션 생성 API 추가
style(auth): 불필요한 주석 제거 및 포맷 정리
refactor(shared): 공통 설정 로딩 구조 개선
docs(readme): 커밋 컨벤션 규칙 수정
```
---

## 🌱 Git 브랜치 네이밍 컨벤션 (요약)

- **feature/** → 새로운 기능 / 알고리즘 / 환경 추가  
  예) `feature/eeg-record-upload`, `feature/admin-access-control`

- **fix/** → 버그 수정  
  예) `fix/session-expire-time-bug`, `fix/jwt-expiration-handling`

- **hotfix/** → 긴급 수정  
  예) `hotfix/env-secret-missing`

- **refactor/** → 코드 구조 개선  
  예) `refactor/auth-middleware-split`, `refactor/shared-error-structure`

- **docs/** → 문서 작업  
  예) `docs/folder-naming-convention`, `docs/update-readme-structure`

---
