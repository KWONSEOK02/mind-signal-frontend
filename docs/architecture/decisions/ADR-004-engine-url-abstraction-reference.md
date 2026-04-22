# ADR-004: Python 엔진 접근을 URL 추상화 + engineRegistryService로 캡슐화함

<!-- ⚠️ 이 ADR은 BE(mind-signal-backend) 의사결정임. FE 작업에는 직접 영향 없음.
     2PC 확장 시 엔진 URL을 env로 다루는 BE 측 계약 인지 목적의 정보성 참조 사본.
     BE primary 파일: `mind-signal-backend/docs/architecture/decisions/ADR-004-engine-url-abstraction.md`
     FE 에이전트가 이 파일을 읽고 `engineRegistryService` 등 BE 전용 서비스를 수정하는 일이 없도록 주의할 것. -->

- **Status**: Accepted
- **Date**: 2026-04-18
- **Applies to**: BE (2PC 확장 경계 핵심) — FE 작업에 직접 영향 없음
- **Deciders**: @gs07103
- **Related**: ADR-001 (번호 FSD 레이어)

## Context

Mind Signal 백엔드는 EEG 측정 시 Python 엔진(`core.main`)을 실행해야 함.
현재는 `measurement.service.ts`가 세션 시작 시 `child_process.spawn`으로
Python 프로세스를 온디맨드로 직접 실행하는 방식을 사용함.

이 방식은 1PC 환경에서 동작하지만, 2PC 확장(Subject PC ↔ Operator PC 분리,
또는 원격 PC에서 헤드셋 운용) 시 다음 문제가 발생함:

- `child_process.spawn`은 로컬 프로세스만 실행 가능함
- 원격 PC의 Python 프로세스를 BE가 직접 spawn할 수 없음
- 엔진 URL이 코드에 하드코딩되면 환경 전환 시 코드 수정 필요

현재 코드는 `config.ts:57`에서 `DATA_ENGINE_URL = process.env.DATA_ENGINE_URL || 'http://localhost:5002'`로
환경변수 fallback을 이미 지원함. Python 엔진은 시작 후 `/engine/register`로
pyngrok URL을 BE에 등록하는 패턴이 구현되어 있음.

Phase 15 retrofit에서 이 패턴을 문서화하고 드리프트 방지 규칙으로 강제해야 함.

## Decision

엔진 접근은 반드시 `DATA_ENGINE_URL` env(fallback) + `engineRegistryService` 경유
HTTP/WS를 통해서만 이루어짐. Python 엔진은 on-demand spawn 후 `/engine/register`로
pyngrok URL(또는 localhost fallback)을 BE에 자동 등록함. `measurementService`
추상화 하위에 캡슐화되며, 서비스 코드에서 `child_process.spawn` 직접 호출은 금지됨.

## Alternatives considered

### Option A: child_process.spawn 직결 (현상 유지)

Python 경로(`DATA_ENGINE_PYTHON`)를 env로 받아서 `child_process.spawn`으로 직접 실행함.

**Trade-offs**: 단순하고 직관적임. 그러나 엔진이 항상 BE와 같은 PC에 있어야 함.
2PC 환경에서는 원격 PC의 Python 실행 불가. 코드가 로컬 실행 환경에 강하게 결합됨.

**Rejected because**: 2PC 확장 시 코드 대규모 수정 필요. URL 추상화로 동일한 1PC 동작을
유지하면서 2PC를 미래 호환으로 열어둘 수 있음.

### Option B: gRPC / WebSocket 전용 프로토콜

엔진과 BE 사이를 전용 RPC 프로토콜로 연결함.

**Trade-offs**: 타입 안전성과 성능이 향상됨. 그러나 Python + Node.js 양쪽에
gRPC 스택 추가 필요. 현재 팀 규모(1인)에서 오버엔지니어링.

**Rejected because**: 현재 HTTP/WS 조합으로 충분함. 프로토콜 전환은 독립 Phase.

### Option C (selected): DATA_ENGINE_URL + engineRegistryService

현재 구현의 패턴을 명문화하고 드리프트 방지 규칙으로 강제함.

