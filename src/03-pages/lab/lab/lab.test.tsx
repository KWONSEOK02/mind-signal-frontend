import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import LabPage from './lab-page';

/**
 * usePairing 훅 모의 처리함
 */
vi.mock('@/05-features/sessions', () => ({
  usePairing: () => ({
    pairingCode: 'TEST-CODE',
    timeLeft: 300,
    startPairing: vi.fn(),
  }),
  QRGenerator: ({ value, timeLeft }: { value: string; timeLeft: number }) => (
    <div data-testid="qr-generator">
      {value}-{timeLeft}
    </div>
  ),
}));

// ... 나머지 모킹 로직 동일함

describe('LabPage 통합 기능 테스트 수행함', () => {
  it('세션 생성 버튼 클릭 시 필수 프롭이 포함된 QRGenerator가 노출되어야 함', () => {
    render(<LabPage />);

    const button = screen.getByText(/세션 생성/i);
    fireEvent.click(button);

    const qr = screen.getByTestId('qr-generator');
    expect(qr).toBeDefined();
    // 모의 데이터(300초) 전달 확인 수행함
    expect(qr.textContent).toContain('300');
  });
});
