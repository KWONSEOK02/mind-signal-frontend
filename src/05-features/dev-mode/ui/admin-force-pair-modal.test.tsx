import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import AdminForcePairModal from './admin-force-pair-modal.component';
import { sessionApi } from '@/07-shared/api';

vi.mock('@/07-shared/api', () => ({
  sessionApi: { forcePairing: vi.fn() },
}));

describe('AdminForcePairModal — FAU 시나리오', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // FAU-1
  it('valid email + valid token 입력 시 forcePairing 호출 후 close 처리함', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    (sessionApi.forcePairing as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { status: 'success', data: { id: 'sess-1' } },
    });

    render(
      <AdminForcePairModal
        isOpen={true}
        onClose={onClose}
        pairingToken="TEST-TOKEN-1"
        theme="dark"
      />
    );

    await user.type(
      screen.getByPlaceholderText('user@example.com'),
      'gwonseok02@gmail.com'
    );
    await user.click(screen.getByRole('button', { name: '강제 페어링' }));

    await waitFor(() => {
      expect(sessionApi.forcePairing).toHaveBeenCalledWith(
        'TEST-TOKEN-1',
        'gwonseok02@gmail.com',
        expect.objectContaining({
          signal: expect.any(AbortSignal),
          timeout: 8000,
        })
      );
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  // FAU-2 — 수동 정규식 검증 (form noValidate)
  it('invalid email 입력 시 수동 정규식 검증 fail + 한국어 inline + forcePairing 미호출 확인함', async () => {
    const user = userEvent.setup();
    render(
      <AdminForcePairModal
        isOpen={true}
        onClose={vi.fn()}
        pairingToken="TEST-TOKEN-1"
        theme="dark"
      />
    );
    await user.type(
      screen.getByPlaceholderText('user@example.com'),
      'not-an-email'
    );
    await user.click(screen.getByRole('button', { name: '강제 페어링' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('이메일 형식');
    });
    expect(sessionApi.forcePairing).not.toHaveBeenCalled();
  });

  // FAU-3
  it('401 응답 시 재로그인 안내 inline message 노출함', async () => {
    const user = userEvent.setup();
    (sessionApi.forcePairing as ReturnType<typeof vi.fn>).mockRejectedValue({
      isAxiosError: true,
      response: { status: 401, data: {} },
    });

    render(
      <AdminForcePairModal
        isOpen={true}
        onClose={vi.fn()}
        pairingToken="TEST-TOKEN-1"
        theme="dark"
      />
    );
    await user.type(
      screen.getByPlaceholderText('user@example.com'),
      'test@test.com'
    );
    await user.click(screen.getByRole('button', { name: '강제 페어링' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('재로그인');
    });
  });

  // FAU-4
  it('403 응답 시 관리자 권한 필요 inline message 노출함', async () => {
    const user = userEvent.setup();
    (sessionApi.forcePairing as ReturnType<typeof vi.fn>).mockRejectedValue({
      isAxiosError: true,
      response: { status: 403, data: {} },
    });

    render(
      <AdminForcePairModal
        isOpen={true}
        onClose={vi.fn()}
        pairingToken="TEST-TOKEN-1"
        theme="dark"
      />
    );
    await user.type(
      screen.getByPlaceholderText('user@example.com'),
      'test@test.com'
    );
    await user.click(screen.getByRole('button', { name: '강제 페어링' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('관리자 권한');
    });
  });

  // FAU-5
  it('404 응답 시 대상 사용자 또는 토큰 불일치 message 노출함', async () => {
    const user = userEvent.setup();
    (sessionApi.forcePairing as ReturnType<typeof vi.fn>).mockRejectedValue({
      isAxiosError: true,
      response: { status: 404, data: {} },
    });

    render(
      <AdminForcePairModal
        isOpen={true}
        onClose={vi.fn()}
        pairingToken="TEST-TOKEN-1"
        theme="dark"
      />
    );
    await user.type(
      screen.getByPlaceholderText('user@example.com'),
      'test@test.com'
    );
    await user.click(screen.getByRole('button', { name: '강제 페어링' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        '대상 사용자 또는 토큰'
      );
    });
  });

  // FAU-6
  it('pairingToken null 시 submit 버튼 disabled + 안내 노출함', () => {
    render(
      <AdminForcePairModal
        isOpen={true}
        onClose={vi.fn()}
        pairingToken={null}
        theme="dark"
      />
    );
    expect(screen.getByRole('button', { name: '강제 페어링' })).toBeDisabled();
    expect(
      screen.getByText('세션 토큰을 찾을 수 없음. QR 생성 후 재시도 필요함.')
    ).toBeInTheDocument();
  });

  // FAU-7 — 에러 후 close → 재open 시 state 초기화 검증함
  it('에러 발생 후 close → 재open 시 email/error state 빈 상태로 초기화 확인함', async () => {
    const user = userEvent.setup();
    (sessionApi.forcePairing as ReturnType<typeof vi.fn>).mockRejectedValue({
      isAxiosError: true,
      response: { status: 404, data: {} },
    });

    const { rerender } = render(
      <AdminForcePairModal
        isOpen={true}
        onClose={vi.fn()}
        pairingToken="TEST-TOKEN-1"
        theme="dark"
      />
    );
    await user.type(
      screen.getByPlaceholderText('user@example.com'),
      'first@test.com'
    );
    await user.click(screen.getByRole('button', { name: '강제 페어링' }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());

    // close (isOpen=false 전이)
    rerender(
      <AdminForcePairModal
        isOpen={false}
        onClose={vi.fn()}
        pairingToken="TEST-TOKEN-1"
        theme="dark"
      />
    );
    // 재open
    rerender(
      <AdminForcePairModal
        isOpen={true}
        onClose={vi.fn()}
        pairingToken="TEST-TOKEN-1"
        theme="dark"
      />
    );

    expect(
      (screen.getByPlaceholderText('user@example.com') as HTMLInputElement)
        .value
    ).toBe('');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  // FAU-8 — window descriptor try/finally restore
  it('mobile-class viewport (375x667 시뮬레이션) 시 modal 100dvh + submit visible 확인함', () => {
    const originalInnerWidth = window.innerWidth;
    const originalInnerHeight = window.innerHeight;
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 667,
    });
    try {
      render(
        <AdminForcePairModal
          isOpen={true}
          onClose={vi.fn()}
          pairingToken="TEST-TOKEN-1"
          theme="dark"
        />
      );
      const dialog = screen.getByRole('dialog') as HTMLElement;
      // vitest browser mode에서 toHaveStyle는 computed style을 검사하므로 inline style 직접 검증함
      expect(dialog.style.height).toBe('100dvh');
      expect(screen.getByRole('button', { name: '강제 페어링' })).toBeVisible();
    } finally {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: originalInnerWidth,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: originalInnerHeight,
      });
    }
  });

  // FAU-9 — AbortController race
  it('submit 후 modal close 시 stale response가 새 state 변경 안 함 (AbortController race)', async () => {
    const user = userEvent.setup();
    let signalRef: AbortSignal | undefined;
    (sessionApi.forcePairing as ReturnType<typeof vi.fn>).mockImplementation(
      (_token: string, _email: string, opts?: { signal?: AbortSignal }) => {
        signalRef = opts?.signal;
        return new Promise((_resolve, reject) => {
          opts?.signal?.addEventListener('abort', () =>
            reject(new DOMException('AbortError', 'AbortError'))
          );
        });
      }
    );

    const { rerender } = render(
      <AdminForcePairModal
        isOpen={true}
        onClose={vi.fn()}
        pairingToken="TEST-TOKEN-1"
        theme="dark"
      />
    );
    await user.type(
      screen.getByPlaceholderText('user@example.com'),
      'test@test.com'
    );
    await user.click(screen.getByRole('button', { name: '강제 페어링' }));

    // modal close → useEffect cleanup이 abort 호출
    rerender(
      <AdminForcePairModal
        isOpen={false}
        onClose={vi.fn()}
        pairingToken="TEST-TOKEN-1"
        theme="dark"
      />
    );
    await waitFor(() => {
      expect(signalRef?.aborted).toBe(true);
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  // FAU-10 — network error (response=undefined)
  it('network error (response=undefined) 시 default "요청 처리 실패함" inline 노출함', async () => {
    const user = userEvent.setup();
    (sessionApi.forcePairing as ReturnType<typeof vi.fn>).mockRejectedValue({
      isAxiosError: true,
    });

    render(
      <AdminForcePairModal
        isOpen={true}
        onClose={vi.fn()}
        pairingToken="TEST-TOKEN-1"
        theme="dark"
      />
    );
    await user.type(
      screen.getByPlaceholderText('user@example.com'),
      'test@test.com'
    );
    await user.click(screen.getByRole('button', { name: '강제 페어링' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('요청 처리 실패함');
    });
  });

  // FAU-11 — ECONNABORTED (timeout)
  it('ECONNABORTED 응답 시 "요청 시간 초과" inline 노출함', async () => {
    const user = userEvent.setup();
    (sessionApi.forcePairing as ReturnType<typeof vi.fn>).mockRejectedValue({
      isAxiosError: true,
      code: 'ECONNABORTED',
      message: 'timeout of 8000ms exceeded',
    });

    render(
      <AdminForcePairModal
        isOpen={true}
        onClose={vi.fn()}
        pairingToken="TEST-TOKEN-1"
        theme="dark"
      />
    );
    await user.type(
      screen.getByPlaceholderText('user@example.com'),
      'test@test.com'
    );
    await user.click(screen.getByRole('button', { name: '강제 페어링' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('요청 시간 초과');
    });
  });

  // FAU-12 — 비-axios 에러 (TypeError)
  it('비-axios 에러 (TypeError) 발생 시 "알 수 없는 오류 발생함." inline 노출함', async () => {
    const user = userEvent.setup();
    (sessionApi.forcePairing as ReturnType<typeof vi.fn>).mockRejectedValue(
      new TypeError('Cannot read property of undefined')
    );

    render(
      <AdminForcePairModal
        isOpen={true}
        onClose={vi.fn()}
        pairingToken="TEST-TOKEN-1"
        theme="dark"
      />
    );
    await user.type(
      screen.getByPlaceholderText('user@example.com'),
      'test@test.com'
    );
    await user.click(screen.getByRole('button', { name: '강제 페어링' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('알 수 없는 오류');
    });
    expect(sessionApi.forcePairing).toHaveBeenCalled();
  });

  // FAU-13 — email trim
  it('trailing space 포함 email 입력 시 trim 적용 + body 전송 확인함', async () => {
    const user = userEvent.setup();
    (sessionApi.forcePairing as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { status: 'success', data: { id: 'sess-1' } },
    });

    render(
      <AdminForcePairModal
        isOpen={true}
        onClose={vi.fn()}
        pairingToken="TEST-TOKEN-1"
        theme="dark"
      />
    );
    await user.type(
      screen.getByPlaceholderText('user@example.com'),
      '  gwonseok02@gmail.com  '
    );
    await user.click(screen.getByRole('button', { name: '강제 페어링' }));

    await waitFor(() => {
      expect(sessionApi.forcePairing).toHaveBeenCalledWith(
        'TEST-TOKEN-1',
        'gwonseok02@gmail.com',
        expect.objectContaining({
          signal: expect.any(AbortSignal),
          timeout: 8000,
        })
      );
    });
  });
});
