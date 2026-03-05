import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePairing } from '@/05-features/sessions';
import { SESSION_STATUS } from '@/07-shared'; // 통합 상수 임포트 수행함
import JoinPage from './join-page';

/**
 * [Feature] 개편된 상수 기반 페어링 훅 모의 처리 수행함
 */
vi.mock('@/05-features/sessions', () => ({
  usePairing: vi.fn(() => ({
    status: SESSION_STATUS.IDLE, // 상수를 사용하여 초기 상태 정의함
    pairingCode: 'TEST-CODE',
    groupId: 'group-123',
    subjectIndex: 1,
    role: 'SUBJECT',
    pairedSubjects: [], // 신규 필드 모킹 추가함
    isAllPaired: false,
    requestPairing: vi.fn().mockResolvedValue({ success: true }),
    resetStatus: vi.fn(),
  })),
  QRScanner: ({ onScanSuccess }: { onScanSuccess: (code: string) => void }) => (
    <div data-testid="qr-scanner">
      <button
        onClick={() =>
          onScanSuccess('http://example.com/join?token=MOCK-QR-CODE')
        }
      >
        Scan Success
      </button>
    </div>
  ),
}));

/**
 * [Feature] 신호 처리 훅 모의 처리 수행함
 */
vi.mock('@/05-features/signals', () => ({
  useSignal: (groupId: string | null, index: number | null) => {
    const isValidSubject = groupId !== null && index !== null;
    return {
      isMeasuring: false,
      lastSentTime: isValidSubject ? new Date().toISOString() : null,
      startMeasurement: vi.fn(),
      stopMeasurement: vi.fn(),
    };
  },
  SignalMeasurer: () => <div data-testid="signal-measurer" />,
}));

/**
 * [Shared] 라우팅 및 유틸리티 모의 처리 수행함
 */
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  useSearchParams: () => ({ get: vi.fn().mockReturnValue(null) }),
}));

vi.mock('@/07-shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/07-shared')>();
  return {
    ...actual,
    extractToken: vi.fn((code: string) => code.split('token=')[1] || code),
  };
});

describe('JoinPage 그룹 매핑 기반 UI 테스트 수행함', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('페이지 제목과 실험 합류 안내 문구가 정상적으로 렌더링되어야 함', () => {
    render(<JoinPage />);
    expect(
      screen.getByRole('heading', { name: /Join Experiment/i })
    ).toBeDefined();
    expect(screen.getByText(/운영자 대시보드에 표시된 QR 코드/i)).toBeDefined();
  });

  it('초기 진입 시 실험 합류 버튼이 노출되어야 함', () => {
    render(<JoinPage />);
    expect(screen.getByText(/실험 합류하기/i)).toBeDefined();
  });

  it('합류 버튼 클릭 시 QR 스캐너가 화면에 노출되어야 함', () => {
    render(<JoinPage />);
    const joinButton = screen.getByText(/실험 합류하기/i);
    fireEvent.click(joinButton);
    expect(screen.getByTestId('qr-scanner')).toBeDefined();
  });

  it('동일한 QR 코드를 여러 번 스캔해도 requestPairing은 한 번만 호출되어야 함', async () => {
    const mockRequestPairing = vi.fn().mockResolvedValue({ success: true });
    vi.mocked(usePairing).mockReturnValue({
      status: SESSION_STATUS.IDLE,
      subjectIndex: null,
      groupId: null,
      pairingCode: null,
      role: null,
      timeLeft: 300,
      pairedSubjects: [],
      isAllPaired: false,
      startPairing: vi.fn(),
      requestPairing: mockRequestPairing,
      resetStatus: vi.fn(),
    });

    render(<JoinPage />);
    fireEvent.click(screen.getByText(/실험 합류하기/i));

    const scanButton = screen.getByText(/Scan Success/i);
    fireEvent.click(scanButton);
    fireEvent.click(scanButton); // 두 번째 클릭 (무시되어야 함)

    await waitFor(() => {
      expect(mockRequestPairing).toHaveBeenCalledTimes(1);
      expect(mockRequestPairing).toHaveBeenCalledWith('MOCK-QR-CODE');
    });
  });

  it('페어링 만료 상태일 때 에러 문구가 정상적으로 표시되어야 함', () => {
    vi.mocked(usePairing).mockReturnValue({
      status: SESSION_STATUS.EXPIRED,
      subjectIndex: null,
      groupId: null,
      pairingCode: null,
      role: null,
      timeLeft: 300,
      pairedSubjects: [],
      isAllPaired: false,
      startPairing: vi.fn(),
      requestPairing: vi.fn(),
      resetStatus: vi.fn(),
    });

    render(<JoinPage />);
    expect(
      screen.getByText(/세션이 만료되었거나 유효하지 않은 실험 정보임/i)
    ).toBeDefined();
  });

  it('페어링 완료 상태일 때 피실험자 번호(SUBJECT 01)가 표시되어야 함', () => {
    // PAIRED 상태를 상수로 모사하여 검증 수행함
    vi.mocked(usePairing).mockReturnValue({
      status: SESSION_STATUS.PAIRED,
      subjectIndex: 1,
      groupId: 'group-123',
      pairingCode: null,
      role: 'SUBJECT',
      timeLeft: 300,
      pairedSubjects: [1],
      isAllPaired: false,
      startPairing: vi.fn(),
      requestPairing: vi.fn(),
      resetStatus: vi.fn(),
    });

    render(<JoinPage />);
    expect(screen.getByText(/SUBJECT/i)).toBeDefined();
    expect(screen.getByText(/01/i)).toBeDefined();
  });
});
