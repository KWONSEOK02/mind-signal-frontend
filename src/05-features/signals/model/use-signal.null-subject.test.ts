/**
 * Bug D — subjectIndex null causes captureAndSend to silently no-op
 *
 * use-signal.ts line 20:
 *   if (!groupId || subjectIndex === null) return null;
 *
 * When subjectIndex is null, getCorrelationId() returns null.
 * captureAndSend() checks for this (line 29):
 *   if (!correlationId) return;
 *
 * The hook then returns early without sending anything.
 * The UI may still show isMeasuring=true and the interval ticks every second,
 * but signalApi.sendSignal is never called — data is silently dropped.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useSignal from './use-signal';

// Mock the signal API module so no real HTTP requests are made
vi.mock('@/07-shared/api', () => ({
  signalApi: {
    sendSignal: vi.fn().mockResolvedValue({}),
  },
  // EmotivMetrics is only a type, no runtime value needed
}));

// Import after mocking so we get the mocked version
import { signalApi } from '@/07-shared/api';

describe('Bug D: captureAndSend silently no-ops when subjectIndex is null', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('CONFIRMS BUG: sendSignal is never called when subjectIndex is null', async () => {
    const { result } = renderHook(() => useSignal('group-abc', null));

    act(() => {
      result.current.startMeasurement();
    });

    // Advance 3 seconds — three interval ticks should have fired
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    // Despite the interval running, sendSignal must never have been called
    expect(signalApi.sendSignal).not.toHaveBeenCalled();
  });

  it('CONFIRMS BUG: isMeasuring becomes true even though no data is sent', async () => {
    const { result } = renderHook(() => useSignal('group-abc', null));

    act(() => {
      result.current.startMeasurement();
    });

    // The hook sets isMeasuring=true (misleading to the user)
    expect(result.current.isMeasuring).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    // Still no data sent
    expect(signalApi.sendSignal).not.toHaveBeenCalled();
  });

  it('CONFIRMS BUG: currentMetrics stays null — confirming nothing was captured', async () => {
    const { result } = renderHook(() => useSignal('group-abc', null));

    act(() => {
      result.current.startMeasurement();
    });

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.currentMetrics).toBeNull();
    expect(result.current.lastSentTime).toBeNull();
  });

  it('sendSignal IS called when both groupId and subjectIndex are valid', async () => {
    const { result } = renderHook(() => useSignal('group-abc', 0));

    act(() => {
      result.current.startMeasurement();
    });

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(signalApi.sendSignal).toHaveBeenCalledTimes(1);
    expect(signalApi.sendSignal).toHaveBeenCalledWith(
      'group-abc_0',
      expect.objectContaining({
        engagement: expect.any(Number),
        focus: expect.any(Number),
      }),
    );
  });

  it('sendSignal is also NOT called when groupId is null', async () => {
    const { result } = renderHook(() => useSignal(null, 0));

    act(() => {
      result.current.startMeasurement();
    });

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(signalApi.sendSignal).not.toHaveBeenCalled();
  });

  it('documents the required fix', () => {
    /**
     * The root cause is that subjectIndex can be null when the session
     * pairing has not yet assigned a subject index. Two possible fixes:
     *
     * Option 1 — Guard at the call site (use-signal.ts):
     *   Do not call startMeasurement() until subjectIndex is a valid number.
     *   Disable the "Start" button while subjectIndex === null.
     *
     * Option 2 — Guard in the hook (use-signal.ts):
     *   Inside startMeasurement(), check getCorrelationId() first and throw
     *   or return false so the caller knows the measurement did not start.
     *     if (!getCorrelationId()) return false;
     *     setIsMeasuring(true);
     *     ...
     *
     * Either way, isMeasuring must NOT be set to true when data cannot be sent.
     */
    expect(true).toBe(true);
  });
});
