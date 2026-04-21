# ADR-005: CI 게이트를 2주 advisory 기간 후 blocking으로 전환함

- **Status**: Proposed
- **Date**: 2026-04-18
- **Applies to**: both repos (BE + FE)
- **Deciders**: @gs07103
- **Related**: ADR-003 (dependency-cruiser), ADR-001 (번호 FSD 레이어)

## Context

Phase 15에서 두 레포에 신규 CI 게이트가 추가됨:

- **commitlint**: Conventional Commits 형식 검증 (`wagoid/commitlint-github-action@v6`)
- **dependency-cruiser**: FSD 레이어 경계 검사 (`npm run depcruise`)

두 레포 모두 운영 중(production traffic)이며, 기존 커밋·PR에서
Conventional Commits 위반이나 FSD 경계 위반이 이미 있을 수 있음.
이 상태에서 즉시 blocking 전환하면 모든 PR이 차단될 위험이 있음.

따라서 2주(14일) advisory 기간을 두어 기존 위반 baseline을 정리한 후
blocking으로 전환하는 점진적 정책이 필요함.

## Decision

신규 CI 게이트(`commitlint`, `depcruise`)는 `continue-on-error: true`(advisory)로
시작하여, **Phase 15 Wave 2 머지일 + 14일**에 blocking으로 전환함.

blocking 전환 시 **두 단계를 모두 수행해야 함** — 어느 한 단계만 수행하면
blocking 효과가 없음:

1. `.github/workflows/commitlint.yml`의 `continue-on-error: true` → `false` 교체 PR
2. GitHub repo Settings > Branch protection > Required status checks에 `commitlint` 추가

> ⚠️ **Transition date 미박제 (작성 시점)**: Wave 2 머지가 완료되면 이 ADR을 편집하여
> 실제 머지 날짜를 아래 `Transition date` 필드에 기입할 것.

## Transition date

- **Wave 2 머지일**: TBD (Wave 2 머지 직후 이 ADR 편집하여 날짜 박제)
- **Blocking 전환 기한**: Wave 2 머지일 + 14 days (D+14)

> FE 특이사항: FE는 6-step verify 파이프라인이 이미 적용됨 (PR #36).
> commitlint는 Wave 5에서 새로 추가됨. advisory transition 규칙은 BE와 동일하게 적용됨.
> Transition date는 BE Wave 2 머지일과 동기화함 (14일 기산점 통일).

## Alternatives considered

### Option A: 즉시 blocking

신규 게이트를 처음부터 blocking으로 적용함.

**Trade-offs**: 표준과의 최단 시간 정렬. 그러나 기존 위반 baseline이 정리되지 않은
운영 레포에서는 모든 PR이 차단되어 개발 흐름이 중단될 위험이 있음.

**Rejected because**: 운영 레포 안정성 우선. 위반 baseline 정리 유예가 필요함.

### Option B: advisory 기간 없이 경고만

`continue-on-error: true` 상태를 영구 유지하여 위반을 경고만 표시함.

**Trade-offs**: 개발 흐름 중단 없음. 그러나 게이트가 실질적 강제력이 없으면
시간이 지나도 위반이 축적될 뿐임.

**Rejected because**: advisory는 임시 유예이고, D+14일에 반드시 blocking으로 전환해야 함.
영구 advisory는 도구 도입 목적을 무력화함.

### Option C (selected): 2주 advisory → blocking

**Selected**: 기존 위반 정리 유예 + 명확한 전환 기한 + 두 단계 수동 체크리스트.

## Consequences

**더 쉬워지는 것:**

- 기존 커밋·PR 영향 없이 신규 게이트를 도입할 수 있음
- 2주 동안 위반 카운트를 모니터링하며 기존 위반을 점진적으로 정리 가능함
- D+14일 이후 모든 PR에서 Conventional Commits + FSD 경계 자동 강제됨

**더 어려워지는 것:**

- 전환 기한(D+14일)을 놓치면 advisory가 영구화될 위험이 있음.
  아래 "Mandatory transition steps"의 두 단계를 반드시 수행해야 함

**기술 부채:**

- D+14일에 수동으로 두 단계 전환 작업 필요함.
  캘린더 알림 또는 GitHub issue로 추적 권장

## Mandatory transition steps (D+14일)

두 단계 **모두** 수행해야 blocking이 실제로 작동함.
step만 바꾸면 GitHub Actions job은 green이지만, required status check 미등록이면
PR 머지 차단 효과가 없음.

### Step 1: workflow yml 수정 PR

```yaml
# .github/workflows/commitlint.yml
# 변경 전:
- name: Lint commit messages
  uses: wagoid/commitlint-github-action@v6
  continue-on-error: true   # ← 이 줄 제거 또는 false로 변경

# 변경 후:
- name: Lint commit messages
  uses: wagoid/commitlint-github-action@v6
  # continue-on-error 없음 → 기본값 false (blocking)
```

### Step 2: GitHub Branch protection 등록

```text
Repository Settings
  → Branches
  → Branch protection rules
  → main (또는 dev) 규칙 선택
  → Required status checks
  → Search "commitlint"
  → 체크박스 활성화 → Save changes
```

> **두 단계 중 하나라도 누락하면 blocking 효과 없음.**

## Implementation notes

- BE: `.github/workflows/commitlint.yml` — `wagoid/commitlint-github-action@v6`
- FE: 동일 구성 (Wave 5에서 추가)
- advisory 기간 모니터링: `commitDepth: 1` (PR의 마지막 커밋만 검증, 과거 커밋 무시)
- depcruise advisory: `.github/workflows/ci.yml`의 Architecture step에
  `continue-on-error: true` 동일하게 적용

## References

- [wagoid/commitlint-github-action@v6](https://github.com/wagoid/commitlint-github-action)
- ADR-003 (dependency-cruiser advisory step 포함)
- PLAN.md § Wave 2 — `commitlint.yml` 신규, CI 6-step 확장
- PLAN.md § 아키텍처 결정 표 — ADR-005 설명 (F2 High 반영)
