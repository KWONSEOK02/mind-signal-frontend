# Measurement API Migration Plan

프론트엔드의 잘못된 `/signals` REST API 구조를 백엔드 실제 구조(`/measurements` + Socket.io)에 맞게 수정하는 작업 계획입니다.

---

## 배경

### 문제

`src/07-shared/api/signal.ts`가 존재하지 않는 백엔드 엔드포인트를 참조하고 있습니다.

| 항목 | 내용 |
|------|------|
| 프론트 호출 | `POST /signals/realtime`, `GET /signals/status/:id` |
| 백엔드 실제 | `/signals` 라우터 없음 |

### 근본적 구조 불일치

| 항목 | 현재 (잘못된 구조) | 변경 후 (올바른 구조) |
|------|------------------|-------------------|
| 데이터 흐름 | 프론트 → 백엔드 (매 1초 POST) | 백엔드 → 프론트 (Socket.io 수신) |
| 시작 방법 | 1초마다 HTTP POST 반복 | 최초 1회 HTTP POST로 측정 트리거 |
| 식별자 | `correlationId` (`groupId_subjectIndex`) | `sessionId` (MongoDB ObjectId) |
| 데이터 생성 | 프론트에서 mock 랜덤 생성 | Python 엔진 → Redis → Socket.io |

---

## 백엔드 실제 구조

### REST 엔드포인트

```
POST /api/measurements/sessions/:sessionId/eeg/stream:start
```
- JWT 인증 필요
- 응답: `{ status: 'success', message: '측정이 시작되었습니다.', measuredAt: <ISO> }`
- 내부적으로 Python 엔진 spawn 및 Redis 구독 시작

### Socket.io

| 항목 | 값 |
|------|-----|
| 이벤트명 | `eeg-live` |
| 페이로드 | `{ sessionId: string, data: EmotivMetrics }` |
| 대상 | 연결된 모든 클라이언트 (`io.emit`) |
| CORS | `origin: '*'` |

### 데이터 파이프라인

```
Python 엔진 → Redis (mind-signal:<groupId>:subject:<subjectIndex>) → Socket.io 'eeg-live' → 프론트
```

---

## 수정 범위

> 파일명, 폴더명, 훅명, 컴포넌트명은 변경하지 않습니다.
> API 엔드포인트 및 내부 로직만 수정합니다.

---

## 수정 작업 목록

### 1. `src/07-shared/api/signal.ts`

**API 객체명 변경 및 메서드 교체**

```ts
// Before
const signalApi = {
  sendSignal(correlationId, metrics) // POST /signals/realtime
  getSignalStatus(correlationId)     // GET  /signals/status/:id
}

// After
const measurementApi = {
  startMeasurement(sessionId: string) // POST /measurements/sessions/:sessionId/eeg/stream:start
}
```

- `sendSignal`, `getSignalStatus` 제거
- `signalApi` → `measurementApi`
- `SignalPayload` 타입 제거
- `EmotivMetrics` 타입 유지 (차트에서 사용 중)

---

### 2. `src/07-shared/api/index.ts`

```ts
// Before
export { default as signalApi } from './signal';

// After
export { default as measurementApi } from './signal';
```

---

### 3. `src/07-shared/lib/socket-client.ts` (신규 생성)

Socket.io 클라이언트 싱글톤.

```ts
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (url: string): Socket => {
  if (!socket) {
    socket = io(url, { transports: ['websocket'] });
  }
  return socket;
};
```

- `config.api.socketUrl` 값 사용 (이미 config에 `NEXT_PUBLIC_SOCKET_URL` 존재)

---

### 4. `src/05-features/signals/model/use-signal.ts`

**훅 시그니처 및 내부 로직 전면 교체**

```ts
// Before
useSignal(groupId: string | null, subjectIndex: number | null)
// → setInterval로 매 1초 mock 데이터 POST

// After
useSignal(sessionId: string | null)
// → startMeasurement: POST 1회 호출
// → socket.on('eeg-live') 로 currentMetrics 수신
// → stopMeasurement: socket.off('eeg-live')
```

