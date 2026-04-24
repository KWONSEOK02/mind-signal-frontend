/**
 * FE-operator-join: OperatorJoinPage 컴포넌트 단위 테스트 수행함 (R9-M 3/3)
 *
 * 검증 범위:
 *   - 유효 token 존재 시 합류하기 버튼 표시
 *   - 합류 버튼 클릭 → joinAsOperator 호출 → /lab?groupId=xxx 라우팅
 *   - 401 응답 시 만료 토큰 에러 메시지 + 재발급 요청 버튼 표시
 *   - token 없음 → 에러 UI 표시 + 재발급 요청 버튼 표시 (합류 버튼 미표시)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import OperatorJoinPage from './operator-join-page';

// joinAsOperator 모킹 처리함
vi.mock('@/07-shared/api/session', () => ({
  joinAsOperator: vi.fn(),
}));

// lucide-react 아이콘 모킹 처리함
vi.mock('lucide-react', () => ({
  AlertCircle: () => <span data-testid="icon-alert-circle" />,
  LogIn: () => <span data-testid="icon-login" />,
}));

import { joinAsOperator } from '@/07-shared/api/session';
const mockJoinAsOperator = joinAsOperator as ReturnType<typeof vi.fn>;

/**
 * next/navigation 및 useSyncExternalStore 처리:
 * vitest.setup.ts 전역 설정에서 next/navigation 모킹이 이미 적용됨
 * mockRouter.asPath를 통해 URL query 파라미터를 제어함
 */
import mockRouter from 'next-router-mock';

describe('OperatorJoinPage — 유효 토큰 합류 처리 테스트 수행함', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 유효 token + groupId 포함 URL 세팅함
    mockRouter.setCurrentUrl(
      '/lab/operator-join?token=valid-jwt-token&groupId=group-abc'
    );
  });

  it('유효 token 존재 시 합류하기 버튼 렌더링 처리됨', () => {
    render(<OperatorJoinPage />);

    expect(screen.queryByText(/합류하기/i)).not.toBeNull();
  });

  it('groupId 존재 시 GROUP 정보 UI 렌더링 처리됨', () => {
    render(<OperatorJoinPage />);

    expect(screen.queryByText(/group-abc/i)).not.toBeNull();
  });

  it('합류 버튼 클릭 시 joinAsOperator(token) 호출 처리됨', async () => {
    mockJoinAsOperator.mockResolvedValue({
      groupId: 'group-abc',
      experimentMode: 'DUAL_2PC',
    });

    render(<OperatorJoinPage />);

    const joinBtn = screen.getByText(/합류하기/i);
    fireEvent.click(joinBtn);

    await waitFor(() => {
      expect(mockJoinAsOperator).toHaveBeenCalledWith('valid-jwt-token');
    });
  });

  it('joinAsOperator 성공 시 /lab?groupId=xxx로 라우팅 처리됨', async () => {
    mockJoinAsOperator.mockResolvedValue({
      groupId: 'group-abc',
      experimentMode: 'DUAL_2PC',
    });

    render(<OperatorJoinPage />);

    fireEvent.click(screen.getByText(/합류하기/i));

    await waitFor(() => {
      expect(mockRouter.asPath).toBe('/lab?groupId=group-abc');
    });
  });

  it('합류 중 로딩 상태 표시 처리됨', async () => {
    // 응답을 지연시켜 로딩 상태 확인함
    mockJoinAsOperator.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () => resolve({ groupId: 'group-abc', experimentMode: 'DUAL_2PC' }),
            1000
          )
        )
    );

    render(<OperatorJoinPage />);
    fireEvent.click(screen.getByText(/합류하기/i));

    await waitFor(() => {
      expect(screen.queryByText(/합류 중\.\.\./i)).not.toBeNull();
    });
  });
});

describe('OperatorJoinPage — 401 응답 에러 처리 테스트 수행함', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRouter.setCurrentUrl(
      '/lab/operator-join?token=expired-token&groupId=group-abc'
    );
  });

  it('401 응답 시 만료 토큰 에러 메시지 표시 처리됨', async () => {
    const err = Object.assign(new Error('Unauthorized'), {
      response: { status: 401 },
    });
    mockJoinAsOperator.mockRejectedValue(err);

    render(<OperatorJoinPage />);
    fireEvent.click(screen.getByText(/합류하기/i));

    await waitFor(() => {
      expect(
        screen.queryByText(/초대 토큰이 만료되었거나 유효하지 않음/i)
      ).not.toBeNull();
    });
  });

  it('401 응답 시 재발급 요청 버튼 표시 처리됨', async () => {
    const err = Object.assign(new Error('Unauthorized'), {
      response: { status: 401 },
    });
    mockJoinAsOperator.mockRejectedValue(err);

    render(<OperatorJoinPage />);
    fireEvent.click(screen.getByText(/합류하기/i));

    await waitFor(() => {
      expect(screen.queryByText(/재발급 요청/i)).not.toBeNull();
    });
  });

  it('400 응답 시 만료 토큰 에러 메시지 표시 처리됨', async () => {
    const err = Object.assign(new Error('Bad Request'), {
      response: { status: 400 },
    });
    mockJoinAsOperator.mockRejectedValue(err);

    render(<OperatorJoinPage />);
    fireEvent.click(screen.getByText(/합류하기/i));

    await waitFor(() => {
      expect(
        screen.queryByText(/초대 토큰이 만료되었거나 유효하지 않음/i)
      ).not.toBeNull();
    });
  });

  it('500 응답 시 일반 에러 메시지 표시 처리됨', async () => {
    const err = Object.assign(new Error('Server Error'), {
      response: { status: 500 },
    });
    mockJoinAsOperator.mockRejectedValue(err);

    render(<OperatorJoinPage />);
    fireEvent.click(screen.getByText(/합류하기/i));

    await waitFor(() => {
      expect(screen.queryByText(/합류 요청 중 오류가 발생함/i)).not.toBeNull();
    });
  });
});

describe('OperatorJoinPage — 토큰 없음 에러 UI 테스트 수행함', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // token 없는 URL 세팅함
    mockRouter.setCurrentUrl('/lab/operator-join');
  });

  it('token 없을 때 합류하기 버튼 미표시 처리됨', () => {
    render(<OperatorJoinPage />);

    // 토큰 없으면 합류 버튼 렌더링 안 됨 (isTokenMissing=true)
    expect(screen.queryByText(/합류하기/i)).toBeNull();
  });

  it('token 없을 때 유효하지 않은 초대 링크 에러 UI 표시 처리됨', () => {
    render(<OperatorJoinPage />);

    expect(screen.queryByText(/유효하지 않은 초대 링크임/i)).not.toBeNull();
  });

  it('token 없을 때 재발급 요청 버튼 표시 처리됨', () => {
    render(<OperatorJoinPage />);

    expect(screen.queryByText(/재발급 요청/i)).not.toBeNull();
  });

  it('재발급 요청 버튼 클릭 시 alert 표시 처리됨', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<OperatorJoinPage />);

    const reissueBtn = screen.getByText(/재발급 요청/i);
    fireEvent.click(reissueBtn);

    expect(alertSpy).toHaveBeenCalledOnce();
    alertSpy.mockRestore();
  });
});
