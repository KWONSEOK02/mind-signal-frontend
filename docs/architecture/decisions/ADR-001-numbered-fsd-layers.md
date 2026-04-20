# ADR-001: FSD 레이어 명명에 번호 prefix를 유지함

- **Status**: Accepted
- **Date**: 2026-04-18
- **Applies to**: both repos (BE + FE)
- **Deciders**: @gs07103
- **Related**: ADR-003 (dependency-cruiser 도입)

## Context

Mind Signal 프로젝트는 Feature-Sliced Design(FSD)을 채택하고 있으나,
레이어 명명 방식이 템플릿 표준(`shared/entities/features/...`)과 다름.
MS는 `07-shared → 06-entities → 05-features → 02-processes → 01-app`과 같이
**import 방향과 역방향인 번호 prefix**를 사용함.

이 번호 체계는 2026-04-18 현재 BE와 FE 두 레포 모두에서 운영 중이며,
TypeScript path alias(`@07-shared/`, `@06-entities/` 등),
라우터, 테스트 파일 전반에 걸쳐 정착됨.
Phase 15에서 llm-setup-templates v1.0.0의 tooling을 retrofit하는 시점에
레이어 이름 변경 여부를 명시적으로 결정해야 함.

## Decision

번호 prefix 레이어 명명(`07-shared → 06-entities → 05-features → 02-processes → 01-app`)을
두 레포에서 그대로 유지함. 템플릿 표준 명칭으로의 리네임은 수행하지 않음.

## Alternatives considered

### Option A: 템플릿 표준으로 리네임 (`shared/entities/features/...`)

FSD 커뮤니티 표준과 정렬됨. 서드파티 FSD 도구(eslint-plugin-fsd-lint 등)와의
호환성이 높아짐.

**Trade-offs**: 번호 체계가 사라지므로 import 방향 시각적 식별이 어려워짐.
Path alias, 라우터, 테스트, 설정 파일 수십 곳을 일괄 수정해야 함.
운영 중 레포에서 대규모 리네임은 병합 충돌 및 버그 리스크가 높음.

**Rejected because**: 리네임 비용(엔지니어링 시간 + 회귀 리스크)이 정합성 이점을
초과함. `dependency-cruiser`가 번호 레이어 커스텀 설정을 완전히 지원함(ADR-003).

### Option B (status quo): 번호 prefix 유지

현재 방식을 그대로 유지함.

**Trade-offs**: FSD 커뮤니티 표준과 다소 다름. 신규 기여자가 번호 체계를 이해해야 함.

**Selected**: 운영 중 레포의 안정성 우선, tooling 차원에서 완전히 지원 가능함.

## Consequences

**더 쉬워지는 것:**

- import 문에서 레이어 번호로 의존 방향을 즉시 식별할 수 있음
  (`@07-shared/` → `@06-entities/` → `@05-features/` 순서가 명확함)
- 기존 코드베이스 유지 — 회귀 리스크 없음
- `dependency-cruiser` 커스텀 규칙으로 번호 레이어 경계 강제 가능함 (ADR-003)

**더 어려워지는 것:**

- 외부 FSD 도구(eslint-plugin-fsd-lint)의 기본 설정은 번호 레이어를 인식하지 못함.
  `dependency-cruiser`만 사용하는 이유(ADR-003)

**기술 부채:**

- 신규 팀원 온보딩 시 번호 체계 별도 설명 필요함.
  `docs/architecture/overview.md`의 레이어 설명으로 완화함

## Implementation notes

- Path alias 유지: `@07-shared/`, `@06-entities/`, `@05-features/`, `@02-processes/`, `@01-app/`
- dependency-cruiser 규칙 파일 `.dependency-cruiser.cjs`에서 번호 레이어 패턴으로
  경계 강제함 (ADR-003, Wave 2에서 구현)
- `CLAUDE.md §4 FSD 아키텍처 레이어 규칙` — 번호 레이어 설명 유지됨

## References

- [Feature-Sliced Design 공식 문서](https://feature-sliced.design/)
- ADR-003 (dependency-cruiser 선택)
- FE `feat/ci-architecture-enforcement` 브랜치 — 132모듈 0 violations 실증 (2026-04-16)