변경 사항:
- `setInterval` + `signalApi.sendSignal()` 제거
- `measurementApi.startMeasurement(sessionId)` 1회 호출
- `socket.on('eeg-live', ({ sessionId: id, data }) => { if (id === sessionId) setCurrentMetrics(data) })` 등록
- `lastSentTime` → `lastReceivedTime` 으로 의미 변경 (수신 시각)
- 언마운트 시 `socket.off` 정리

---

### 5. `src/03-pages/lab/lab/lab-page.tsx`

```ts
// Before
const subject1Signal = useSignal(groupId, 1);
const subject2Signal = useSignal(groupId, 2);

// After
// usePairing이 반환하는 sessions 배열에서 sessionId 추출
const subject1Signal = useSignal(sessions[0]?.id ?? null);
const subject2Signal = useSignal(sessions[1]?.id ?? null);
```

---

### 6. `src/03-pages/lab/join/join-page.tsx`

```ts
// Before
const { ... } = useSignal(groupId, subjectIndex);

// After
// usePairing에서 반환된 sessionId (PairingData.id) 사용
const { ... } = useSignal(sessionId ?? null);
```

---

## 패키지 확인

```bash
npm list socket.io-client
# 없으면: npm install socket.io-client
```

---

## 작업 순서

```
1. socket.io-client 패키지 설치 확인
2. src/07-shared/lib/socket-client.ts 신규 생성
3. src/07-shared/api/signal.ts 수정 (엔드포인트 교체, measurementApi로 rename)
4. src/07-shared/api/index.ts export 이름 변경
5. src/05-features/signals/model/use-signal.ts 로직 교체
6. lab-page.tsx, join-page.tsx 인자 변경
```

---

## 확인 필요 사항

- [x] `usePairing` 반환값에서 `sessionId` (= `PairingData.id`) 접근 가능 여부 확인
- [ ] Python 엔진이 실제로 `EmotivMetrics` 형태(`engagement`, `interest`, `excitement`, `stress`, `relaxation`, `focus`)로 emit하는지 확인
- [x] `socket.io-client` 패키지 설치 여부 확인

---

## 실제 구현 후 발견된 추가 수정 사항

### A. `src/05-features/sessions/model/use-pairing.ts` (미계획 추가)

마이그레이션 계획에 없었으나 `sessions[0]?.id` 접근을 위해 추가 수정 필요했음.

**변경 내용:**
- `sessions: PairingData[]` state 추가 — Operator용. `startPairing` 완료 시 `PAIRED` 전환 콜백에서 `setSessions(prev => [...prev, data])` 누적
- `sessionId: string | null` state 추가 — Subject용. `requestPairing` 완료 시 `verifyPairing` 응답의 `data.id` 저장
- `resetStatus`에 `setSessions([])`, `setSessionId(null)` 초기화 추가
- 두 필드 반환 객체에 추가

---

### B. 백엔드 버그 수정 — `createSession` 응답 필드명 불일치

**파일:** `mind-signal-backend/src/05-features/sessions/api/session.controller.ts`

**원인:** `POST /sessions` (createdPairing) 응답이 `sessionId: newSession._id`로 반환하지만
프론트엔드 `PairingData` 타입은 `id: string`을 기대함 → `sessions[0]?.id === undefined` → POST 요청 미발생

```ts
// Before
data: {
  sessionId: newSession._id,  // 'sessionId' 키
  ...
}

// After
data: {
  id: newSession._id,          // 'id' 키 (PairingData 타입과 일치)
  ...
}
```

> `pairDevice`(verifyPairing)는 Mongoose `toJSON`을 통해 `_id → id`로 자동 변환되어 영향 없음.

---

### C. `eeg-live` 수신 데이터 유효성 검증 추가

**파일:** `src/05-features/signals/model/use-signal.ts`

