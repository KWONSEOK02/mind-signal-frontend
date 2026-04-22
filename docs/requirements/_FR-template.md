# FR-XX: <한 줄 명령형 제목>

<!-- ⚠️ 이 파일을 수정하지 말 것. 복제하여 FR-XX-<slug>.md로 저장할 것.
     언더스코어(_) 제거 후 사용함. 모든 섹션을 채운 뒤 RTM.md에 행을 추가함.
     같은 PR에서 FR 파일 + RTM 행 업데이트를 함께 처리함. -->

---

## Metadata

- **FR ID**: FR-XX
- **Status**: ([RTM Status 값](./RTM.md#status-값) 참조)
- **Priority**: P0 (필수) / P1 (중요) / P2 (선택)
- **GitHub Issue**: #NNN
- **Related ADRs**: ADR-NNN (해당 시)
- **Owner**: @gs07103
- **Created**: YYYY-MM-DD

## Source (요구사항 출처)

이 FR이 어디서 왔는지 명시함 — PRD 섹션, GitHub 이슈, 팀 회의 날짜 등.

- PRD: `.plans/PRD.md §N`
- 이슈: #NNN
- 회의: YYYY-MM-DD 팀 회의 결정사항

## User story

As a **<actor>** (예: Operator, Subject), I want **<capability>**, so that **<outcome>**.

## Trigger

무엇이 이 기능을 시작하는가? HTTP 요청, 크론, 사용자 클릭, 외부 웹훅?

- 예: Operator가 FE 대시보드에서 "세션 시작" 버튼 클릭

## Inputs

| Name | Type (TypeScript / Zod) | Source | Constraints |
|---|---|---|---|
| `groupId` | `string` (z.string().regex(/^[a-f0-9]{24}$/)) | Form submit | MongoDB ObjectId 형식 |

## Outputs

| Name | Type | Consumer | Notes |
|---|---|---|---|
| `SessionDto` | `z.infer<typeof SessionSchema>` | FE UI 렌더 | `src/07-shared/types/index.ts`에 정의됨 |

## Preconditions

**실행 전** 무엇이 참이어야 하는가? 이것이 코드에서 guard clause 또는
미들웨어 검사로 구현됨. 각 전제조건을 강제하는 함수/파일을 명시함.

- [ ] 사용자가 인증됨 (`src/07-shared/api/base.ts`의 JWT interceptor가 토큰 주입)
- [ ] 입력이 Zod 스키마를 통과함 (클라이언트 Zod 검증 후 API 호출)

## Postconditions

**완료 후** 무엇이 참이어야 하는가? 이것이 테스트의 assertions가 됨.

- [ ] BE API 응답이 기대 스키마와 일치함
- [ ] FE 화면 상태가 정상적으로 갱신됨
- [ ] 동일 입력으로 반복 호출 시 부작용 없음 (idempotency 요구 시 명시)

## Structured logic

**구조화된 영어**로 흐름을 기술함 (`IF … THEN … ELSE`, `FOR EACH`, `WHILE`, `RETURN`).
자연어 모호성 없이 기술함. LLM이 이 명세에서 컴파일 가능한 함수를 생성할 수 있어야 함.

```
BEGIN FR-XX
  VALIDATE input via XxxSchema (실패 시 에러 메시지 표시, API 호출 금지)
  CALL API endpoint (인증 토큰 자동 주입)
  IF response.status IS 200/201 THEN
    UPDATE FE state
    NAVIGATE to result page (해당 시)
  ELSE IF response.status IS 401 THEN
    REDIRECT to login page
  ELSE
    DISPLAY error message from response body
  END IF
END FR-XX
```

## Decision table

**3개 이상의 상호작용 조건이 있을 때만 이 섹션을 포함함.**
조건 1개 = 행 1개, 규칙(Rule) 1개 = 열 1개. Y / N / — (무관).

| Conditions | R1 | R2 | R3 |
|---|---|---|---|
| 인증 토큰 존재 | N | Y | Y |
| API 응답 성공 | — | N | Y |
| **Actions** | | | |
| 로그인 페이지 리다이렉트 | X | | |
| 에러 메시지 표시 | | X | |
| FE 상태 갱신 + 페이지 이동 | | | X |

**테스트 커버리지 규칙**: Rule 열 1개 = 테스트 1개. 모든 Rule 열은 테스트 대상임.

## Exception handling

- **네트워크 오류**: Axios interceptor가 자동 재시도 또는 에러 상태 표시
- **Zod 검증 실패**: 폼 인라인 에러 메시지 표시, API 호출 금지
- **401 Unauthorized**: 로그인 페이지로 리다이렉트, localStorage 토큰 제거

## Test plan

| Level | Scenario | File |
|---|---|---|
| unit | happy path | `src/05-features/xxx/xxx.test.tsx` |
| unit | decision-table Rule별 (R1 … RN) | `src/05-features/xxx/rules.test.tsx` |
| e2e | 전체 HTTP round-trip | `e2e/fr-xx.spec.ts` (해당 시) |

## Dependencies

- 선행 완료 필요 FR: FR-XX
- 의존 ADR: ADR-NNN
- 의존 BE API: `POST /api/xxx` (BE 측 구현 완료 필요)

## Traceability

- **Implementation files**: `src/...`
- **Tests**: `src/.../xxx.test.tsx`
- **Related ADRs**: ADR-NNN
- **RTM row**: [RTM.md](./RTM.md) FR-XX 행

## Notes

<!-- 해결된 질문은 위 섹션의 명세로 편입함. -->

- [ ] 미결 질문이나 불확실한 전제조건을 여기에 기록함
