/**
 * useSignal — DUAL_2PC 룸 재합류 시 리스너 누적 방지 검증함
 *
 * 배경: 측정 시작이 실패하면 사용자가 다시 시작할 수 있다. 그때 joinDualRoom 이
 * 다시 불리는데, 이전 핸들러를 해제하지 않으면 완료 이벤트 1건이 여러 핸들러에서
 * 처리된다. CodeRabbit PR #66 지적분.
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

const mockSocketOn = vi.fn();
const mockSocketOff = vi.fn();
const mockSocketEmit = vi.fn();
const mockSocket = {
  on: mockSocketOn,
  off: mockSocketOff,
  emit: mockSocketEmit,
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
