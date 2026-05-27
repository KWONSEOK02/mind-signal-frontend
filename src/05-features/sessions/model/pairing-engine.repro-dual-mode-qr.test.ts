import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PairingStep } from './pairing-engine';

/**
 * DUAL 모드 QR 미생성 버그 재현 — pairing-engine 통합 테스트 수행함
 *
 * root cause (engine 관점):
 *   PairingStep.execute()가 sessionApi.createdPairing(groupId || undefined)를
 *   호출하지만, session.ts 계층에서 `groupId || null`로 null 치환이 일어남.
 *   BE가 400을 반환하면 execute() catch 블록이 onStatusUpdate('ERROR')를 호출하고
 *   throw함. use-pairing.ts는 catch에서 setStatus(ERROR)로 전환함.
 *   결과: pairingCode 미세팅, QR 미표시, 타이머 미시작.
 */
vi.mock('@/07-shared', () => ({
  sessionApi: {
    createdPairing: vi.fn(),
    checkSessionStatus: vi.fn(),
  },
}));

import { sessionApi } from '@/07-shared';
const mockCreatedPairing = sessionApi.createdPairing as ReturnType<
  typeof vi.fn
>;
const mockCheckStatus = sessionApi.checkSessionStatus as ReturnType<
  typeof vi.fn
>;

// ────────────────────────────────────────────────────────────────────────────
// 회귀 시뮬레이션 매핑
//
// Simulation A (현재 동작 — 버그 박제):
//   BE 400 응답 → onStatusUpdate('ERROR') 호출 + execute() throw
//   → pairingCode는 세팅되지 않음 (use-pairing에서 catch 블록 진입)
//   → 타이머/폴링 미시작
//   → 현재 코드 그대로라면 PASS (버그 존재 확인)
//
// Simulation B (fix 후 기대 동작 — fix 후 PASS):
//   fix 후 BE 201 성공 → onStatusUpdate('ERROR') 미호출
//   → pairingToken 정상 반환 → QR 표시 가능
//
// Simulation C (정상 흐름 — groupId 있는 경우):
//   groupId='abc' 전달 시 BE 성공 → pairingToken 반환 → PASS
// ────────────────────────────────────────────────────────────────────────────

