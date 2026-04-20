# docs/reports/

일회성 산출물 보관소. Lighthouse 성능 벤치마크, Playwright E2E 측정, React Compiler 마이그레이션
분석, 컴포넌트 설계 PAAR, Next.js 버전 업그레이드 분석 결과를 여기에 보관함.

> **"영속 지식" vs "일회성 산출물" 구분**
>
> - 설계 결정처럼 **계속 살아있는** 지식 → `docs/architecture/` 또는 `docs/requirements/`
> - 특정 시점의 측정·검증·사건 분석처럼 **스냅샷으로 동결되는** 결과물 → 여기(reports/)

---

## 템플릿 선택 기준

| 쓰려는 내용 | 사용할 템플릿 | 출력 파일 예시 |
|---|---|---|
| Lighthouse 성능 측정, Playwright 렌더링 타이밍, React 벤치마크 | `_spike-test-template.md` | `spike-test-2026-04-20-lighthouse-mobile-run.md` |
| 라이브러리·프레임워크 비교, "X 채택" 결론 포함 (Next.js 버전, 번들러 등) | `_benchmark-template.md` | `benchmark-2026-04-20-react-compiler-migration.md` |
| 외부 API·핵심 시스템 동작 방식 심층 분석 (EMOTIV Cortex SDK, Socket.io 등) | `_api-analysis-template.md` | `api-analysis-2026-04-20-emotiv-cortex-v3.md` |
| 장애·CI 플레이크·회귀·E2E 불안정 등 사후 분석 | `_paar-template.md` | `paar-2026-04-20-playwright-flaky-join-spec.md` |

템플릿 파일 자체(`_*.md`)는 작성 시점에 복사해서 사용함. 이 디렉토리에 바로 편집하지 말 것.

---

## 네이밍 규칙

```
<type>-YYYY-MM-DD-<slug>.md
```

- **type**: `spike-test` / `benchmark` / `api-analysis` / `paar`
- **날짜**: 문서 작성일이 아닌 **작업이 수행된 날짜** 기준
- **slug**: 짧고 검색 가능한 kebab-case
  - 좋은 예: `lighthouse-mobile-run`, `react-compiler-migration`, `playwright-join-e2e`
  - 나쁜 예: `test1`, `분석결과`, `performance`

---

## Reports → ADR 연결 패턴

벤치마크나 스파이크 테스트가 기술 결정으로 이어질 때:

1. 측정 결과를 이 폴더에 report로 작성함 (수치·근거 포함)
2. 그 결정을 `docs/architecture/decisions/ADR-NNN-<slug>.md`에 별도 기록함
3. ADR 본문에 report 파일 링크 추가 — report가 증거, ADR이 결론

**두 파일 모두 유지함.** report는 수치 트레일이고, ADR은 채택 사유임.

---

## PAAR (문제·행동·분석·결과) 사용 시점

PAAR는 사후 분석 포맷임. 사용 대상:

- 운영 장애 (Vercel 배포 실패, SSR hydration 오류 등)
- CI 플레이크 원인 추적 (예: Playwright E2E `join.spec.ts` 타임아웃, Vitest 비결정적 실패)
- React rendering 회귀 — React Compiler 활성화 후 예상치 못한 리렌더링
- "무슨 일이 있었고 어떻게 막을까"가 보존할 가치가 있는 모든 상황

PAAR는 **사후(reactive)** 보고서임. 나머지 세 가지(spike / benchmark / api-analysis)는 **사전(proactive)** 계획 작업임.

---

## git 추적 여부

이 디렉토리는 **git 추적 대상** (팀 공유 지식).

`.gitignore`에 `docs/reports/` 제외 항목이 없으면 기본으로 추적됨.
작업 중 초안(`WIP-*.md`)은 커밋 전 파일명에서 `WIP-` 접두사를 제거할 것.

---

## 예시 파일 (작성 예정)

- (작성 예정) `spike-test-2026-04-20-lighthouse-mobile-run.md` — Vercel 배포 후 모바일 Lighthouse 점수 측정 (LCP/CLS/FID)
- (작성 예정) `benchmark-2026-04-20-react-compiler-migration.md` — React Compiler 활성화 전후 useMemo/useCallback 제거 범위 + bundle size 변화

---

## 템플릿 복사 방법

```bash
# 예: Lighthouse 스파이크 테스트 보고서 시작 시
# (FE 레포 루트에서 실행함)
cp ../templates-review/typescript-template/docs/reports/_spike-test-template.md \
   docs/reports/spike-test-$(date +%Y-%m-%d)-<slug>.md
```

> 템플릿 원본 위치: `Team-project/templates-review/typescript-template/docs/reports/_*.md`
>
> 사용 가능한 템플릿:
> - `_api-analysis-template.md`
> - `_benchmark-template.md`
> - `_paar-template.md`
> - `_spike-test-template.md`
