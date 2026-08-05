/**
 * useSignal — DUAL_2PC 룸 재합류 시 리스너 누적 방지 + 상태 전이 검증함
 *
 * 배경: 측정 시작이 실패하면 사용자가 다시 시작할 수 있다. 그때 joinDualRoom 과
 * startMeasurement 가 다시 불리는데, 이전 핸들러를 해제하지 않으면 완료 이벤트
 * 1건이 여러 핸들러에서 처리된다. CodeRabbit PR #66 지적분.
 * mock 소켓이 등록 상태를 실제로 보유하므로 emitFromServer 로 서버 이벤트를
 * 흘려 관찰 가능한 상태 전이(isMeasuring, dualSessionState)를 검증함.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useSignal from './use-signal';

vi.mock('@/07-shared/api', () => ({
  measurementApi: {
    startMeasurement: vi
      .fn()
      .mockResolvedValue({ data: { status: 'success' } }),
  },
}));

// 이벤트별 현재 등록 핸들러 보유함 — on/off 가 실제로 추가·제거 처리함
const listeners = new Map<string, Set<(payload: unknown) => void>>();

const mockSocketOn = vi.fn(
  (event: string, handler: (payload: unknown) => void) => {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event)!.add(handler);
  }
);
const mockSocketOff = vi.fn(
  (event: string, handler: (payload: unknown) => void) => {
    listeners.get(event)?.delete(handler);
  }
);
// join-room ack 즉시 성공 응답함 — emitJoinRoom Promise resolve 용
const mockSocketEmit = vi.fn(
  (_event: string, _payload: unknown, ack?: (response: unknown) => void) => {
    if (typeof ack === 'function') ack({ ok: true });
  }
);
const mockSocket = {
  on: mockSocketOn,
  off: mockSocketOff,
  emit: mockSocketEmit,
};

/** 서버 발행 이벤트를 현재 등록된 핸들러 전부에 전달함 */
const emitFromServer = (event: string, payload: unknown) => {
  for (const handler of [...(listeners.get(event) ?? [])]) {
    handler(payload);
  }
};
vi.mock('@/07-shared/lib/socket-client', () => ({
  getSocket: vi.fn(() => mockSocket),
}));

vi.mock('@/07-shared/config/config', () => ({
  config: {
    api: {
      baseUrl: 'https://test-backend.example.com/api',
      socketUrl: 'https://test-backend.example.com',
    },
  },
}));

const GROUP_ID = 'grp-listener-test';

/** 특정 이벤트로 등록된 핸들러 목록 반환함 */
const handlersFor = (event: string) =>
  mockSocketOn.mock.calls.filter((c) => c[0] === event).map((c) => c[1]);

/** 특정 이벤트로 해제된 핸들러 목록 반환함 */
const offHandlersFor = (event: string) =>
  mockSocketOff.mock.calls.filter((c) => c[0] === event).map((c) => c[1]);

describe('useSignal — joinDualRoom 재호출 시 리스너 누적 방지함', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listeners.clear();
  });

  it('재합류 시 이전 measurement-complete 핸들러를 해제한 뒤 등록함', () => {
    const { result } = renderHook(() =>
      useSignal(null, {
        experimentMode: 'DUAL_2PC',
        groupId: GROUP_ID,
      })
    );

    act(() => {
      result.current.joinDualRoom();
    });

    const firstHandlers = handlersFor('measurement-complete');
    expect(firstHandlers).toHaveLength(1);
    // 첫 합류에는 해제할 이전 핸들러가 없음
    expect(offHandlersFor('measurement-complete')).toHaveLength(0);

    // 시작 실패 후 재시도 상황을 재현함
    act(() => {
      result.current.joinDualRoom();
    });

    // 두 번째 합류는 첫 번째 핸들러를 정확히 지목해 해제해야 함
    expect(offHandlersFor('measurement-complete')).toEqual([firstHandlers[0]]);
    expect(handlersFor('measurement-complete')).toHaveLength(2);
  });

  it('재합류 시 DUAL_2PC 이벤트 핸들러 4종도 해제한 뒤 등록함', () => {
    const { result } = renderHook(() =>
      useSignal(null, {
        experimentMode: 'DUAL_2PC',
        groupId: GROUP_ID,
      })
    );

    act(() => {
      result.current.joinDualRoom();
    });
    act(() => {
      result.current.joinDualRoom();
    });

    for (const event of [
      'dual-session-ready',
      'dual-session-failed',
      'stimulus_start',
      'aligned_pair',
    ]) {
      const registered = handlersFor(event);
      expect(registered).toHaveLength(2);
      // 재등록 전에 첫 핸들러가 해제됐어야 함
      expect(offHandlersFor(event)).toEqual([registered[0]]);
    }
  });

  it('합류만으로는 측정 중 상태로 전이하지 않음', () => {
    // dual-session-ready 수신 전까지 isMeasuring 은 false 여야 함.
    // 시작 API 가 실패해도 화면이 측정 중으로 보이면 안 됨
    const { result } = renderHook(() =>
      useSignal(null, {
        experimentMode: 'DUAL_2PC',
        groupId: GROUP_ID,
      })
    );

    act(() => {
      result.current.joinDualRoom();
    });

    expect(result.current.isMeasuring).toBe(false);
  });
});

