# AGENTS.md — Mind Signal Frontend

모든 에이전트(Claude Code / Codex CLI / 기타)가 이 레포에서 작업할 때 공통으로 따르는 지시. Claude 전용 메타는 `CLAUDE.md`에 있음. 이 문서는 자가완결 — 상세 규칙은 `.agents/rules/*.md`로 확장됨(단방향, 이 문서가 1차 소스).

> **제품 문서와 작업 상태**: 4레포 공통 문서는 `../docs/`에 있음(구조·계약·데이터는 `docs/architecture/`, 요구사항·추적표는 `docs/requirements/`). 현재 작업 상태 정본은 `../.plans/DASHBOARD.md`.

## 1. 개요

EEG 실험 플랫폼 프론트엔드. Next.js 16 App Router + React 19 + TypeScript strict. Operator(PC 연구원)가 QR 세션을 생성하면 Subject(모바일 피실험자)가 스캔해 참여함. Emotiv EEG 지표 6종이 1초마다 백엔드로 전송되고 Recharts로 렌더링됨. 백엔드 URL: `https://mind-signal-backend-74ab2db9e087.herokuapp.com`. 기본 로케일: 한국어. 자매 레포: `mind-signal-backend`(Express+TS+MongoDB), `mind-signal-data-engine`(Python EEG 엔진).

## 2. 명령어

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 (localhost:3000) |
| `npm run build` | 프로덕션 빌드 |
| `npm run verify` | format:check → typecheck → depcruise → lint → test → build |
| `npm run lint` / `lint:fix` | ESLint, `e2e/` 포함 전체 프로젝트 |
| `npm run test` | Vitest 유닛/컴포넌트 (실 Chromium 브라우저) |
| `npm run test:e2e` | Playwright E2E (별도 러너, `verify`에 미포함) |
| `npm run depcruise` | FSD 경계 검사 (dependency-cruiser) |
| `npm run storybook` | Storybook (6006 포트) |

## 3. 아키텍처 — FSD + Next.js App Router

`src/` 레이어는 진입점으로부터의 거리로 번호가 매겨짐: `07-shared`(비즈니스 로직 없음) → `06-entities`(예약, 미사용) → `05-features` → `04-widgets` → `03-pages` → `app`. 레이어는 **번호가 더 큰** 레이어에서 import 가능하고, 번호가 작은 레이어에서 import하는 것은 금지. `07-shared`는 다른 레이어를 전혀 import하지 않음. `05-features` 슬라이스끼리 직접 import 금지 — 대상 슬라이스의 `index.ts` barrel 경유 필수. `04-widgets`는 `03-pages`를 import 금지. `npm run depcruise`가 이 4가지 위반을 모두 차단함(`severity: error`).

전체 레이어 매트릭스, 슬라이스 구조(`model/`, `ui/`, `index.ts`), 주요 파일 위치 표: `.agents/rules/architecture.md`.

## 4. 하드 금지사항 (코드에서 추론 불가)

