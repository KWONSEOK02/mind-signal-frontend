import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SESSION_STATUS } from '@/07-shared'; // 통합 경로에서 상수 임포트함
import LabPage from './lab-page';

/**
 * [Feature] 순차적 페어링 로직이 반영된 세션 훅 모의 처리 수행함
 */
vi.mock('@/05-features/sessions', () => ({
  usePairing: () => ({
    status: SESSION_STATUS.IDLE, // 상수를 사용하여 상태 정의함
    pairingCode: 'TEST-GROUP-123',
    groupId: 'group-abc',
    timeLeft: 300,
    pairedSubjects: [], // 초기 접속 인원 없음으로 설정함
    isAllPaired: false,
    startPairing: vi.fn(),
    resetStatus: vi.fn(),
  }),
  QRGenerator: ({ value, timeLeft }: { value: string; timeLeft: number }) => (
    <div data-testid="qr-generator">
      {value}-{timeLeft}
    </div>
  ),
}));

/**
 * [Feature] 신호 처리 훅 모의 처리 수행함
 */
vi.mock('@/05-features/signals', () => ({
  useSignal: (groupId: string | null, index: number) => {
    const hasData = groupId !== null && index > 0;
    return {
      currentMetrics: hasData ? { focus: 50 + index, relax: 30 } : null,
      isMeasuring: false,
      startMeasurement: vi.fn(),
      stopMeasurement: vi.fn(),
    };
  },
  SignalMeasurer: () => <div data-testid="signal-measurer" />,
}));

/**
 * [Widget] 신호 비교 위젯 모의 처리 수행함
 */
vi.mock('@/04-widgets', () => ({
  SignalComparisonWidget: () => <div data-testid="comparison-widget" />,
}));

describe('LabPage 개편된 상수 기반 통합 테스트 수행함', () => {
  it('운영자 대시보드 타이틀이 설정값에 따라 정상 렌더링되어야 함', () => {
    render(<LabPage />);
    // EXPERIMENT_CONFIG.DUAL의 타이틀인 "Dual Subject Monitor" 확인 수행함
    expect(
      screen.getByRole('heading', { name: /DUAL SUBJECT MONITOR/i })
    ).toBeDefined();
  });

  it('첫 번째 피실험자 연결을 위한 버튼 문구가 표시되어야 함', () => {
    render(<LabPage />);
    // 순차적 페어링 단계에 따른 버튼 텍스트 확인함
    expect(screen.getByText(/Subject 01 연결 QR 생성/i)).toBeDefined();
  });

  it('QR 생성 버튼 클릭 시 실험실 안내 메시지와 QRGenerator가 노출되어야 함', () => {
    render(<LabPage />);
    const button = screen.getByText(/Subject 01 연결 QR 생성/i);
    fireEvent.click(button);

    // STEP 1 안내 문구 및 QR 구성 요소 확인함
    expect(screen.getByText(/STEP 1: SUBJECT 01 WAITING/i)).toBeDefined();
    expect(screen.getByTestId('qr-generator')).toBeDefined();
  });

  it('모든 피실험자 합류 전에는 대조 위젯이 대기 상태여야 함', () => {
    render(<LabPage />);
    const widget = screen.getByTestId('comparison-widget');
    expect(widget).toBeDefined();
  });
});
