import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { useRouter } from 'next/navigation';
import MobileLabView from './mobile-lab-view';

/**
 * [Feature] Next.js 네비게이션 모킹 처리 수행함
 */
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

describe('MobileLabView 독립 UI 및 인터랙션 테스트 수행함', () => {
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // [Fix] any 대신 Mock 타입을 사용하여 typescript-eslint 경고 해결함
    (useRouter as Mock).mockReturnValue({
      push: mockPush,
    });
  });

  it('참여자 모드 타이틀과 안내 문구가 화면에 표시되어야 함', () => {
    render(<MobileLabView />);

    expect(screen.getByText(/PARTICIPANT MODE/i)).toBeDefined();
    expect(screen.getByText(/모바일 기기를 연동하여/i)).toBeDefined();
    expect(screen.getByText(/실험 데이터를 전송함/i)).toBeDefined();
  });

  it('하단 시스템 인터페이스 명칭이 노출되어야 함', () => {
    render(<MobileLabView />);

    expect(screen.getByText(/Mind Signal Neural Interface/i)).toBeDefined();
  });

  it('실험 참여하기 버튼 클릭 시 /join 페이지로 이동해야 함', () => {
    render(<MobileLabView />);

    const joinButton = screen.getByRole('button', { name: /실험 참여하기/i });

    fireEvent.click(joinButton);

    expect(mockPush).toHaveBeenCalledWith('/join');
  });

  it('루사이드 아이콘 컴포넌트들이 렌더링되어야 함', () => {
    const { container } = render(<MobileLabView />);

    const svgElements = container.querySelectorAll('svg');
    expect(svgElements.length).toBeGreaterThanOrEqual(2);
  });
});
