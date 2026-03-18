/**
 * useSignal 훅 단위 테스트 수행함
 *
 * 마이그레이션 후 동작:
 * - sessionId 기반으로 측정 시작함
 * - HTTP POST 1회 트리거 후 Socket.io eeg-live 이벤트로 데이터 수신함
 * - sessionId가 null이면 측정 시작 불가 처리함
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useSignal from './use-signal';

// measurementApi mock 처리함
vi.mock('@/07-shared/api', () => ({
  measurementApi: {
    startMeasurement: vi
      .fn()
      .mockResolvedValue({ data: { status: 'success' } }),
  },
}));

// socket-client mock 처리함
const mockSocketOn = vi.fn();
const mockSocketOff = vi.fn();
const mockSocket = {
  on: mockSocketOn,
  off: mockSocketOff,
};
vi.mock('@/07-shared/lib/socket-client', () => ({
  getSocket: vi.fn(() => mockSocket),
}));

// config mock 처리함
vi.mock('@/07-shared/config/config', () => ({
  config: {
    api: {
      baseUrl: 'https://test-backend.example.com/api',
      socketUrl: 'https://test-backend.example.com',
    },
  },
}));

import { measurementApi } from '@/07-shared/api';

describe('useSignal — sessionId 기반 측정 제어 테스트 수행함', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sessionId가 null이면 startMeasurement 호출 시 API 미호출 처리함', async () => {
    const { result } = renderHook(() => useSignal(null));

    await act(async () => {
      await result.current.startMeasurement();
    });

    expect(measurementApi.startMeasurement).not.toHaveBeenCalled();
    expect(result.current.isMeasuring).toBe(false);
  });

  it('유효한 sessionId로 startMeasurement 호출 시 API 1회 호출 처리함', async () => {
    const { result } = renderHook(() => useSignal('session-abc-123'));

    await act(async () => {
      await result.current.startMeasurement();
    });

    expect(measurementApi.startMeasurement).toHaveBeenCalledTimes(1);
    expect(measurementApi.startMeasurement).toHaveBeenCalledWith(
      'session-abc-123'
    );
    expect(result.current.isMeasuring).toBe(true);
  });

  it('startMeasurement 성공 후 eeg-live 소켓 리스너 등록 처리함', async () => {
    const { result } = renderHook(() => useSignal('session-abc-123'));

    await act(async () => {
      await result.current.startMeasurement();
    });

    expect(mockSocketOn).toHaveBeenCalledWith('eeg-live', expect.any(Function));
  });

  it('eeg-live 이벤트 수신 시 sessionId 일치하면 currentMetrics 업데이트 처리함', async () => {
    const { result } = renderHook(() => useSignal('session-abc-123'));

    await act(async () => {
      await result.current.startMeasurement();
    });

    // 등록된 핸들러 추출 후 직접 호출하여 수신 시뮬레이션함
    const registeredHandler = mockSocketOn.mock.calls[0][1];
    const mockMetrics = {
      engagement: 0.8,
      interest: 0.7,
      excitement: 0.6,
      stress: 0.3,
      relaxation: 0.5,
      focus: 0.9,
    };

    act(() => {
      registeredHandler({ sessionId: 'session-abc-123', data: mockMetrics });
    });

    expect(result.current.currentMetrics).toEqual(mockMetrics);
    expect(result.current.lastReceivedTime).not.toBeNull();
  });

  it('eeg-live 이벤트 수신 시 sessionId 불일치하면 currentMetrics 미업데이트 처리함', async () => {
    const { result } = renderHook(() => useSignal('session-abc-123'));

    await act(async () => {
      await result.current.startMeasurement();
    });

    const registeredHandler = mockSocketOn.mock.calls[0][1];

    act(() => {
      // 다른 sessionId로 전송된 이벤트 수신 시뮬레이션함
      registeredHandler({
        sessionId: 'session-other-456',
        data: {
          engagement: 0.9,
          interest: 0.9,
          excitement: 0.9,
          stress: 0.9,
          relaxation: 0.9,
          focus: 0.9,
        },
      });
    });

    expect(result.current.currentMetrics).toBeNull();
  });

  it('stopMeasurement 호출 시 isMeasuring false 전환 및 소켓 리스너 해제 처리함', async () => {
    const { result } = renderHook(() => useSignal('session-abc-123'));

    await act(async () => {
      await result.current.startMeasurement();
    });

    act(() => {
      result.current.stopMeasurement();
    });

    expect(result.current.isMeasuring).toBe(false);
    expect(mockSocketOff).toHaveBeenCalledWith(
      'eeg-live',
      expect.any(Function)
    );
  });

  it('이미 측정 중일 때 startMeasurement 재호출 시 API 중복 호출 방지 처리함', async () => {
    const { result } = renderHook(() => useSignal('session-abc-123'));

    await act(async () => {
      await result.current.startMeasurement();
    });

    await act(async () => {
      await result.current.startMeasurement(); // 두 번째 호출
    });

    expect(measurementApi.startMeasurement).toHaveBeenCalledTimes(1);
  });
});