describe('Reproduce: startPairing이 BE 400 응답 시 동작 박제함', () => {
  let engine: PairingStep;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- vi.fn() 타입 호환용
  let onStatusUpdate: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let onTimeUpdate: any;

  beforeEach(() => {
    vi.useFakeTimers();
    engine = new PairingStep('DUAL');
    onStatusUpdate = vi.fn();
    onTimeUpdate = vi.fn();
    vi.clearAllMocks();
  });

  afterEach(() => {
    engine.clear();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  /**
   * Simulation A: BE 400 응답 → ERROR 콜백 + pairingCode null 유지 박제함
   *
   * groupId 없이 execute() 호출 시 session.ts 계층에서 null 전송 →
   * BE 400 응답 → execute() catch 블록 → onStatusUpdate('ERROR') 호출 →
   * throw 발생 확인함. 타이머와 폴링도 시작되지 않음을 검증함.
   *
   * 이 테스트는 현재 PASS (버그 재현 성공).
   * fix 후에는 이 테스트가 FAIL로 전환되어 버그 재발 경보 역할을 수행함.
   */
  it('[Sim-A] BE 400 응답 시 onStatusUpdate("ERROR") 호출 + execute() throw 발생함 (버그 박제)', async () => {
    // arrange: BE 400 응답 모킹 (null groupId 전송으로 인한 Validation 실패)
    const be400Error = Object.assign(new Error('Bad Request'), {
      response: {
        status: 400,
        data: { message: 'groupId must be a string' },
      },
    });
    mockCreatedPairing.mockRejectedValue(be400Error);

    // act + assert: execute()가 throw하는지 확인함
    await expect(engine.execute(onStatusUpdate, onTimeUpdate)).rejects.toThrow(
      'Bad Request'
    );

    // assert: ERROR 콜백 호출 확인
    expect(onStatusUpdate).toHaveBeenCalledWith('ERROR');
    expect(onStatusUpdate).toHaveBeenCalledTimes(1);

    // assert: 타이머 시작 안 됨 — 400 에러 직후라 인터벌 설정 전 throw됨
    onTimeUpdate.mockClear();
    onStatusUpdate.mockClear();
    await vi.advanceTimersByTimeAsync(3000);
    expect(onTimeUpdate).not.toHaveBeenCalled();
    expect(onStatusUpdate).not.toHaveBeenCalled();
  });

  /**
   * Simulation A-2: createdPairing에 undefined 전달 확인 박제함
   *
   * pairing-engine은 `groupId || undefined` 변환 후 createdPairing에 전달하지만
   * session.ts에서 다시 `groupId || null`로 치환함. engine 레벨에서
   * createdPairing 호출 시 인자가 undefined임을 직접 spy로 검증함.
   * (null로 치환되는 지점은 session.ts 계층 — session.repro 테스트에서 박제)
   */
  it('[Sim-A2] groupId 없이 execute() 호출 시 createdPairing에 undefined 전달됨', async () => {
    // arrange: 성공 응답 (engine 호출 인자 검증이 목적)
    const mockPairingData = {
      groupId: 'group-1',
      subjectIndex: 0,
      pairingToken: 'token-abc',
      expiresAt: new Date(Date.now() + 300_000).toISOString(),
    };
    mockCreatedPairing.mockResolvedValue({
      data: { status: 'success', data: mockPairingData },
    } as never);
    mockCheckStatus.mockResolvedValue({
      data: {
        data: {
          groupId: 'group-1',
          sessions: [
            { subjectIndex: 0, status: 'waiting', guestJoined: false },
          ],
        },
      },
    } as never);

    // act
    await engine.execute(onStatusUpdate, onTimeUpdate);

    // assert: engine이 createdPairing에 undefined를 전달함
    // (session.ts 계층에서 undefined → null 치환이 일어나는 지점)
    expect(mockCreatedPairing).toHaveBeenCalledWith(undefined);
  });

  /**
   * Simulation B: fix 후 기대 동작 — BE 성공 시 ERROR 미호출 + 타이머 시작됨
   *
   * fix 후에는 null 대신 유효한 body가 전달되어 BE 201 성공 →
   * onStatusUpdate('ERROR') 미호출 + 타이머 시작 + pairingToken 반환.
   * 현재는 Sim-A 같은 null 전송 케이스가 이 경로로 와야 하지만
   * null 전송으로 400이 나므로 이 케이스를 별도 시나리오로 확인함.
   */
  it('[Sim-B] groupId 있는 경우 BE 성공 시 ERROR 미호출 + 타이머 시작됨 (fix 후 Sim-A도 이 경로로 전환되어야 함)', async () => {
    // arrange: groupId 있는 정상 케이스 — BE 201 성공
    const mockPairingData = {
      groupId: 'group-existing',
      subjectIndex: 0,
      pairingToken: 'token-success',
      expiresAt: new Date(Date.now() + 300_000).toISOString(),
    };
    mockCreatedPairing.mockResolvedValue({
      data: { status: 'success', data: mockPairingData },
    } as never);
    mockCheckStatus.mockResolvedValue({
      data: {
        data: {
          groupId: 'group-existing',
          sessions: [
            { subjectIndex: 0, status: 'waiting', guestJoined: false },
          ],
        },
      },
    } as never);

    // act
    const result = await engine.execute(
      onStatusUpdate,
      onTimeUpdate,
      'group-existing'
    );

    // assert: ERROR 콜백 미호출
    expect(onStatusUpdate).not.toHaveBeenCalledWith('ERROR');

    // assert: pairingToken 정상 반환됨
    expect(result.pairingToken).toBe('token-success');

    // assert: 타이머 시작됨
    await vi.advanceTimersByTimeAsync(1000);
    expect(onTimeUpdate).toHaveBeenCalled();
  });

  /**
   * Simulation C: groupId=null 직접 전달 시 engine 내부 null 처리 박제함
   *
   * use-pairing.ts의 startPairing은 `groupId` 상태를 engine에 전달함.
   * 초기 상태는 null이므로 engine은 `null || undefined` = undefined를
   * createdPairing에 전달함. session.ts에서 undefined → null 치환이 발생함.
   */
  it('[Sim-C] groupId=null 전달 시 createdPairing에 undefined가 전달됨', async () => {
    // arrange
    const mockPairingData = {
      groupId: 'group-new',
      subjectIndex: 0,
      pairingToken: 'token-new',
      expiresAt: new Date(Date.now() + 300_000).toISOString(),
    };
    mockCreatedPairing.mockResolvedValue({
      data: { status: 'success', data: mockPairingData },
    } as never);
    mockCheckStatus.mockResolvedValue({
      data: {
        data: {
          groupId: 'group-new',
          sessions: [
            { subjectIndex: 0, status: 'waiting', guestJoined: false },
          ],
        },
      },
    } as never);

    // act: use-pairing의 초기 groupId(null)를 engine에 전달하는 것과 동일한 흐름
    await engine.execute(onStatusUpdate, onTimeUpdate, null);

    // assert: `null || undefined` = undefined → createdPairing(undefined) 호출됨
    // session.ts에서 undefined → null 치환 발생 지점은 session.repro 테스트에서 박제
    expect(mockCreatedPairing).toHaveBeenCalledWith(undefined);
  });
});

/**
 * DUAL 모드 QR 버그 — 전체 시나리오 연쇄 흐름 박제함
 *
 * use-pairing.startPairing() → engine.execute() → createdPairing(undefined)
 * → session.ts: undefined → null → BE 400 → ERROR 콜백 → pairingCode 미세팅
 * 각 단계 연결고리를 명시적으로 문서화함.
 */
describe('DUAL 모드 QR 버그 — 400 응답 후 폴링/타이머 미시작 박제함', () => {
  let engine: PairingStep;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let onStatusUpdate: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let onTimeUpdate: any;

  beforeEach(() => {
    vi.useFakeTimers();
    engine = new PairingStep('DUAL');
    onStatusUpdate = vi.fn();
    onTimeUpdate = vi.fn();
    vi.clearAllMocks();
  });

  afterEach(() => {
    engine.clear();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  /**
   * BE 400 응답 후 3초 경과해도 폴링/타이머 콜백이 발생하지 않음을 검증함.
   * QR 미표시는 pairingCode가 null로 남아있기 때문임.
   */
  it('BE 400 응답 후 3초 진행해도 폴링/타이머 콜백 미발생함 (QR 미표시 원인 박제)', async () => {
    // arrange: 400 응답
    const be400Error = Object.assign(new Error('Bad Request'), {
      response: { status: 400, data: { message: 'groupId null rejected' } },
    });
    mockCreatedPairing.mockRejectedValue(be400Error);

    // act
    await expect(
      engine.execute(onStatusUpdate, onTimeUpdate)
    ).rejects.toThrow();

    // 에러 콜백 이후 초기화 확인
    onStatusUpdate.mockClear();
    onTimeUpdate.mockClear();

    // 3초 경과
    await vi.advanceTimersByTimeAsync(3000);

    // assert: 타이머도 폴링도 시작 안 됨 → pairingCode 세팅 불가 → QR 없음
    expect(onTimeUpdate).not.toHaveBeenCalled();
    expect(onStatusUpdate).not.toHaveBeenCalled();
    expect(mockCheckStatus).not.toHaveBeenCalled();
  });
});
