/**
 * FE-qr: OperatorInviteQr 컴포넌트 단위 테스트 수행함 (R9-M 2/3)
 *
 * 검증 범위:
 *   - 마운트 시 createOperatorInviteToken 호출 → QR SVG 렌더링
 *   - config.api.baseUrl의 /api suffix 제거 후 QR URL origin 구성 검증
 *   - 5분 카운트다운 타이머 표시 확인
 *   - 에러 시 에러 메시지 + 재발급 버튼 표시
 *   - 토큰 발급 실패(에러) 시 재발급 버튼 클릭 → 재시도 호출
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OperatorInviteQr } from './operator-invite-qr.component';

// createOperatorInviteToken 모킹 처리함
vi.mock('@/07-shared/api/session', () => ({
  createOperatorInviteToken: vi.fn(),
}));

// QRCodeSVG 모킹 처리함 — SVG 렌더링 환경 의존성 제거
vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value }: { value: string }) => (
    <svg data-testid="qr-svg" data-value={value} />
  ),
}));

// lucide-react 아이콘 모킹 처리함 — 렌더링 최소화
vi.mock('lucide-react', () => ({
  RefreshCw: () => <span data-testid="icon-refresh" />,
  Timer: () => <span data-testid="icon-timer" />,
  AlertTriangle: () => <span data-testid="icon-alert" />,
  X: () => <span data-testid="icon-x" />,
}));

// config 모킹 처리함 — baseUrl에 /api suffix 포함하여 origin 추출 로직 검증
vi.mock('@/07-shared/config/config', () => ({
  config: {
    api: {
      baseUrl: 'https://test-backend.example.com/api',
      socketUrl: 'https://test-backend.example.com',
    },
  },
}));

import { createOperatorInviteToken } from '@/07-shared/api/session';
const mockCreateToken = createOperatorInviteToken as ReturnType<typeof vi.fn>;

describe('OperatorInviteQr — token 전달 및 QR URL 구성 테스트 수행함', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('마운트 시 createOperatorInviteToken(groupId) 호출 처리됨', async () => {
    mockCreateToken.mockResolvedValue({
      token: 'invite-jwt-abc',
      expiresAt: Date.now() + 300_000,
    });

    await act(async () => {
      render(<OperatorInviteQr groupId="group-123" />);
    });

    expect(mockCreateToken).toHaveBeenCalledWith('group-123');
  });

  it('토큰 발급 성공 시 QR SVG 렌더링 처리됨', async () => {
    mockCreateToken.mockResolvedValue({
      token: 'invite-jwt-abc',
      expiresAt: Date.now() + 300_000,
    });

    await act(async () => {
      render(<OperatorInviteQr groupId="group-123" />);
    });

    expect(screen.queryByTestId('qr-svg')).not.toBeNull();
  });

  it('QR URL이 config.api.baseUrl에서 /api suffix 제거된 origin 사용 처리됨', async () => {
    mockCreateToken.mockResolvedValue({
      token: 'invite-jwt-abc',
      expiresAt: Date.now() + 300_000,
    });

    await act(async () => {
      render(<OperatorInviteQr groupId="group-123" />);
    });

    const qrEl = screen.getByTestId('qr-svg');
    const qrValue = qrEl.getAttribute('data-value') ?? '';

    // /api suffix 제거 후 origin 사용 검증함 (PLAN buildQrUrl 로직)
    expect(qrValue).toContain(
      'https://test-backend.example.com/lab/operator-join'
    );
    expect(qrValue).toContain('token=invite-jwt-abc');
    expect(qrValue).toContain('groupId=group-123');
    // /api/lab 패턴 미사용 검증함
    expect(qrValue).not.toContain('/api/lab');
  });

  it('토큰 발급 성공 후 5:00 카운트다운 타이머 표시 처리됨', async () => {
    mockCreateToken.mockResolvedValue({
      token: 'invite-jwt-abc',
      expiresAt: Date.now() + 300_000,
    });

    await act(async () => {
      render(<OperatorInviteQr groupId="group-123" />);
    });

    // 5분 = 5:00 형식 확인함
    expect(screen.queryByText('5:00')).not.toBeNull();
  });

  it('카운트다운 타이머 1초 경과 시 4:59 표시 처리됨', async () => {
    vi.useFakeTimers();

    try {
      mockCreateToken.mockResolvedValue({
        token: 'invite-jwt-abc',
        expiresAt: Date.now() + 300_000,
      });

      await act(async () => {
        render(<OperatorInviteQr groupId="group-123" />);
        await Promise.resolve(); // useEffect flush 처리함
      });

      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      expect(screen.queryByText('4:59')).not.toBeNull();
    } finally {
      vi.runOnlyPendingTimers();
      vi.useRealTimers();
    }
  });

  it('토큰 발급 실패 시 에러 메시지 + 재발급 버튼 표시 처리됨', async () => {
    mockCreateToken.mockRejectedValue(new Error('Token issue failed'));

    await act(async () => {
      render(<OperatorInviteQr groupId="group-123" />);
    });

    expect(screen.queryByText(/초대 토큰 발급에 실패함/i)).not.toBeNull();

    // 재발급 버튼 표시 확인함
    expect(screen.queryByText(/새 코드 발급/i)).not.toBeNull();
  });

  it('재발급 버튼 클릭 시 createOperatorInviteToken 재호출 처리됨', async () => {
    // 첫 번째 호출 실패 → 두 번째 호출 성공 시뮬레이션함
    mockCreateToken
      .mockRejectedValueOnce(new Error('First failure'))
      .mockResolvedValueOnce({
        token: 'new-invite-token',
        expiresAt: Date.now() + 300_000,
      });

    const user = userEvent.setup();

    await act(async () => {
      render(<OperatorInviteQr groupId="group-123" />);
    });

    const reissueBtn = screen.getByText(/새 코드 발급/i);

    await act(async () => {
      await user.click(reissueBtn);
    });

    expect(mockCreateToken).toHaveBeenCalledTimes(2);
  });

  it('닫기 버튼 클릭 시 onClose 콜백 호출 처리됨', async () => {
    mockCreateToken.mockResolvedValue({
      token: 'invite-jwt-abc',
      expiresAt: Date.now() + 300_000,
    });

    const onClose = vi.fn();
    const user = userEvent.setup();

    await act(async () => {
      render(<OperatorInviteQr groupId="group-123" onClose={onClose} />);
    });

    // 닫기 버튼 (aria-label="QR 닫기") 클릭 처리함
    const closeBtn = screen.getByLabelText('QR 닫기');

    await act(async () => {
      await user.click(closeBtn);
    });

    expect(onClose).toHaveBeenCalledOnce();
  });
});
