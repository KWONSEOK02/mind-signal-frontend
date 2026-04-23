# E2E Test Guide — DUAL_2PC Scenarios 1-4 (Phase 16)

> **대상**: `e2e/dual-2pc.spec.ts`, `e2e/sequential-regression.spec.ts`
> **의존성**: BE (port 5000) + mock DE #1/#2 + FE dev server (port 3000)

---

## 1. 사전 준비

### 1-1. 서비스 기동 (전체 자동 — 권장)

```bat
:: Team-project 루트에서 실행
start-e2e-dual-2pc.bat
```

bat이 다음을 자동 수행함:

1. Redis Docker 컨테이너 기동
2. BE 기동 (`npm run dev` @ port 5000) + `DUAL_2PC_REGISTRATION_TIMEOUT_MS=5000` 주입
3. mock DE #1 기동 (`scripts/mock_data_engine.py --subject-index 1 --port 8001`)
4. mock DE #2 기동 (`scripts/mock_data_engine.py --subject-index 2 --port 8002`)
5. FE 개발 서버 기동 (`npm run dev` @ port 3000, 로컬 BE 지정)

### 1-2. 수동 기동 (개별 제어)

```bat
:: 1. Redis
cd mind-signal-backend && docker-compose up -d

:: 2. BE (Scenario 3용 timeout 단축 환경변수 포함)
cd mind-signal-backend
set DUAL_2PC_REGISTRATION_TIMEOUT_MS=5000
npm run dev

:: 3. mock DE #1 (Scenario 1/3용)
cd mind-signal-data-engine
conda activate mind-signal
python scripts/mock_data_engine.py --subject-index 1 --port 8001

:: 4. mock DE #2 (Scenario 1용; Scenario 3에서는 이 서버를 기동하지 않아야 함)
python scripts/mock_data_engine.py --subject-index 2 --port 8002

:: 5. FE dev server
cd mind-signal-frontend
set NEXT_PUBLIC_API_URL=http://localhost:5000
set NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
npm run dev
```

### 1-3. 준비 완료 확인

```
FE:       http://localhost:3000            (Next.js dev server)
BE:       http://localhost:5000/api-docs   (Swagger UI)
mock DE1: http://localhost:8001/health     → {"status":"ok","subject_index":1,...}
mock DE2: http://localhost:8002/health     → {"status":"ok","subject_index":2,...}
```

---

## 2. 테스트 실행

### Scenario 1+2 (Happy Path + Invalid Token)

```bash
cd mind-signal-frontend
npx playwright test dual-2pc.spec.ts --reporter=list
```

### Scenario 3만 (Subject 2 DE 미기동 + timeout)

**사전 조건**: `start-e2e-dual-2pc.bat`으로 모든 서비스 기동 후 **mock DE #2 창(port 8002)만 닫기**.

```bash
npx playwright test dual-2pc.spec.ts --grep "Scenario 3" --reporter=list
```

### Scenario 4 (SEQUENTIAL regression)

```bash
npx playwright test sequential-regression.spec.ts --reporter=list
```

### 전체 목록 확인

```bash
npx playwright test --list
```

---

## 3. Scenario별 요약

### Scenario 1: 2PC Happy Path (PLAN L855-874)

| Step | 동작 | 기대 결과 |
|------|------|----------|
| 1 | node_A: /lab 진입 | 세션 생성 UI |
| 2 | node_A: DUAL_2PC 모드 + 파트너 PC 초대 QR 생성 | invite QR 표시 + 만료 타이머 |
| 3 | node_A: QR data URL → token 파싱 | JWT token 확보 |
| 4 | node_B: /lab/operator-join?token={token}&groupId={groupId} | 페이지 로드 |
| 5 | node_B: "합류하기" 버튼 클릭 | joinAsOperator 성공 |
| 6 | node_B: /lab?groupId={groupId} 리다이렉트 | 세션 대시보드 로드 |
| 7 | node_B: socket.emit('join-room', groupId) | join-room 이벤트 발행 |
| 8 | node_A: "파트너 PC 연결됨" 배너 | DualSessionBanner 표시 |
| 9 | node_A: "측정 시작" | stimulus_start 이벤트 |
| 10 | node_A+B: signal 차트 데이터 수신 | 두 차트 동시 업데이트 |
| 11 | stimulus_start payload + aligned_pair 이벤트 수신 | timestamp_ms 포함 |
| 12 | 콘솔 에러 없음 | JS 런타임 오류 0건 |
| 13 | 두 컨텍스트 스크린샷 저장 | test-results/ 저장 |

