/**
 * FE-3: useDualSession 훅 상태 전이 단위 테스트 수행함
 *
 * v3 N-5 렌즈 반영 검증:
 *   - dual-session-ready 이벤트 수신 시에만 'measuring' 전이 허용
 *   - startMeasurement 202 Accepted 수신 직후 setIsMeasuring(true) 금지
 *     → use-dual-session 훅은 setDualSessionState 콜백에 의존하므로
 *       external setDualSessionState('joining') 호출 후 이벤트 수신 시 'measuring' 전이 검증함
 *
 * 상태 전이 검증 범위:
 *   invited → joining (외부 setDualSessionState 호출)
 *   joining → measuring (dual-session-ready 이벤트)
 *   measuring → aborted (dual-session-failed 이벤트)
 *   measuring → completed (measurement-complete 이벤트)
 *
 * Phase 17.6 추가 범위 (T-FE-1/2/4):
 *   registry-status polling ready=false→true 전환 시 partnerConnected 갱신
 *   polling stuck 10초 지속 시 showFallback=true 전환
 *   DUAL_2PC 아닌 모드에서 polling 비활성 검증
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDualSession } from './use-dual-session';

// socket-client 모킹 처리함
const mockSocketOn = vi.fn();
const mockSocketOff = vi.fn();
const mockSocket = {
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

// dual-trigger API 모킹 처리함 (폴링 격리 목적)
vi.mock('@/07-shared/api/dual-trigger', () => ({
  fetchRegistryStatus: vi.fn().mockResolvedValue({
    ready: false,
    registered: 0,
    attempts: 0,
    inFlight: false,
  }),
}));

import { fetchRegistryStatus } from '@/07-shared/api/dual-trigger';

/**
 * 등록된 소켓 이벤트 핸들러를 이름으로 추출하는 헬퍼 정의함
 */
function getHandler(eventName: string): ((payload: unknown) => void) | null {
  const calls = mockSocketOn.mock.calls as Array<
    [string, (payload: unknown) => void]
  >;
  const found = calls.find((call) => call[0] === eventName);
  return found ? found[1] : null;
}

describe('useDualSession — DUAL_2PC 세션 상태 전이 테스트 수행함', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('초기 상태가 invited이고 partnerConnected가 false 처리됨', () => {
    const { result } = renderHook(() =>
      useDualSession('group-123', 'DUAL_2PC')
    );

    expect(result.current.state).toBe('invited');
    expect(result.current.partnerConnected).toBe(false);
  });

  it('DUAL_2PC 모드 + groupId 존재 시 소켓 이벤트 리스너 3건 등록 처리됨', () => {
    renderHook(() => useDualSession('group-abc', 'DUAL_2PC'));

    const eventNames = (
      mockSocketOn.mock.calls as Array<[string, unknown]>
    ).map((call) => call[0]);
    expect(eventNames).toContain('dual-session-ready');
    expect(eventNames).toContain('dual-session-failed');
    expect(eventNames).toContain('measurement-complete');
  });

  it('groupId가 null이면 소켓 이벤트 리스너 미등록 처리됨', () => {
    renderHook(() => useDualSession(null, 'DUAL_2PC'));

    expect(mockSocketOn).not.toHaveBeenCalled();
  });

  it('experimentMode가 DUAL_2PC 아니면 소켓 이벤트 리스너 미등록 처리됨', () => {
    renderHook(() => useDualSession('group-abc', 'SEQUENTIAL'));

    expect(mockSocketOn).not.toHaveBeenCalled();
  });

  it('setDualSessionState 호출로 invited → joining 상태 전이 처리됨', () => {
    const { result } = renderHook(() =>
      useDualSession('group-abc', 'DUAL_2PC')
    );

    act(() => {
      result.current.setDualSessionState('joining');
    });

    expect(result.current.state).toBe('joining');
  });

  it('dual-session-ready 수신 시 state=measuring 전이 처리됨 (Phase 17.6: partnerConnected는 polling 담당)', () => {
    const { result } = renderHook(() =>
      useDualSession('group-abc', 'DUAL_2PC')
    );

    // v3 N-5: 202 Accepted 직후 측정 시작 금지 — dual-session-ready 수신 시에만 전이 허용
    // Phase 17.6: partnerConnected 설정은 registry-status polling이 담당함
    // joining 상태에서 ready 이벤트 수신 시 measuring 전이 검증함
    act(() => {
      result.current.setDualSessionState('joining');
    });

    const readyHandler = getHandler('dual-session-ready');
    expect(readyHandler).not.toBeNull();

    act(() => {
      readyHandler!({ groupId: 'group-abc', timestamp_ms: Date.now() });
    });

    expect(result.current.state).toBe('measuring');
    // partnerConnected는 registry-status polling ready=true 수신 시 전환됨
    // 소켓 이벤트만으로는 변경되지 않음 — polling mock이 ready=false 반환하므로 false 유지
    expect(result.current.partnerConnected).toBe(false);
  });

  it('dual-session-ready 수신 시 다른 groupId이면 상태 미전이 처리됨', () => {
    const { result } = renderHook(() =>
      useDualSession('group-abc', 'DUAL_2PC')
    );

    const readyHandler = getHandler('dual-session-ready');
    expect(readyHandler).not.toBeNull();

    act(() => {
      readyHandler!({ groupId: 'group-OTHER', timestamp_ms: Date.now() });
    });

    // 다른 그룹 이벤트 무시 → 초기 상태 유지
    expect(result.current.state).toBe('invited');
    expect(result.current.partnerConnected).toBe(false);
  });

  it('dual-session-failed 수신 시 state=aborted 전이 처리됨', () => {
    const { result } = renderHook(() =>
      useDualSession('group-abc', 'DUAL_2PC')
    );

    // ready 상태로 선 전이함
    const readyHandler = getHandler('dual-session-ready');
    act(() => {
      readyHandler!({ groupId: 'group-abc', timestamp_ms: Date.now() });
    });

    const failedHandler = getHandler('dual-session-failed');
    expect(failedHandler).not.toBeNull();

    act(() => {
      failedHandler!({ groupId: 'group-abc', error: 'timeout' });
    });

    expect(result.current.state).toBe('aborted');
    expect(result.current.partnerConnected).toBe(false);
  });

  it('measurement-complete 수신 시 state=completed 전이 처리됨', () => {
    const { result } = renderHook(() =>
      useDualSession('group-abc', 'DUAL_2PC')
    );

    // measuring 상태로 선 전이함
    const readyHandler = getHandler('dual-session-ready');
    act(() => {
      readyHandler!({ groupId: 'group-abc', timestamp_ms: Date.now() });
    });

    const completeHandler = getHandler('measurement-complete');
    expect(completeHandler).not.toBeNull();

    act(() => {
      completeHandler!({ groupId: 'group-abc' });
    });

    expect(result.current.state).toBe('completed');
  });

  it('언마운트 시 소켓 이벤트 리스너 3건 해제 처리됨', () => {
    const { unmount } = renderHook(() =>
      useDualSession('group-abc', 'DUAL_2PC')
    );

    unmount();

    const offEventNames = (
      mockSocketOff.mock.calls as Array<[string, unknown]>
    ).map((call) => call[0]);
    expect(offEventNames).toContain('dual-session-ready');
    expect(offEventNames).toContain('dual-session-failed');
    expect(offEventNames).toContain('measurement-complete');
  });
});

