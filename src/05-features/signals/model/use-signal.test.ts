/**
 * FE-5: useSignal 훅 DUAL_2PC 경로 단위 테스트 수행함
 *
 * 검증 범위:
 *   - startMeasurement(DUAL_2PC) → join-room emit 호출
 *   - stimulus_start 수신 시 로컬 수신 시각 기록 (stimulusLocalTimeRef)
 *   - aligned_pair 수신 시 subject_1/subject_2 키 사용 검증 (v8 H-1)
 *   - v3 N-5: DUAL_2PC 202 수신 직후 setIsMeasuring(true) 금지,
 *             dual-session-ready 이벤트 수신 시에만 isMeasuring=true 전이
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useSignal from './use-signal';

// measurementApi 모킹 처리함
vi.mock('@/07-shared/api', () => ({
  measurementApi: {
    startMeasurement: vi
      .fn()
      .mockResolvedValue({ data: { status: 'success' } }),
  },
  EmotivMetrics: {},
}));

// engineApi 모킹 처리함
vi.mock('@/07-shared/api/engine', () => ({
  engineApi: {
    stopAll: vi.fn().mockResolvedValue({ data: { status: 'success' } }),
  },
}));

// socket-client 모킹 처리함
const mockSocketEmit = vi.fn();
const mockSocketOn = vi.fn();
const mockSocketOff = vi.fn();
const mockSocket = {
  emit: mockSocketEmit,
  on: mockSocketOn,
  off: mockSocketOff,
};
vi.mock('@/07-shared/lib/socket-client', () => ({
  getSocket: vi.fn(() => mockSocket),
}));

// config 모킹 처리함
vi.mock('@/07-shared/config/config', () => ({
  config: {
    api: {
      baseUrl: 'https://test-backend.example.com/api',
      socketUrl: 'https://test-backend.example.com',
    },
  },
}));

// DualSessionState 타입 참조
import type { DualSessionState } from '@/05-features/sessions/model/use-dual-session';
import { measurementApi } from '@/07-shared/api';

/**
 * 등록된 소켓 이벤트 핸들러를 이름으로 추출하는 헬퍼 정의함
 */
function getSocketHandler(
  eventName: string
): ((payload: unknown) => void) | null {
  const calls = mockSocketOn.mock.calls as Array<
    [string, (payload: unknown) => void]
  >;
  const found = calls.find((call) => call[0] === eventName);
  return found ? found[1] : null;
}

