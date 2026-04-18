import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UIProvider } from '@/app/providers/ui-context';
import SequentialFlow from './sequential-flow';

/**
 * useSequentialMeasurement 훅 모킹 수행함
 */
const mockStartSubject = vi.fn();
const mockStopCurrentSubject = vi.fn();
const mockTriggerAnalysis = vi.fn();
const mockAbort = vi.fn();

let mockState = 'READY';

vi.mock('@/05-features/signals/model/use-sequential-measurement', () => ({
  useSequentialMeasurement: vi.fn(() => ({
    state: mockState,
    startSubject: mockStartSubject,
    stopCurrentSubject: mockStopCurrentSubject,
    triggerAnalysis: mockTriggerAnalysis,
    abort: mockAbort,
    subject1Metrics: null,
    subject2Metrics: null,
    subject1ElapsedSeconds: 0,
    subject2ElapsedSeconds: 0,
  })),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

/**
 * [Page] SequentialFlow 컴포넌트 단위 테스트 수행함
 */
describe('SequentialFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState = 'READY';
  });

  const renderWithProvider = (props = {}) =>
    render(
      <UIProvider>
        <SequentialFlow
          sessionId1="session-1"
          sessionId2="session-2"
          groupId="group-1"
          {...props}
        />
      </UIProvider>
    );

  it('초기 렌더링 시 Step 1 강조 표시 및 Start Subject 1 버튼 활성화 처리됨', () => {
    renderWithProvider();
    // Subject 1 단계 레이블 확인함 (여러 곳에 표시될 수 있음)
    const subjectLabels = screen.getAllByText(/Subject 1/i);
    expect(subjectLabels.length).toBeGreaterThan(0);
    // Start Subject 1 버튼 활성화 확인함
    const btn = screen.getByRole('button', { name: /Start Subject 1/i });
    expect(btn).toBeDefined();
    expect((btn as HTMLButtonElement).disabled).toBe(false);
  });

  it('초기 렌더링 시 Start Subject 2 버튼 비활성화 처리됨', () => {
    renderWithProvider();
    const btn = screen.queryByRole('button', { name: /Start Subject 2/i });
    // READY 상태에서 Subject 2 버튼은 없거나 비활성이어야 함
    if (btn) {
      expect((btn as HTMLButtonElement).disabled).toBe(true);
    }
  });

  it('Start Subject 1 클릭 시 startSubject(1) 호출 처리됨', () => {
    renderWithProvider();
    const btn = screen.getByRole('button', { name: /Start Subject 1/i });
    fireEvent.click(btn);
    expect(mockStartSubject).toHaveBeenCalledWith(1);
  });

  it('Abort 버튼 클릭 시 abort() 호출 처리됨', () => {
    renderWithProvider();
    const btn = screen.getByRole('button', { name: /abort|중단/i });
    fireEvent.click(btn);
    expect(mockAbort).toHaveBeenCalledOnce();
  });

  it('SUBJECT_1_DONE 상태에서 Start Subject 2 버튼 활성화 처리됨', () => {
    mockState = 'SUBJECT_1_DONE';
    renderWithProvider();
    const btn = screen.getByRole('button', { name: /Start Subject 2/i });
    expect((btn as HTMLButtonElement).disabled).toBe(false);
  });

  it('SUBJECT_2_DONE 상태에서 Analyze 버튼 활성화 처리됨', () => {
    mockState = 'SUBJECT_2_DONE';
    renderWithProvider();
    const btn = screen.getByRole('button', { name: /Analyze|분석/i });
    expect((btn as HTMLButtonElement).disabled).toBe(false);
  });

  it('SUBJECT_2_MEASURING 상태에서 Stop 버튼 활성화 처리됨', () => {
    mockState = 'SUBJECT_2_MEASURING';
    renderWithProvider();
    const btn = screen.getByRole('button', { name: /stop|중지/i });
    expect(btn).toBeDefined();
  });
});