- `process.env.NEXT_PUBLIC_*` 직접 접근 금지 — `src/07-shared/config/config.ts`의 `config` 객체 경유.
- `fetch()` 직접 사용 / 별도 `axios.create()` 금지 — 모든 API 호출은 `src/07-shared/api/base.ts`의 `api` 인스턴스 경유(도메인별 모듈로 감싸서 사용, 예: `sessionApi`, `authApi`).
- `useMemo` / `useCallback` / `memo()` 수동 추가 금지 — React Compiler(Forget)가 자동 처리함. 수동 래핑은 Compiler 분석을 방해함.
- 슬라이스 간 barrel 우회 deep import 금지 — 항상 `index.ts` 경유.
- 조건부 렌더링은 `&&` 대신 삼항 연산자 사용(falsy `0` 렌더링 방지).
- 내부 페이지 이동은 `next/link` 사용 — 평문 `<a href>`는 문서 전체를 다시 불러와 소켓과 상태가 날아가고, 버튼 더하기 `router.push`는 새 탭 열기·주소 복사·스크린리더 링크 인식을 잃음. **navbar의 버튼은 URL 이동이 아니라 `setCurrentPage` 상태 전환이라 링크의 선례가 아님**(FE #78에서 이 오독으로 버튼을 골랐다가 되돌림).

상세: `.agents/rules/api-patterns.md`, `.agents/rules/react-components.md`.

## 5. 코딩 컨벤션

2-space 들여쓰기, 80자 라인, es5 trailing comma, LF, UTF-8 — Prettier가 모든 포맷을 담당하고 ESLint는 로직만 검사(0-warning 정책, `e2e/` 포함 전체 프로젝트, `public/mockServiceWorker.js`는 제외). TypeScript strict — 근거 없는 `as`/`@ts-ignore` 금지. 네이밍: 컴포넌트/타입/Enum은 PascalCase, 함수/변수는 camelCase, 모듈 상수는 SCREAMING_SNAKE_CASE. 파일: `kebab-case` + dot-role suffix(예: `signal-chart.component.tsx`, `session.api.ts`); 커스텀 훅은 접미사 없이 `use-{name}.ts`. 폴더: `kebab-case` 복수형 도메인 명사, FSD 레이어는 번호 prefix 유지(앱 레이어만 예외 — Next.js App Router가 폴더명을 `app/`으로 강제해 번호가 없음).

코드 주석은 한국어 명사형 종결(`~함`, `~완료`, `~처리`, `~반환`, `~생성`, `~사용`, `~임`)로 끝냄, 존댓말/동사형 금지. 전체 규칙: `.agents/rules/code-style.md`.

## 6. 검증 루프 — 커밋 전 의무

```bash
npm run verify
# = format:check && typecheck && depcruise && lint && test && build
```

한 단계라도 실패하면 커밋/push 금지 — `--no-verify` 우회 금지. Windows에서는 `npm run format`을 먼저 실행하고 `git diff --name-only`로 CRLF 정규화 파일이 스테이지 밖에 남지 않았는지 확인함. Playwright E2E(`npm run test:e2e`)는 별도이며 `verify`에 포함되지 않음. 상세: `.agents/rules/verification-loop.md`.

## 7. 커밋과 브랜치

Conventional Commits: `{type}({scope}): {description}` (scope 소문자, description 소문자 시작·마침표 없음). 허용 type: `feat fix docs chore refactor test ci revert perf style`. 태스크 1개 = 커밋 1개. `main` 직접 커밋 금지 — 흐름은 `feat/... → PR → dev → PR → main`.

브랜치명은 이 레포의 Work ID 스킴을 따름: `feat/{domain-wNNN}-{slug}` (예: `feat/session-w042-pairing-retry`; Work ID 의미는 10장 참조). 다른 타입은 `fix/`, `hotfix/`, `docs/`, `refactor/`, `chore/` 사용.

모든 커밋은 다음 trailer로 끝남(`noreply` 주소 금지, Claude co-author 라인 금지):

```text
Co-authored-by: KWONSEOK02 <gwonseok02@gmail.com>
```

클론 후 1회 설정: `git config core.hooksPath .githooks` (`pre-push` 게이트 활성화 — `main` push 차단, 커밋 메시지 검사, 클린 워킹 트리 요구). commitlint CI 상태 포함 상세 규칙: `.agents/rules/git-workflow.md`.

## 8. 테스트

러너는 **Vitest**, Jest 아님 — `vi.mock`/`vi.fn`/`vi.spyOn`, snapshot 갱신은 `vitest -u`. 테스트는 소스와 co-located(`*.test.{ts,tsx}`); Playwright E2E는 별도로 `e2e/*.spec.ts`에 위치함. MSW 2.x가 테스트의 API 호출을 격리함 — 테스트에서 실제 백엔드 URL 호출 금지. 상세 체크리스트, snapshot 정책, 회귀 테스트 레이어 가이드: `.agents/rules/test-modification.md`.

## 9. 환경 변수 (`.env.local`)

```dotenv
NEXT_PUBLIC_API_URL=<backend_url>
NEXT_PUBLIC_SOCKET_URL=<backend_url>
NEXT_PUBLIC_PAIRING_TIMEOUT=300
NEXT_PUBLIC_NODE_ENV=local
```

`.env.example`은 추적 대상, `.env.local`은 추적 제외.

## 10. Work ID와 `.plans`

mind-signal은 4레포 제품이므로 `.plans/` 작업 상태는 레포별이 아니라 `mind-signal/.plans/`(제품 단위) 한 곳에 있음. 작업 폴더는 `{DOMAIN}-W{NNN}[-{slug}]` — 도메인(`ANALYSIS`, `EEG`, `SESSION`, `OPS`, `DOCS`)이 **독립적으로** 채번되고, 전역 단일 시퀀스가 아님. 신규는 W001부터 시작; 2026-07-30 이전 legacy에 소급 부여한 번호는 W101부터(그래서 `SESSION-W114`는 전체 114번째가 아니라 SESSION 소급 14번째). 번호는 영구 식별자이며 재사용·재번호화하지 않음 — 시간순은 번호가 아니라 레지스트리의 날짜 열로 읽음.

정본 문서: `mind-signal/.plans/DASHBOARD.md`(현재 작업), `HANDOFF.md`(세션 핸드오프), `README.md`(ID/상태 규칙, v1.3 LOCK), `LEGACY-REGISTRY.md`(소급 ID 매핑).

## 11. 문서화

기능 요구사항을 구현하는 PR은 같은 PR에서 `docs/requirements/FR-XX-<slug>.md`를 추가하고 RTM row를 갱신함. 기술 결정은 `docs/architecture/decisions/ADR-NNN-<slug>.md`. FE·BE 양쪽에 적용되는 ADR은 `Applies to: both repos`를 붙이고 양쪽에 복사함. 전체 문서 타입 맵과 라이프사이클: `.agents/rules/documentation.md`.