describe('useSignal DUAL_2PC — join-room emit + stimulus 테스트 수행함', () => {
  const mockSetDualSessionState = vi.fn() as (s: DualSessionState) => void;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('DUAL_2PC startMeasurement 호출 시 join-room emit 수행함', async () => {
    const { result } = renderHook(() =>
      useSignal('session-abc', {
        experimentMode: 'DUAL_2PC',
        groupId: 'group-xyz',
        setDualSessionState: mockSetDualSessionState,
      })
    );

    await act(async () => {
      await result.current.startMeasurement();
    });

    // join-room emit 호출 확인함
    expect(mockSocketEmit).toHaveBeenCalledWith(
      'join-room',
      'group-xyz',
      expect.any(Function)
    );
  });

  it('join-room emit 후 ack ok=true 수신 시 roomJoined=true 전이 처리됨', async () => {
    const { result } = renderHook(() =>
      useSignal('session-abc', {
        experimentMode: 'DUAL_2PC',
        groupId: 'group-xyz',
        setDualSessionState: mockSetDualSessionState,
      })
    );

    await act(async () => {
      await result.current.startMeasurement();
    });

    // ack 콜백 추출 및 호출 처리함
    const emitCalls = mockSocketEmit.mock.calls as Array<
      [string, ...unknown[]]
    >;
    const joinRoomCall = emitCalls.find((call) => call[0] === 'join-room');
    const ackCallback = joinRoomCall?.[2] as
      | ((response: { ok: boolean }) => void)
      | undefined;

    expect(ackCallback).toBeDefined();

    act(() => {
      ackCallback!({ ok: true });
    });

    expect(result.current.roomJoined).toBe(true);
  });

  it('DUAL_2PC startMeasurement 202 수신 후 isMeasuring=false 유지 처리됨 (v3 N-5)', async () => {
    // v3 N-5: 202 Accepted 직후 setIsMeasuring(true) 금지 — dual-session-ready 대기함
    const { result } = renderHook(() =>
      useSignal('session-abc', {
        experimentMode: 'DUAL_2PC',
        groupId: 'group-xyz',
        setDualSessionState: mockSetDualSessionState,
      })
    );

    await act(async () => {
      await result.current.startMeasurement();
    });

    // API 호출됐지만 isMeasuring은 아직 false여야 함
    expect(measurementApi.startMeasurement).toHaveBeenCalledTimes(1);
    expect(result.current.isMeasuring).toBe(false);
  });

  it('dual-session-ready 수신 시 isMeasuring=true 전이 처리됨 (v3 N-5)', async () => {
    const { result } = renderHook(() =>
      useSignal('session-abc', {
        experimentMode: 'DUAL_2PC',
        groupId: 'group-xyz',
        setDualSessionState: mockSetDualSessionState,
      })
    );

    await act(async () => {
      await result.current.startMeasurement();
    });

    // dual-session-ready 핸들러 추출 및 호출함
    const readyHandler = getSocketHandler('dual-session-ready');
    expect(readyHandler).not.toBeNull();

    act(() => {
      readyHandler!({ groupId: 'group-xyz', timestamp_ms: Date.now() });
    });

    expect(result.current.isMeasuring).toBe(true);
    // setDualSessionState('measuring') 콜백 호출 검증함
    expect(mockSetDualSessionState).toHaveBeenCalledWith('measuring');
  });

  it('stimulus_start 수신 시 로컬 수신 시각 기록 처리됨 (console.info 호출 확인)', async () => {
    const consoleSpy = vi
      .spyOn(console, 'info')
      .mockImplementation(() => undefined);

    const fixedNow = 1_700_000_000_000;
    vi.setSystemTime(fixedNow);

    const { result } = renderHook(() =>
      useSignal('session-abc', {
        experimentMode: 'DUAL_2PC',
        groupId: 'group-xyz',
        setDualSessionState: mockSetDualSessionState,
      })
    );

    await act(async () => {
      await result.current.startMeasurement();
    });

    const stimulusHandler = getSocketHandler('stimulus_start');
    expect(stimulusHandler).not.toBeNull();

    const serverTs = fixedNow - 50;
    act(() => {
      stimulusHandler!({ groupId: 'group-xyz', timestamp_ms: serverTs });
    });

    // stimulus_start 수신 시 로컬 시각 및 skew 로깅 확인함
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('stimulus_start 수신')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining(`local_ts=${fixedNow}`)
    );

    consoleSpy.mockRestore();
  });

  it('aligned_pair 수신 시 subject_1/subject_2 키 사용 검증 처리됨 (v8 H-1)', async () => {
    const { result } = renderHook(() =>
      useSignal('session-abc', {
        experimentMode: 'DUAL_2PC',
        groupId: 'group-xyz',
        setDualSessionState: mockSetDualSessionState,
      })
    );

    await act(async () => {
      await result.current.startMeasurement();
    });

    const alignedPairHandler = getSocketHandler('aligned_pair');
    expect(alignedPairHandler).not.toBeNull();

    const subject1Wave = {
      delta: 0.1,
      theta: 0.2,
      alpha: 0.3,
      beta: 0.4,
      gamma: 0.5,
    };
    const subject2Wave = {
      delta: 0.6,
      theta: 0.7,
      alpha: 0.8,
      beta: 0.9,
      gamma: 1.0,
    };

    act(() => {
      // v8 H-1: subject_1/subject_2 키 사용 — subject_0 키 사용 금지 검증
      alignedPairHandler!({
        groupId: 'group-xyz',
        timestamp_ms: Date.now(),
        subject_1: subject1Wave,
        subject_2: subject2Wave,
      });
    });

    // subject_1 데이터 기반으로 currentMetrics 업데이트됨 확인함
    expect(result.current.currentMetrics).not.toBeNull();
    expect(result.current.currentMetrics?.focus).toBe(subject1Wave.beta);
    expect(result.current.currentMetrics?.engagement).toBe(subject1Wave.alpha);
    expect(result.current.currentMetrics?.interest).toBe(subject1Wave.theta);
    expect(result.current.currentMetrics?.excitement).toBe(subject1Wave.gamma);
    expect(result.current.currentMetrics?.stress).toBe(subject1Wave.delta);
  });

  it('aligned_pair 수신 시 다른 groupId이면 currentMetrics 미업데이트 처리됨', async () => {
    const { result } = renderHook(() =>
      useSignal('session-abc', {
        experimentMode: 'DUAL_2PC',
        groupId: 'group-xyz',
        setDualSessionState: mockSetDualSessionState,
      })
    );

    await act(async () => {
      await result.current.startMeasurement();
    });

    const alignedPairHandler = getSocketHandler('aligned_pair');

    act(() => {
      alignedPairHandler!({
        groupId: 'group-OTHER',
        timestamp_ms: Date.now(),
        subject_1: { delta: 1, theta: 1, alpha: 1, beta: 1, gamma: 1 },
        subject_2: null,
      });
    });

    expect(result.current.currentMetrics).toBeNull();
  });

  it('DUAL_2PC 리스너 등록 확인 — dual-session-ready/failed/stimulus_start/aligned_pair 처리됨', async () => {
    const { result } = renderHook(() =>
      useSignal('session-abc', {
        experimentMode: 'DUAL_2PC',
        groupId: 'group-xyz',
        setDualSessionState: mockSetDualSessionState,
      })
    );

    await act(async () => {
      await result.current.startMeasurement();
    });

    const registeredEvents = (
      mockSocketOn.mock.calls as Array<[string, unknown]>
    ).map((call) => call[0]);
    expect(registeredEvents).toContain('dual-session-ready');
    expect(registeredEvents).toContain('dual-session-failed');
    expect(registeredEvents).toContain('stimulus_start');
    expect(registeredEvents).toContain('aligned_pair');
  });
});
