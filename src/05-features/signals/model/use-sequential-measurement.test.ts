import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSequentialMeasurement } from './use-sequential-measurement';
import { analysisApi } from '@/07-shared/api/analysis';

/**
 * use-signal 훅 및 analysis API 모킹 수행함
 */
vi.mock('./use-signal', () => ({
  default: vi.fn(() => ({
    isMeasuring: false,
    currentMetrics: null,
    lastReceivedTime: null,
    elapsedSeconds: 0,
    startMeasurement: vi.fn(),
    stopMeasurement: vi.fn(),
  })),
}));

vi.mock('@/07-shared/api/analysis', () => ({
  analysisApi: {
    postSequentialAnalysis: vi.fn().mockResolvedValue({
      success: true,
      result: { analysis_mode: 'SEQUENTIAL', similarity_features: {} },
    }),
  },
}));

/**
 * [Feature] useSequentialMeasurement 상태 머신 단위 테스트 수행함
 */
describe('useSequentialMeasurement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('초기 상태가 READY임을 확인 처리됨', () => {
    const { result } = renderHook(() =>
      useSequentialMeasurement('session-1', 'session-2', 'group-1')
    );
    expect(result.current.state).toBe('READY');
  });

  it('READY에서 startSubject(1) 호출 시 SUBJECT_1_MEASURING으로 전환 처리됨', async () => {
    const { result } = renderHook(() =>
      useSequentialMeasurement('session-1', 'session-2', 'group-1')
    );

    await act(async () => {
      result.current.startSubject(1);
    });

    expect(result.current.state).toBe('SUBJECT_1_MEASURING');
  });

  it('SUBJECT_1_MEASURING에서 startSubject(1) 재호출 거부 처리됨', async () => {
    const { result } = renderHook(() =>
      useSequentialMeasurement('session-1', 'session-2', 'group-1')
    );

    await act(async () => {
      result.current.startSubject(1);
    });

    const stateBefore = result.current.state;
    await act(async () => {
      result.current.startSubject(1);
    });

    // 상태 변경 없음 확인함
    expect(result.current.state).toBe(stateBefore);
  });

  it('SUBJECT_1_MEASURING에서 stopCurrentSubject() 호출 시 SUBJECT_1_DONE으로 전환 처리됨', async () => {
    const { result } = renderHook(() =>
      useSequentialMeasurement('session-1', 'session-2', 'group-1')
    );

    await act(async () => {
      result.current.startSubject(1);
    });

    await act(async () => {
      result.current.stopCurrentSubject();
    });

    expect(result.current.state).toBe('SUBJECT_1_DONE');
  });

  it('SUBJECT_1_DONE에서 startSubject(2) 호출 시 SUBJECT_2_MEASURING으로 전환 처리됨', async () => {
    const { result } = renderHook(() =>
      useSequentialMeasurement('session-1', 'session-2', 'group-1')
    );

    await act(async () => {
      result.current.startSubject(1);
    });
    await act(async () => {
      result.current.stopCurrentSubject();
    });
    await act(async () => {
      result.current.startSubject(2);
    });

    expect(result.current.state).toBe('SUBJECT_2_MEASURING');
  });

  it('SUBJECT_2_MEASURING에서 stopCurrentSubject() 호출 시 SUBJECT_2_DONE으로 전환 처리됨', async () => {
    const { result } = renderHook(() =>
      useSequentialMeasurement('session-1', 'session-2', 'group-1')
    );

    await act(async () => {
      result.current.startSubject(1);
    });
    await act(async () => {
      result.current.stopCurrentSubject();
    });
    await act(async () => {
      result.current.startSubject(2);
    });
    await act(async () => {
      result.current.stopCurrentSubject();
    });

    expect(result.current.state).toBe('SUBJECT_2_DONE');
  });

  it('SUBJECT_2_DONE에서 triggerAnalysis() 호출 시 ANALYZING 거쳐 COMPLETED로 전환 처리됨', async () => {
    const { result } = renderHook(() =>
      useSequentialMeasurement('session-1', 'session-2', 'group-1')
    );

    await act(async () => {
      result.current.startSubject(1);
    });
    await act(async () => {
      result.current.stopCurrentSubject();
    });
    await act(async () => {
      result.current.startSubject(2);
    });
    await act(async () => {
      result.current.stopCurrentSubject();
    });
    await act(async () => {
      await result.current.triggerAnalysis();
    });

    expect(result.current.state).toBe('COMPLETED');
  });

  it('임의 상태에서 abort() 호출 시 SESSION_ABORTED로 전환 처리됨', async () => {
    const { result } = renderHook(() =>
      useSequentialMeasurement('session-1', 'session-2', 'group-1')
    );

    await act(async () => {
      result.current.startSubject(1);
    });
    await act(async () => {
      result.current.abort();
    });

    expect(result.current.state).toBe('SESSION_ABORTED');
  });

  it('READY에서 abort() 호출 시 SESSION_ABORTED로 전환 처리됨', async () => {
    const { result } = renderHook(() =>
      useSequentialMeasurement('session-1', 'session-2', 'group-1')
    );

    await act(async () => {
      result.current.abort();
    });

    expect(result.current.state).toBe('SESSION_ABORTED');
  });

  it('SUBJECT_2_MEASURING 상태에서 abort() 호출 시 세션 종료 처리됨', async () => {
    const { result } = renderHook(() =>
      useSequentialMeasurement('session-1', 'session-2', 'group-1')
    );

    await act(async () => {
      result.current.startSubject(1);
    });
    await act(async () => {
      result.current.stopCurrentSubject();
    });
    await act(async () => {
      result.current.startSubject(2);
    });
    await act(async () => {
      result.current.abort();
    });

    expect(result.current.state).toBe('SESSION_ABORTED');
  });

  it('triggerAnalysis가 reject되면 SESSION_ABORTED로 전환 처리됨', async () => {
    vi.mocked(analysisApi.postSequentialAnalysis).mockRejectedValueOnce(
      new Error('network down')
    );

    const { result } = renderHook(() =>
      useSequentialMeasurement('session-1', 'session-2', 'group-1')
    );

    await act(async () => {
      result.current.startSubject(1);
    });
    await act(async () => {
      result.current.stopCurrentSubject();
    });
    await act(async () => {
      result.current.startSubject(2);
    });
    await act(async () => {
      result.current.stopCurrentSubject();
    });
    await act(async () => {
      await result.current.triggerAnalysis();
    });

    expect(result.current.state).toBe('SESSION_ABORTED');
  });

  it('triggerAnalysis가 success:false를 내려주면 SESSION_ABORTED로 전환 처리됨', async () => {
    vi.mocked(analysisApi.postSequentialAnalysis).mockResolvedValueOnce({
      success: false,
      result: { analysis_mode: 'SEQUENTIAL', similarity_features: {} },
    } as unknown as Awaited<
      ReturnType<typeof analysisApi.postSequentialAnalysis>
    >);

    const { result } = renderHook(() =>
      useSequentialMeasurement('session-1', 'session-2', 'group-1')
    );

    await act(async () => {
      result.current.startSubject(1);
    });
    await act(async () => {
      result.current.stopCurrentSubject();
    });
    await act(async () => {
      result.current.startSubject(2);
    });
    await act(async () => {
      result.current.stopCurrentSubject();
    });
    await act(async () => {
      await result.current.triggerAnalysis();
    });

    expect(result.current.state).toBe('SESSION_ABORTED');
  });
});
