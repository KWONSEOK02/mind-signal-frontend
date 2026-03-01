import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import JoinPage from './join-page';

/**
 * usePairing 모의 처리함
 */
vi.mock('@/05-features/sessions/model/use-pairing', () => ({
  default: () => ({
    status: 'IDLE',
    pairingCode: 'TEST-CODE',
    timeLeft: 300,
    startPairing: vi.fn(),
    requestPairing: vi.fn(),
    resetStatus: vi.fn(),
  }),
}));

/**
 * next/navigation 모의 처리함
 */
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  useSearchParams: () => ({ get: vi.fn().mockReturnValue(null) }),
}));

describe('JoinPage 최적화 UI 테스트 수행함', () => {
  it('페이지 제목과 참가자 모드 뱃지가 정상적으로 렌더링되어야 함', () => {
    render(<JoinPage />);

    // Exact 매칭 대신 유연한 매칭 사용함
    expect(screen.getByText(/Participant Mode/i)).toBeDefined();
    expect(screen.getByText(/실험 참가자 모드/i)).toBeDefined();
  });

  it('QR 스캔 관련 안내 메시지가 노출되어야 함', () => {
    render(<JoinPage />);
    // 조인 페이지 전용 텍스트 존재 여부 확인함
    expect(
      screen.getByText(/관리자의 화면에 표시된 QR 코드를 스캔/i)
    ).toBeDefined();
  });
});
