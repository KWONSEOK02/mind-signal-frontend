# ADR-002: FE 테스트 러너로 Vitest를 유지함

<!-- ⚠️ 이 ADR은 FE(mind-signal-frontend) 의사결정임.
     BE는 정보성 참조 사본 `ADR-002-fe-vitest-reference.md`으로 별도 보관.
     BE 에이전트는 이 ADR을 읽고 Vitest 관련 도구를 도입하는 일이 없도록 주의할 것.
     BE는 여전히 Jest + supertest를 사용함. -->

- **Status**: Accepted
- **Date**: 2026-04-18
- **Applies to**: FE only (primary decision — BE는 `ADR-002-fe-vitest-reference.md` 참조)
- **Deciders**: @gs07103
- **Related**: ADR-001 (번호 FSD 레이어), ADR-003 (dependency-cruiser)

## Context

mind-signal-frontend는 Vitest(`@vitest/browser`)를 사용하여 141개 테스트를
실브라우저 환경에서 실행 중임. Phase 15 retrofit 과정에서 FE 테스트 러너를
Jest로 교체할지 여부를 결정해야 함.

- 기존 테스트: 141개 (`npm run test` 기준, PR #36 머지 이후)
- 현재 환경: `@vitest/browser` + `@testing-library/jest-dom/vitest`
- FE `feat/ci-architecture-enforcement` 브랜치에서 64개 추가 테스트 모두 Vitest로 작성됨

## Decision

FE는 Vitest를 유지함. Jest로의 교체는 수행하지 않음.

## Alternatives considered

### Option A: Jest + jsdom으로 교체

템플릿 표준(typescript-template)과 동일한 테스트 러너로 통일됨.

**Trade-offs**: `@vitest/browser`의 실브라우저 환경이 jsdom으로 대체되면
브라우저 DOM API 동작 충실도가 낮아짐. 141개 테스트 전체 재작성 필요.
`vi.mock` → `jest.mock`, `vitest -u` → `npm test -- -u`, import 전략 전면 수정 필요.

**Rejected because**: 141개 테스트 재작성 비용이 Vitest→Jest 통일의 이점을 초과함.
실브라우저 테스트 환경(`@vitest/browser`)은 FE 특성상 유지 가치가 높음.

### Option B (status quo): Vitest 유지

**Selected**: 재작성 비용 없음, 실브라우저 환경 유지, CI 파이프라인과 안정적으로 연동됨.

## Consequences

**더 쉬워지는 것:**

- 기존 141개 테스트 전량 유지됨
- `@vitest/browser` 실브라우저 환경으로 DOM 동작 충실도 높은 테스트 유지됨

**더 어려워지는 것:**

- BE(Jest)와 FE(Vitest)의 테스트 러너가 다름. 코드 공유 시 mock 패턴이 다름.
  → BE 에이전트는 `jest.mock`, FE 에이전트는 `vi.mock` 사용

**기술 부채:**

- BE/FE test-modification.md가 각각 다른 러너 기준으로 작성되어야 함.
  BE는 Jest variant, FE는 Vitest variant로 분리됨

## BE implications (BE 에이전트 참조용)

BE는 여전히 **Jest + supertest**를 사용함. 이 ADR이 BE에 미치는 영향:

- `jest.mock`, `jest.fn()`, `npm test -- -u` 패턴 유지
- `@testing-library/jest-dom` (Vitest 버전 아님)
- BE `.claude/rules/test-modification.md`는 Jest 기준으로 작성됨
- BE는 이 ADR의 정보성 참조 사본(`ADR-002-fe-vitest-reference.md`)만 보관

## Vitest ↔ Jest 핵심 대응표 (FE 작업 시 참조)

| Jest | Vitest (FE) |
|---|---|
| `jest.mock(...)` | `vi.mock(...)` |
| `jest.fn()` | `vi.fn()` |
| `jest.spyOn(...)` | `vi.spyOn(...)` |
| `npm test -- -u` | `vitest -u` |
| `jest-environment-jsdom` | `@vitest/browser` |
| `@testing-library/jest-dom` | `@testing-library/jest-dom/vitest` |

## References

- FE `feat/ci-architecture-enforcement` 브랜치 (2026-04-16) — 64 tests Vitest 기준
- [Vitest 공식 문서](https://vitest.dev/)
- [Vitest Browser Mode](https://vitest.dev/guide/browser.html)
