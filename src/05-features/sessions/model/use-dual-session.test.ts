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

  it('dual-session-ready 수신 시 state=measuring, partnerConnected=true 전이 처리됨 (v3 N-5)', () => {
    const { result } = renderHook(() =>
      useDualSession('group-abc', 'DUAL_2PC')
    );

    // v3 N-5: 202 Accepted 직후 측정 시작 금지 — dual-session-ready 수신 시에만 전이 허용
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
    expect(result.current.partnerConnected).toBe(true);
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