/**
 * Phase 17.6 polling 테스트 수행함
 *
 * T-FE-1: registry-status ready=false→true 전환 시 partnerConnected 갱신 검증함
 * T-FE-2: ready=false 10초 이상 지속 시 showFallback=true 전환 검증함
 * T-FE-4: DUAL_2PC 아닌 모드에서 polling 비활성 검증함
 */
describe('useDualSession — Phase 17.6 polling 상태 전이 테스트 수행함', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('T-FE-1: polling ready false→true 전환 시 partnerConnected true 갱신 처리됨', async () => {
    // 순서대로 다른 응답을 반환하는 mock 구성함
    const fetchMock = vi.mocked(fetchRegistryStatus);
    fetchMock
      .mockResolvedValueOnce({
        ready: false,
        registered: 0,
        attempts: 0,
        inFlight: true,
      })
      .mockResolvedValueOnce({
        ready: false,
        registered: 1,
        attempts: 1,
        inFlight: true,
      })
      .mockResolvedValue({
        ready: true,
        registered: 2,
        attempts: 1,
        inFlight: false,
      });

    const { result } = renderHook(() => useDualSession('grp-1', 'DUAL_2PC'));

    // 초기 상태 확인함
    expect(result.current.partnerConnected).toBe(false);

    // 1초 인터벌 3회 tick 처리함 — 3번째 tick에서 ready=true 수신 후 partnerConnected 갱신 유도함
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    // ready=true 수신 후 partnerConnected true 전환 확인함
    expect(result.current.partnerConnected).toBe(true);
  });

  it('T-FE-2: polling ready=false 10초 지속 시 showFallback true 전환 처리됨', async () => {
    // 항상 stuck 상태(inFlight=false + ready=false) 반환하는 mock 구성함
    vi.mocked(fetchRegistryStatus).mockResolvedValue({
      ready: false,
      registered: 0,
      attempts: 0,
      inFlight: false,
    });

    const { result } = renderHook(() => useDualSession('grp-1', 'DUAL_2PC'));

    // 초기 showFallback false 확인함
    expect(result.current.showFallback).toBe(false);

    // 1초 인터벌 11회 tick 진행 처리함 — 10초 초과 후 showFallback 전환 유도함
    for (let i = 0; i < 11; i++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
    }

    // 10초 이상 stuck 지속 시 showFallback true 전환 확인함
    expect(result.current.showFallback).toBe(true);
  });

  it('T-FE-4: DUAL_2PC 모드 아니면 registry-status polling 비활성 처리됨', async () => {
    const fetchMock = vi.mocked(fetchRegistryStatus);
    // mock 초기화하여 호출 여부를 정확히 감지함
    fetchMock.mockClear();

    renderHook(() => useDualSession('grp-1', 'DUAL'));

    // 3.5초 경과해도 폴링이 발생하지 않아야 함
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3500);
    });

    // DUAL 모드에서는 registry-status 호출 없음 확인함
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