**Selected**: 코드 변경 없이 1PC 동작 유지, 2PC 확장 시 원격 PC에서 `/engine/register`만
호출하면 됨. 이미 검증된 패턴이므로 리스크 없음.

## Consequences

**더 쉬워지는 것:**

- 2PC 확장 시: 원격 PC의 Python 엔진이 BE의 `/engine/register`를 HTTP POST로
  호출하면 BE는 해당 URL을 메모리에 등록하고 이후 요청을 해당 URL로 전송함.
  코드 변경 없이 원격 엔진 수용 가능함
- 엔진 URL이 pyngrok 등으로 동적으로 변경되어도 register 재호출로 갱신됨

**더 어려워지는 것:**

- `child_process.spawn` 직결보다 등록 단계가 하나 추가됨.
  로컬 개발 시 Python 기동 후 `/engine/register` 호출이 자동으로 일어나야 함
  (Python 코드에서 시작 시 자동 등록)

**기술 부채:**

- `engineRegistryService`의 등록된 URL이 메모리에만 저장됨. BE 재시작 시
  Python 엔진이 재등록하지 않으면 URL 소실. 재등록 재시도 로직이 필요함 (Phase 16+)

## 2PC 확장 경계 제약 (HARD CONSTRAINTS, BE 관할)

아래 제약은 BE `.claude/rules/architecture.md`에 박제됨.
FE는 BE Socket.io 스트림만 수신하므로 이 제약의 직접 적용 대상이 아님.
2PC 확장 시 FE 코드 변경은 불필요함.

| 제약 | 내용 |
|---|---|
| **Engine-location abstraction** | 서비스 코드에서 `child_process.spawn` 직접 호출 금지. 반드시 `engineRegistryService` 경유 (BE 관할) |
| **Channel keying** | Redis 채널 키는 `mind-signal:{groupId}:subject:{subjectIndex}` 형식만 허용. PC/host 정보 포함 금지 |
| **Timestamp source of truth** | 서버측 ingest timestamp가 단일 진실. client-local clock은 intra-batch ordering에만 사용. 2PC NTP/LSL 처리는 Phase 16+에서 별도 ADR |

## Implementation notes (BE 전용)

- `engineRegistryService`: `src/02-processes/engine/services/engine-registry.service.ts`
- `engineProxyService`: `src/02-processes/engine/services/engine-proxy.service.ts`
- `config.dataEngine.baseUrl`: `config.ts:57` — `DATA_ENGINE_URL` env, fallback `http://localhost:5002`
- Python 등록 엔드포인트: `POST /engine/register` — pyngrok URL 또는 localhost URL 수신

### 환경별 URL 패턴

| 환경 | `DATA_ENGINE_URL` | 실제 등록 URL |
|---|---|---|
| 로컬 개발 | `http://localhost:5002` (fallback) | Python spawn 후 자동 등록 |
| Staging (ngrok) | `http://localhost:5002` (fallback) | pyngrok URL 자동 등록 |
| 2PC (원격 PC) | 원격 PC가 등록 → `engineRegistryService` 갱신 | 원격 PC IP/포트 또는 ngrok URL |

## FE 관련 메모

FE는 이 결정에서 `DATA_ENGINE_URL`을 직접 사용하지 않음.
FE가 인지해야 하는 것:

- EEG 스트림은 항상 BE Socket.io 경유로 수신됨 (`use-signal.ts`)
- 2PC 확장 시 FE 코드 변경 없음 — BE가 엔진 URL 라우팅을 완전히 담당함
- FE의 `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_SOCKET_URL`은 BE 주소이며 Engine URL과 무관

## References

- `CLAUDE.md §1 실시간 데이터 파이프라인 흐름`
- `CLAUDE.md §1 변경 이력 — feat/session-group-pairing`
- [pyngrok 공식 문서](https://pyngrok.readthedocs.io/)
- ADR-003 (dependency-cruiser — 02-processes 경계 규칙 포함)
- Phase 16+ — 2PC NTP/LSL 동기화 별도 ADR 예정
