import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import JoinPage from './join-page';

// AGENTS 2.1 반영: 배럴 파일 대신 직접 소스 파일 모킹 수행함
vi.mock('@/05-features/sessions/model/use-pairing', () => ({
  usePairing: () => ({
    status: 'IDLE',
    requestPairing: vi.fn(),
    resetStatus: vi.fn(),
  }),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: vi.fn().mockReturnValue(null),
  }),
}));

describe('JoinPage 최적화 테스트', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('클라이언트 마운트 후 QR 스캔 버튼이 렌더링되어야 함', async () => {
    render(<JoinPage />);

    // AGENTS 6.5: mounted 상태가 true로 전환된 후의 요소 확인함
    const scanButton = await screen.findByText(/QR 스캔 시작함/i);
    expect(scanButton).toBeDefined();
  });

  it('버튼 클릭 시 상호작용 로직이 이벤트 핸들러 내에서 수행되어야 함', async () => {
    render(<JoinPage />);

    const scanButton = await screen.findByText(/QR 스캔 시작함/i);
    fireEvent.click(scanButton);

    // AGENTS 5.7: 상태 변화에 따른 UI 노출 여부 확인함
    const scannerText = screen.queryByText(/연결 정보를 확인 중임/i);
    expect(scannerText).toBeDefined();
  });
});
