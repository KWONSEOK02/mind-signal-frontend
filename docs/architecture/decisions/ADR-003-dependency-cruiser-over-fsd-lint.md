# ADR-003: FSD 경계 검사 도구로 dependency-cruiser만 사용함

- **Status**: Accepted
- **Date**: 2026-04-18
- **Applies to**: both repos (BE + FE)
- **Deciders**: @gs07103
- **Related**: ADR-001 (번호 FSD 레이어)

## Context

FSD 레이어 경계를 자동으로 검사하는 도구로 두 가지 선택지가 있음:

1. **eslint-plugin-fsd-lint**: ESLint 플러그인. `forbidden-imports`, `no-relative-imports`,
   `no-public-api-sidestep` 규칙 제공. 그러나 `shared/features/...` 형태의 표준 레이어
   이름을 하드코딩 의존함
2. **dependency-cruiser**: 정규식 기반 커스텀 규칙. 번호 레이어(`07-shared` 등)를
   포함한 임의의 경계 패턴 정의 가능

Phase 15에서 CI에 FSD 경계 검사 게이트를 추가하기로 결정됨.
ADR-001에서 번호 prefix 레이어를 유지하기로 결정했으므로,
두 도구 중 번호 레이어를 지원하는 도구를 선택해야 함.

FE `feat/ci-architecture-enforcement` 브랜치(2026-04-16)에서 dependency-cruiser를
번호 레이어 4규칙으로 설정하여 **132모듈 252의존성, 0 violations** 실증 완료.

## Decision

`dependency-cruiser@^17.3.10`만 사용함. `eslint-plugin-fsd-lint`는 도입하지 않음.

## Alternatives considered

### Option A: eslint-plugin-fsd-lint 단독 사용

ESLint 파이프라인에 통합되므로 `npm run lint`만으로 FSD 경계 검사 가능함.

**Trade-offs**: 번호 레이어(`07-shared`, `05-features` 등)를 인식하지 못함.
플러그인 내부에 `shared/features/...` 하드코딩 의존성 존재함.
ADR-001과 충돌 — 표준 레이어 이름으로 리네임하지 않는 한 사용 불가.

**Rejected because**: ADR-001과 정면 충돌. 번호 레이어 커스텀 지원 불확실.

### Option B: eslint-plugin-fsd-lint + dependency-cruiser 병용

두 도구를 병용하여 커버리지를 높임.

**Trade-offs**: eslint-plugin-fsd-lint가 번호 레이어를 인식하지 못하면
모든 import에서 false positive가 발생함. 도구 충돌 디버깅 비용 증가.

**Rejected because**: false positive 리스크가 병용의 이점을 초과함.
단일 도구가 같은 문제를 해결 가능하면 병용 불필요.

### Option C (selected): dependency-cruiser 단독

**Trade-offs**: ESLint와 별도 파이프라인 step(`npm run depcruise`)이 필요함.
설정 파일(`.dependency-cruiser.cjs`)이 추가됨.

**Selected**: 번호 레이어 완전 지원, FE 브랜치에서 0 violations 실증, 단일 도구로 단순함.

## Consequences

**더 쉬워지는 것:**

- 번호 레이어(`07-shared → 01-app`)를 있는 그대로 검사함
- 정규식 기반 커스텀 규칙으로 FE 특화 경계 정의 가능함
  (예: `no-db-in-features`, `no-upward-from-shared`)
- CI 6단계 파이프라인의 `Architecture` step에 통합됨

**더 어려워지는 것:**

- `npm run lint`와 별도로 `npm run depcruise`를 실행해야 함.
  `npm run verify`로 통합하여 단일 명령으로 해결함

**기술 부채:**

- `.dependency-cruiser.cjs` 설정 파일이 레이어 구조 변경 시 함께 수정되어야 함.
  레이어 추가·삭제 시 이 파일을 업데이트하는 절차를 팀에 공유해야 함

## Implementation notes

FE `.dependency-cruiser.cjs` 핵심 규칙 4종 (PR #36에서 구현):

```js
// (a) no-db-in-features: 05-features → DB 드라이버(prisma, drizzle-orm 등) 직접 import 금지
// (b) no-db-in-pages: 03-pages → DB 드라이버 직접 import 금지
// (c) no-upward-from-shared: 07-shared → 상위 레이어(05-features, 04-widgets, 03-pages) import 금지
// (d) no-upward-from-widgets: 04-widgets → 03-pages import 금지
```

- 버전: `dependency-cruiser@^17.3.10` (FE 브랜치와 동일)
- CI step: `npm run depcruise` (`continue-on-error: true` advisory 2주, ADR-005)

## References

- FE `feat/ci-architecture-enforcement` 브랜치 (2026-04-16) — 0 violations 실증
- [dependency-cruiser 공식 문서](https://github.com/sverweij/dependency-cruiser)
- ADR-001 (번호 FSD 레이어 유지 결정)
- ADR-005 (CI advisory → blocking 전환 정책)
