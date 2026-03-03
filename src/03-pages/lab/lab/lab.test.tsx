import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { useRouter } from 'next/navigation';
import LabPage from './lab-page';

/**
 * [Feature] Next.js 네비게이션 모킹 처리 수행함
 */
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

describe('LabPage 개편된 상수 기반 통합 테스트 수행함', () => {
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as Mock).mockReturnValue({
      push: mockPush,
    });

    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
  });

  it('운영자 대시보드 타이틀이 설정값에 따라 정상 렌더링되어야 함', () => {
    render(<LabPage />);

    // [Fix] h1 태그 내부에 있는 Subject만 찾도록 범위를 좁힘
    expect(screen.getByText(/Dual/i)).toBeDefined();
    expect(
      screen.getByRole('heading', { level: 1, name: /Dual Subject Monitor/i })
    ).toBeDefined();
    expect(screen.getByText(/Monitor/i)).toBeDefined();
  });

  it('첫 번째 피실험자 연결을 위한 버튼 문구가 표시되어야 함', () => {
    render(<LabPage />);

    // 버튼 내의 텍스트를 명확히 매칭함
    expect(screen.getByText(/Subject 01 연결 QR 생성/i)).toBeDefined();
  });

  it('QR 생성 버튼 클릭 시 실험실 안내 메시지와 QRGenerator가 노출되어야 함', () => {
    render(<LabPage />);

    const qrButton = screen.getByRole('button', {
      name: /Subject 01 연결 QR 생성/i,
    });
    fireEvent.click(qrButton);

    expect(screen.getByText(/STEP 1: SUBJECT 01 WAITING/i)).toBeDefined();
  });

  it('모든 피실험자 합류 전에는 대조 위젯이 대기 상태여야 함', () => {
    render(<LabPage />);

    // 대조 차트 내부의 특정 텍스트 확인함
    expect(screen.getByText(/Awaiting Entry/i)).toBeDefined();
  });
});