### Scenario 2: Invalid/Expired Token (PLAN L876-883)

| Step | 동작 | 기대 결과 |
|------|------|----------|
| 1 | node_B: /lab/operator-join?token=invalid_jwt | 페이지 로드 |
| 2 | node_B: "합류하기" 클릭 | 401 + 에러 메시지 |
| 3 | node_B: "재발급 요청" 버튼 표시 | 버튼 visible |
| 4 | 콘솔 에러 없음 (handled) | JS 런타임 오류 0건 |

### Scenario 3: Partial Failure (PLAN L885-894 + R9-M)

| Step | 동작 | 기대 결과 |
|------|------|----------|
| 1 | node_A~B: 전체 페어링 (DUAL_2PC) | experimentMode=DUAL_2PC |
| 2 | node_A: 측정 시작 | DE #1 등록 완료, #2 등록 대기 |
| 3 | wait_for 6000ms | SESSION CANCELLED 상태 전이 |
| 4 | 두 PC: "파트너 DE 등록 실패" 에러 UI | 에러 배너 표시 |

> **R9-M 반영**: PLAN 원문 `wait_for 60000ms` → `DUAL_2PC_REGISTRATION_TIMEOUT_MS=5000` BE 오버라이드 적용 → Playwright `waitForTimeout(6000)` (5초 + 1초 여유).

### Scenario 4: SEQUENTIAL Regression (PLAN L896-904)

| Step | 동작 | 기대 결과 |
|------|------|----------|
| 1 | /lab SEQUENTIAL 모드 진입 | 기존 Subject QR 생성 UI |
| 2 | 측정 시작 | 기존 getEngineUrl() 경로 호출 |
| 3 | signal 수신 | eeg-live 이벤트 정상 수신 |

> Step 2-3는 mock DE + BE 기동 환경에서 완전 검증. DE 없는 환경에서는 UI 회귀만 검증함.
> 전체 SEQUENTIAL happy path는 `e2e/sequential-measurement.spec.ts` 참조.

---

## 4. DUAL_2PC_REGISTRATION_TIMEOUT_MS 설명

| 변수 | 기본값 | E2E 오버라이드 |
|------|--------|--------------|
| `DUAL_2PC_REGISTRATION_TIMEOUT_MS` | 60000 (60초) | 5000 (5초) |

**용도**: BE가 두 Subject DE 등록 완료를 기다리는 시간 (ms).

**Scenario 3에서 오버라이드가 필요한 이유**:
- PLAN 원문: "wait_for 60000ms — SESSION CANCELLED 상태" (60초 대기)
- Playwright timeout을 60초로 설정하면 테스트 suite 전체 지연 발생
- `DUAL_2PC_REGISTRATION_TIMEOUT_MS=5000`으로 BE를 기동하면 5초 후 자동 timeout → Playwright `waitForTimeout(6000)` 으로 커버 가능
- `start-e2e-dual-2pc.bat`이 이 값을 자동 주입함

**적용 범위**:
- `start-e2e-dual-2pc.bat`: BE 기동 시 `set DUAL_2PC_REGISTRATION_TIMEOUT_MS=5000`
- `e2e/dual-2pc.spec.ts` Scenario 3: `await pageA.waitForTimeout(6000)`
- BE `src/` 내 `DUAL_2PC_REGISTRATION_TIMEOUT_MS` 환경변수 읽는 위치 확인 필요

---

## 5. 실행 결과 스크린샷

성공 또는 부분 실행 시 `test-results/` 폴더에 저장됨:

```
test-results/
├── dual-2pc-scenario1-nodeA.png
├── dual-2pc-scenario1-nodeB.png
├── dual-2pc-scenario2-invalid-token.png
├── dual-2pc-scenario3-nodeA-timeout.png
├── dual-2pc-scenario3-nodeB-timeout.png
└── sequential-regression-scenario4.png
```

---

## 6. 기존 E2E 이슈 (스코프 외)

Phase 15에서 등록된 FE E2E 이슈 (#43~#47)는 이번 Phase 16 스코프에 포함되지 않음.
해당 이슈는 별도 fix 브랜치에서 처리 예정.
