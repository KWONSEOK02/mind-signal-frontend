import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTapCounter } from './use-tap-counter';
import { useDevModeStore } from './dev-mode.store';

describe('use-tap-counter + dev-mode.store — FM 시나리오', () => {
  beforeEach(() => {
    // 시작점 0 고정으로 재현성 보장함 (vi.useFakeTimers의 now option)
    vi.useFakeTimers({ now: 0 });
    // partial merge로 action 보존 — replace=true 사용 금지함
    useDevModeStore.setState({ isDevModeOn: false });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // FM-1
  it('2초 내 5-tap 도달 시 onReach 호출 + devMode ON 전이함', () => {
    const onReach = vi.fn(() => useDevModeStore.getState().setOn());
    const { result } = renderHook(() => useTapCounter(5, 2000, onReach));

    act(() => {
      for (let i = 0; i < 5; i += 1) {
        result.current.increment();
      }
    });

    expect(onReach).toHaveBeenCalledTimes(1);
    expect(useDevModeStore.getState().isDevModeOn).toBe(true);
  });

  // FM-2
  it('3-tap만 한 경우 onReach 미호출 + devMode OFF 유지함', () => {
    const onReach = vi.fn();
    const { result } = renderHook(() => useTapCounter(5, 2000, onReach));

    act(() => {
      for (let i = 0; i < 3; i += 1) {
        result.current.increment();
      }
    });

    expect(onReach).not.toHaveBeenCalled();
    expect(useDevModeStore.getState().isDevModeOn).toBe(false);
  });

  // FM-3
  it('첫 tap 후 2초 초과 시 counter reset — 5-tap 누적 불성공 확인함', () => {
    const onReach = vi.fn();
    const { result } = renderHook(() => useTapCounter(5, 2000, onReach));

    // t=0: 첫 tap
    act(() => {
      result.current.increment();
    });
    // t=2100ms (window 초과)
    vi.setSystemTime(new Date(2100));
    // 추가 4-tap — 첫 tap reset 후 count=4 (5 미달)
    act(() => {
      for (let i = 0; i < 4; i += 1) {
        result.current.increment();
      }
    });

    expect(onReach).not.toHaveBeenCalled();
  });

  // FM-4 — stamps + windowMs 2000
  it('tap 간격 1100ms × 5회 — 매 두 번째 tap마다 firstTap window(2000ms) 초과 발생 → 누적 5 도달 안 함', () => {
    const onReach = vi.fn();
    const { result } = renderHook(() => useTapCounter(5, 2000, onReach));

    // stamps: [0, 1100, 2200, 3300, 4400] — 각 1100ms 간격
    // t=0:    첫 tap, count=1, firstTap=0
    // t=1100: 1100-0=1100 < 2000 → count=2 (window 내)
    // t=2200: 2200-0=2200 > 2000 → reset, count=1, firstTap=2200
    // t=3300: 3300-2200=1100 < 2000 → count=2 (window 내)
    // t=4400: 4400-2200=2200 > 2000 → reset, count=1, firstTap=4400
    // 결과: 어느 시점에도 count 5 미도달 → onReach 미호출
    const stamps = [0, 1100, 2200, 3300, 4400];
    for (const t of stamps) {
      vi.setSystemTime(new Date(t));
      act(() => {
        result.current.increment();
      });
    }

    expect(onReach).not.toHaveBeenCalled();
  });
});