Python 엔진 비정상 종료 또는 Redis 불완전 메시지 수신 시 `undefined` 필드가 `currentMetrics`에 설정되어 차트에서 NaN 발생하는 문제 방어 처리함.

```ts
// eeg-live 핸들러 내 유효성 검증 추가함
if (
  !data ||
  !isFinite(data.engagement) || !isFinite(data.interest) ||
  !isFinite(data.excitement) || !isFinite(data.stress) ||
  !isFinite(data.relaxation) || !isFinite(data.focus)
) return;
```

---

### D. `src/04-widgets/signal-chart/ui/signal-realtime-chart.tsx` NaN 방어 추가

Recharts Tooltip이 `NaN`을 `children`으로 전달받아 콘솔 에러 발생하는 문제 수정.

```ts
// Before
value: Number((metrics.engagement * 100).toFixed(1))

// After
value: Number((metrics.engagement * 100).toFixed(1)) || 0
```

모든 6개 지표 값에 동일하게 적용함.

---

---

### E. 백엔드 Redis → Socket.io 페이로드 구조 불일치 수정

**파일:** `mind-signal-backend/src/02-processes/measurements/services/measurement.service.ts`

**원인:** Python 엔진이 Redis에 발행하는 전체 페이로드를 백엔드가 그대로 `data`로 전달함.
프론트엔드는 `data.engagement`를 직접 읽지만 실제로는 `data.metrics.engagement`에 위치 → `undefined * 100 = NaN`

```
Python 발행 구조:
{
  "type": "brain_sync_all",
  "waves": { "delta": ..., "theta": ..., ... },
  "metrics": { "engagement": 0.627, "interest": 0.775, ... },
  "time": "..."
}

프론트엔드 EmotivMetrics 기대 구조:
{ engagement, interest, excitement, stress, relaxation, focus }
```

```ts
// Before
const data = JSON.parse(message);
SocketService.emitLiveEvent('eeg-live', { sessionId: session._id, data });

// After
const parsed = JSON.parse(message);
const data = parsed.metrics ?? parsed; // metrics 필드 있으면 추출, 없으면 전체 fallback
SocketService.emitLiveEvent('eeg-live', { sessionId: session._id, data });
```

---

### F. Redis 모니터 채널 수정

**파일:** `mind-signal-backend/package.json`

Python 엔진 발행 채널: `mind-signal:{groupId}:subject:{subjectIndex}` (실험마다 가변)
기존 모니터: `subscribe mind-signal-live` (고정 이름 — 실제 채널과 불일치, 데이터 수신 불가)

| 구독 방식 | 명령어 | 설명 |
|---------|--------|------|
| `subscribe` | 정확한 채널명 매칭 | `mind-signal-live` 채널만 구독 |
| `psubscribe` | 글로브 패턴 매칭 | `mind-signal:*` 패턴으로 모든 실험 채널 구독 |

```json
// Before
"test:redis": "docker exec -it mind-signal-redis redis-cli subscribe mind-signal-live"

// After
"test:redis": "docker exec -it mind-signal-redis redis-cli psubscribe mind-signal:*"
```

---

## 로컬 개발 환경 구성

`start-dev.bat` (프로젝트 루트)으로 Redis + 백엔드 시작. Python 엔진은 `stream:start` POST 수신 시 백엔드가 `spawn()`으로 직접 실행함.

| 시나리오 | POST 성공 | eeg-live 수신 |
|---------|----------|--------------|
| 로컬 백엔드 + Python 엔진 없음 | O | X |
| 로컬 백엔드 + `redis-cli PUBLISH` 수동 | O | O |
| Heroku 백엔드 + 로컬 Python | O | X (Python이 Heroku Redis에 PUBLISH 불가) |

**Python 없이 eeg-live 테스트:**
```bash
redis-cli PUBLISH "mind-signal:{groupId}:subject:{subjectIndex}" \
  '{"engagement":0.8,"interest":0.7,"excitement":0.6,"stress":0.3,"relaxation":0.5,"focus":0.9}'
```