describe('useSignal — DUAL_2PC 서버 이벤트 상태 전이 검증함', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listeners.clear();
  });

  it('dual-session-ready 수신 시에만 측정 중 상태로 전이함', () => {
    const setDualSessionState = vi.fn();
    const { result } = renderHook(() =>
      useSignal(null, {
        experimentMode: 'DUAL_2PC',
        groupId: GROUP_ID,
        setDualSessionState,
      })
    );

    act(() => {
      result.current.joinDualRoom();
    });
    expect(result.current.isMeasuring).toBe(false);

    act(() => {
      emitFromServer('dual-session-ready', {
        groupId: GROUP_ID,
        timestamp_ms: Date.now(),
      });
    });

    expect(result.current.isMeasuring).toBe(true);
    expect(setDualSessionState).toHaveBeenLastCalledWith('measuring');
  });

  it('dual-session-failed 수신 시 측정 중 해제하고 aborted 로 전이함', () => {
    const setDualSessionState = vi.fn();
    const { result } = renderHook(() =>
      useSignal(null, {
        experimentMode: 'DUAL_2PC',
        groupId: GROUP_ID,
        setDualSessionState,
      })
    );

    act(() => {
      result.current.joinDualRoom();
    });
    act(() => {
      emitFromServer('dual-session-ready', {
        groupId: GROUP_ID,
        timestamp_ms: Date.now(),
      });
    });
    expect(result.current.isMeasuring).toBe(true);

    act(() => {
      emitFromServer('dual-session-failed', {
        groupId: GROUP_ID,
        error: 'engine spawn 실패',
      });
    });

    expect(result.current.isMeasuring).toBe(false);
    expect(setDualSessionState).toHaveBeenLastCalledWith('aborted');
  });

  it('다른 그룹의 이벤트는 상태를 바꾸지 않음', () => {
    const { result } = renderHook(() =>
      useSignal(null, {
        experimentMode: 'DUAL_2PC',
        groupId: GROUP_ID,
      })
    );

    act(() => {
      result.current.joinDualRoom();
    });
    act(() => {
      emitFromServer('dual-session-ready', {
        groupId: 'other-group',
        timestamp_ms: Date.now(),
      });
    });

    expect(result.current.isMeasuring).toBe(false);
  });
});

describe('useSignal — startMeasurement 재시도 시 완료 핸들러 중복 방지함', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listeners.clear();
  });

  it('재시도 후 완료 이벤트 1건이 상태 전이를 한 번만 만듦', async () => {
    const setDualSessionState = vi.fn();
    const { result } = renderHook(() =>
      useSignal('sess-1', {
        experimentMode: 'DUAL_2PC',
        groupId: GROUP_ID,
        setDualSessionState,
      })
    );

    await act(async () => {
      await result.current.startMeasurement();
    });
    // 시작 실패 후 재시도 상황 재현함 — dual-session-ready 미수신이라
    // isMeasuring 이 false 로 남아 재호출이 가드에 안 걸림
    await act(async () => {
      await result.current.startMeasurement();
    });

    act(() => {
      emitFromServer('measurement-complete', { groupId: GROUP_ID });
    });

    // 완료 이벤트 1건은 completed 전이를 정확히 1회만 만들어야 함
    const completedCalls = setDualSessionState.mock.calls.filter(
      (call) => call[0] === 'completed'
    );
    expect(completedCalls).toHaveLength(1);
    expect(result.current.isMeasuring).toBe(false);
  });
});
