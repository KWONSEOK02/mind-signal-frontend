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
    // startMeasurement 가 join-room ack 를 기다리므로(CodeRabbit FE PR #67 Major)
    // mock 소켓이 ack 를 돌려주지 않으면 측정 시작이 진행되지 않음
    mockSocketEmit.mockImplementation(
      (event: string, _payload: unknown, ack?: (r: unknown) => void) => {
        if (event === 'join-room' && typeof ack === 'function') {
          ack({ ok: true });
        }
      }
    );
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

    // join-room emit 호출 확인함.
    // AUTH-W001 이후 payload 가 문자열이 아니라 groupId 와 token 을 담은 객체임 —
    // 백엔드가 무인증 join 을 거부하므로 토큰 없이 보내면 room 에 못 들어감
    expect(mockSocketEmit).toHaveBeenCalledWith(
      'join-room',
      expect.objectContaining({ groupId: 'group-xyz' }),
      expect.any(Function)
    );
  });

  it('join-room emit에 로컬 스토리지 토큰이 실려 나감 (AUTH-W001)', async () => {
    // 토큰을 빠뜨리면 백엔드가 unauthorized 로 거부해 room 에 못 들어가고
    // eeg-live 와 measurement-complete 가 도착하지 않음
    localStorage.setItem('token', 'test-jwt-token');

    try {
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

      expect(mockSocketEmit).toHaveBeenCalledWith(
        'join-room',
        { groupId: 'group-xyz', token: 'test-jwt-token' },
        expect.any(Function)
      );
    } finally {
      localStorage.removeItem('token');
    }
  });

  it('join-room ack가 거부되면 측정 시작 API를 부르지 않음 (CodeRabbit PR #67)', async () => {
    // room 에 못 들어간 채로 측정을 시작하면 eeg-live 와 measurement-complete 가
    // 도착하지 않아 화면이 측정 중에 갇힘. 합류 실패면 시작하지 않아야 함
    mockSocketEmit.mockImplementation(
      (event: string, _payload: unknown, ack?: (r: unknown) => void) => {
        if (event === 'join-room' && typeof ack === 'function') {
          ack({ ok: false, error: 'unauthorized' });
        }
      }
    );

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

    expect(measurementApi.startMeasurement).not.toHaveBeenCalled();
    expect(result.current.isMeasuring).toBe(false);
  });

  it('join-room emit이 측정 시작 API보다 먼저 나감 (CodeRabbit PR #67)', async () => {
    const order: string[] = [];
    mockSocketEmit.mockImplementation(
      (event: string, _payload: unknown, ack?: (r: unknown) => void) => {
        if (event === 'join-room' && typeof ack === 'function') {
          order.push('join-room');
          ack({ ok: true });
        }
      }
    );
    vi.mocked(measurementApi.startMeasurement).mockImplementation(async () => {
      order.push('startMeasurement');
      return { data: { status: 'success' } } as never;
    });

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

    expect(order).toEqual(['join-room', 'startMeasurement']);
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

    // waves와 metrics에 겹치지 않는 값을 넣어 FE가 metrics만 쓰는지 증명함.
    // 구 동작은 waves를 지표 자리에 끼워 넣어 stress에 delta(1000 스케일)가 들어갔음.
    const subject1 = {
      waves: { delta: 1000, theta: 300, alpha: 200, beta: 210, gamma: 110 },
      metrics: {
        focus: 0.11,
        engagement: 0.22,
        interest: 0.33,
        excitement: 0.44,
        stress: 0.55,
        relaxation: 0.66,
      },
    };
    const subject2 = {
      waves: { delta: 900, theta: 280, alpha: 190, beta: 205, gamma: 100 },
      metrics: {
        focus: 0.71,
        engagement: 0.72,
        interest: 0.73,
        excitement: 0.74,
        stress: 0.75,
        relaxation: 0.76,
      },
    };

    act(() => {
      // v8 H-1: subject_1/subject_2 키 사용 — subject_0 키 사용 금지 검증
      alignedPairHandler!({
        groupId: 'group-xyz',
        timestamp_ms: Date.now(),
        subject_1: subject1,
        subject_2: subject2,
      });
    });

    // metrics를 그대로 사용함 — waves 값이 새어 들어오면 안 됨
    expect(result.current.currentMetrics).toEqual(subject1.metrics);
    expect(result.current.currentMetrics2).toEqual(subject2.metrics);
    // 회귀 가드: stress에 delta가 들어가던 결함 재발 방지
    expect(result.current.currentMetrics?.stress).not.toBe(
      subject1.waves.delta
    );
    // 회귀 가드: engagement과 relaxation이 둘 다 alpha이던 결함 재발 방지
    expect(result.current.currentMetrics?.engagement).not.toBe(
      result.current.currentMetrics?.relaxation
    );
  });

  it('aligned_pair에 metrics가 없으면 지표를 갱신하지 않음 (구버전 프레임 방어)', async () => {
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
        groupId: 'group-xyz',
        timestamp_ms: Date.now(),
        subject_1: {
          waves: { delta: 1000, theta: 300, alpha: 200, beta: 210, gamma: 110 },
        },
        subject_2: null,
      });
    });

    // metrics 부재 시 대역 파워를 지표로 오표시하지 않고 null 유지함
    expect(result.current.currentMetrics).toBeNull();
  });

  it('aligned_pair subject_1:null + subject_2 수신 시 currentMetrics2만 업데이트됨 (단일 헤드셋)', async () => {
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

    const subject2 = {
      waves: { delta: 900, theta: 280, alpha: 190, beta: 205, gamma: 100 },
      metrics: {
        focus: 0.71,
        engagement: 0.72,
        interest: 0.73,
        excitement: 0.74,
        stress: 0.75,
        relaxation: 0.76,
      },
    };

    act(() => {
      // 노트북 B(subject 2)만 측정 — subject_1 없음
      alignedPairHandler!({
        groupId: 'group-xyz',
        timestamp_ms: Date.now(),
        subject_1: null,
        subject_2: subject2,
      });
    });

    // subject_1 없음 → currentMetrics는 null 유지, subject_2 → currentMetrics2 업데이트됨
    expect(result.current.currentMetrics).toBeNull();
    expect(result.current.currentMetrics2).toEqual(subject2.metrics);
  });

  it('aligned_pair subject_2에 비유한 값(NaN) 포함 시 currentMetrics2 미갱신 처리됨 (차트 깨짐 방지)', async () => {
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
        groupId: 'group-xyz',
        timestamp_ms: Date.now(),
        subject_1: null,
        subject_2: {
          delta: NaN,
          theta: 0.7,
          alpha: 0.8,
          beta: 0.9,
          gamma: 1.0,
        },
      });
    });

    // NaN 한 번이라도 들어오면 currentMetrics2는 null 유지 (차트로 전파 차단)
    expect(result.current.currentMetrics2).toBeNull();
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
