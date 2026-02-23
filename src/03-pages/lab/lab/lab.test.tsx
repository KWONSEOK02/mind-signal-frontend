import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LabPage from './lab-page';

// AGENTS 2.1 반영: 직접 소스 경로 참조로 빌드 오버헤드 감소시킴
vi.mock('@/05-features/sessions/model/use-pairing', () => ({
  usePairing: () => ({
    status: 'IDLE',
    startPairing: vi.fn(),
    pairingCode: null,
    timeLeft: 0,
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe('LabPage 성능 가이드라인 리뷰 반영 테스트', () => {
  beforeEach(() => {
    // 반응형 레이아웃 감지용 window 크기 설정함
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 1024,
    });
  });

  it('PC 환경에서 헤더와 시스템 상태가 정상 노출되어야 함', async () => {
    render(<LabPage />);

    // 마운트 대기 후 요소 탐색 수행함
    const title = await screen.findByText(/Mind Signal Lab/i);
    expect(title).toBeDefined();
  });

  it('환경 감지 로직에 의해 모바일 전용 UI로 전환되는지 확인함', async () => {
    // AGENTS 5.8: 파생된 뷰 상태 전환 검증함
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 375 });

    render(<LabPage />);

    const mobileUI = await screen.findByText(/Participant Mode/i);
    expect(mobileUI).toBeDefined();
  });
});
