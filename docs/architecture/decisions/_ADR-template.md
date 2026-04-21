# ADR-NNN: <결정 사항을 한 문장으로 기술>

<!-- ⚠️ 이 파일을 수정하지 말 것. 복제하여 ADR-NNN-<slug>.md로 저장할 것.
     언더스코어(_) 제거 후 사용함. Draft PR을 열고 Status: Proposed로 시작함.
     main 머지 시 Status가 Accepted로 전환되며 이 파일은 append-only가 됨.
     (documentation.md § Append-only rule 참조) -->

---

- **Status**: Proposed
- **Date**: YYYY-MM-DD
- **Applies to**: BE / FE / both repos
- **Deciders**: @github-handle
- **Related**: RFC-NNN (해당 시), ADR-NNN (대체 시)

## Context

이 결정이 해결하는 문제를 기술함. 구체적인 근거(측정값, 인시던트, 라이브러리 버전
불일치, 규제 요건)를 제시함. 날짜, PR 번호, 이슈 번호를 인용함. 독자가
"왜 지금인가?"를 물을 수 없을 만큼 충분한 배경을 제공해야 함.

## Decision

한두 문장으로 기술함. 결정 내용을 평이한 언어로 서술함. 이 문서의 나머지 부분은
이 결정을 뒷받침하기 위해 존재함.

> 예시: "Redis를 분산 세션 캐시로 사용함. 프로세스 내부 인메모리 캐시는 제거함."

## Alternatives considered

검토한 모든 선택지를 나열함(현상 유지 포함).
각 선택지는 한 줄 설명 + 트레이드오프 + 기각 이유를 포함함.

### Option A: <짧은 이름>

간략히 기술함.

**Trade-offs**: 장단점.

**Rejected because**: 기각의 가장 강력한 이유 한 가지.

### Option B: <짧은 이름>

...

### Option C (status quo): 현재 구현 유지

...

## Consequences

이 결정 이후 **더 쉬워지는** 것:

- ...

이 결정 이후 **더 어려워지는** 것:

- ...

새로 발생하는 **기술 부채** (모든 ADR은 일정 부채를 수반함. 명시적으로 기록함):

- ...

## Implementation notes (optional)

이 결정을 구현하는 코드 포인터를 간략히 기술함. 상세 통합 지침은 PR 설명이나
FR 파일에 작성함.

- 진입점: `src/...`
- 설정: env 변수 `X_*`
- 마이그레이션 계획: <링크>, <기한>

## References

- RFC-NNN (해당 시)
- 외부 문서, 논문, 블로그 포스트
- 관련 ADR: ADR-NNN, ADR-NNN
