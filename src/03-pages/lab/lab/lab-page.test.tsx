'use client';

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { UIProvider } from '@/app/providers/ui-context';

/**
 * [R-1 반영] lab-page.tsx:13은 `@/05-features/sessions/model/use-dual-session`
 * 직접 import (barrel 우회). 이 경로를 정확히 mock해야 intercept됨
 */
vi.mock('@/05-features/sessions/model/use-dual-session', () => ({
  useDualSession: vi.fn(),
}));

/**
 * usePairing은 barrel 경유 import (lab-page.tsx:11)이므로 barrel path로 mock 수행함
 */
vi.mock('@/05-features/sessions', () => ({
  usePairing: vi.fn(),
  QRGenerator: () => null,
  OperatorInviteQr: () => null,
  useDualSession: vi.fn(),
  PairingStep: vi.fn(),
  QRScanner: () => null,
}));

/**
 * useSignal mock 수행함 — 소켓 연결 방지 및 측정 상태 고정함
 */
vi.mock('@/05-features/signals', () => ({
  useSignal: vi.fn(() => ({
    isMeasuring: false,
    elapsedSeconds: 0,
    currentMetrics: null,
    startMeasurement: vi.fn(),
    stopMeasurement: vi.fn(),
  })),
  SignalMeasurer: () => null,
}));

/**
 * dual-trigger API mock 수행함 — 네트워크 호출 방지함
 */
vi.mock('@/07-shared/api/dual-trigger', () => ({
  postDualTrigger: vi.fn().mockResolvedValue({ status: 'triggered' }),
  fetchRegistryStatus: vi.fn().mockResolvedValue({
    ready: false,
    registered: 0,
    attempts: 0,
    inFlight: false,
  }),
}));

/**
 * authApi mock 수행함 — UIProvider 내부 refreshUser 호출 방지함
 */
vi.mock('@/07-shared/api/auth', () => ({
  authApi: {
    getMe: vi.fn().mockResolvedValue({ data: { user: { name: 'test' } } }),
  },
  default: {
    getMe: vi.fn().mockResolvedValue({ data: { user: { name: 'test' } } }),
  },
}));

import { useDualSession } from '@/05-features/sessions/model/use-dual-session';
import { usePairing } from '@/05-features/sessions';
import LabPage from './lab-page';

/**
 * [Helper] UIProvider + LabPage 렌더링 수행함
 */
const renderLabPage = () =>
  render(
    <UIProvider>
      <LabPage />
    </UIProvider>
  );

describe('LabPage 실험 시작 버튼 조건 render 검증 수행함', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // 모바일 판정 방지를 위해 데스크톱 너비 설정함
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1280,
    });
  });

  it('DUAL_2PC 모드 + partnerConnected=true → 실험 시작 버튼 표시 처리됨', async () => {
    // useDualSession: 파트너 연결 완료 상태 mock 설정함
    (useDualSession as ReturnType<typeof vi.fn>).mockReturnValue({
      state: 'ready',
      partnerConnected: true,
      registryStatus: null,
      showFallback: false,
      setDualSessionState: vi.fn(),
    });

    // usePairing: 미연결 상태 mock 설정함
    (usePairing as ReturnType<typeof vi.fn>).mockReturnValue({
      groupId: null,
      pairingCode: null,
      timeLeft: 300,
      pairedSubjects: [],
      isAllPaired: false,
      sessions: [],
      startPairing: vi.fn(),
      resetStatus: vi.fn(),
      requestPairing: vi.fn(),
      status: 'IDLE',
      role: null,
      subjectIndex: null,
      sessionId: null,
    });

    const user = userEvent.setup();
    renderLabPage();

    // 설정 버튼 클릭하여 모드 드롭다운 열기 수행함
    const settingsBtn = document
      .querySelector('[class*="rounded-xl"][class*="border"]')
      ?.querySelector('svg.lucide-settings')
      ?.closest('button');

    // 설정 아이콘 버튼을 역할로 찾기 수행함
    const allButtons = screen.getAllByRole('button');
    const settingsBtnByIcon = allButtons.find((btn) =>
      btn.querySelector('svg.lucide-settings')
    );

    if (settingsBtnByIcon) {
      await user.click(settingsBtnByIcon);
    } else if (settingsBtn) {
      await user.click(settingsBtn);
    }

    // DUAL 2PC 모드 버튼 클릭하여 모드 전환 수행함
    const dual2pcBtn = await screen.findByText(/DUAL 2PC 모드/i);
    await user.click(dual2pcBtn);

    // partnerConnected=true이므로 실험 시작 버튼 표시 확인함
    expect(
      screen.getByRole('button', { name: /실험 시작/ })
    ).toBeInTheDocument();
  });

  it('DUAL_2PC 모드 + partnerConnected=false → 파트너 PC 초대 QR 버튼 표시 처리됨', async () => {
    // useDualSession: 파트너 미연결 상태 mock 설정함
    (useDualSession as ReturnType<typeof vi.fn>).mockReturnValue({
      state: 'waiting',
      partnerConnected: false,
      registryStatus: null,
      showFallback: false,
      setDualSessionState: vi.fn(),
    });

    // usePairing: 미연결 상태 mock 설정함
    (usePairing as ReturnType<typeof vi.fn>).mockReturnValue({
      groupId: null,
      pairingCode: null,
      timeLeft: 300,
      pairedSubjects: [],
      isAllPaired: false,
      sessions: [],
      startPairing: vi.fn(),
      resetStatus: vi.fn(),
      requestPairing: vi.fn(),
      status: 'IDLE',
      role: null,
      subjectIndex: null,
      sessionId: null,
    });

    const user = userEvent.setup();
    renderLabPage();

    // 설정 버튼으로 드롭다운 열기 수행함
    const allButtons = screen.getAllByRole('button');
    const settingsBtnByIcon = allButtons.find((btn) =>
      btn.querySelector('svg.lucide-settings')
    );
    if (settingsBtnByIcon) {
      await user.click(settingsBtnByIcon);
    }

    // DUAL 2PC 모드 선택 수행함
    const dual2pcBtn = await screen.findByText(/DUAL 2PC 모드/i);
    await user.click(dual2pcBtn);

    // partnerConnected=false이므로 파트너 PC 초대 QR 버튼 표시 확인함
    expect(
      screen.getByRole('button', { name: /파트너 PC 초대/ })
    ).toBeInTheDocument();
  });

  it('기본 DUAL 모드 + isAllPaired=true → 실험 시작 버튼 표시 처리됨 (regression)', () => {
    // useDualSession: DUAL_2PC 미사용 상태 mock 설정함 (partnerConnected 무관)
    (useDualSession as ReturnType<typeof vi.fn>).mockReturnValue({
      state: 'idle',
      partnerConnected: false,
      registryStatus: null,
      showFallback: false,
      setDualSessionState: vi.fn(),
    });

    // usePairing: 전원 페어링 완료 상태 mock 설정함
    (usePairing as ReturnType<typeof vi.fn>).mockReturnValue({
      groupId: 'test-group',
      pairingCode: null,
      timeLeft: 300,
      pairedSubjects: [1, 2],
      isAllPaired: true,
      sessions: [
        { id: 'session-1', subjectIndex: 1 },
        { id: 'session-2', subjectIndex: 2 },
      ],
      startPairing: vi.fn(),
      resetStatus: vi.fn(),
      requestPairing: vi.fn(),
      status: 'PAIRED',
      role: 'OPERATOR',
      subjectIndex: null,
      sessionId: null,
    });

    // 기본 DUAL 모드에서 isAllPaired=true → 실험 시작 버튼 표시 확인함
    renderLabPage();

    expect(
      screen.getByRole('button', { name: /실험 시작/ })
    ).toBeInTheDocument();
  });
});

/**
 * Phase 17.6 fallback 버튼 테스트 수행함
 *
 * T-FE-3: showFallback=true 상태에서 "다시 연결 시도" 버튼 클릭 시 POST /engine/dual-trigger 호출 검증함
 * T-FE-5: dual-trigger 503 응답 시 오류 메시지 "대기 상태가 아닙니다" 표시 검증함
 *
 * 전제: T7(lab-page.tsx fallback button + handleManualTrigger 구현) 완료 후 pass함
 * useDualSession mock으로 showFallback=true 강제, 네트워크는 dual-trigger mock 격리함
 */
describe('LabPage Phase 17.6 fallback 버튼 render + 클릭 검증 수행함', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // 모바일 판정 방지를 위해 데스크톱 너비 설정함
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1280,
    });

    // usePairing: groupId 있는 상태 mock 설정함 (fallback 버튼 표시 전제)
    (usePairing as ReturnType<typeof vi.fn>).mockReturnValue({
      groupId: 'test-group-fallback',
      pairingCode: null,
      timeLeft: 300,
      pairedSubjects: [],
      isAllPaired: false,
      sessions: [],
      startPairing: vi.fn(),
      resetStatus: vi.fn(),
      requestPairing: vi.fn(),
      status: 'IDLE',
      role: null,
      subjectIndex: null,
      sessionId: null,
    });
  });

  it('T-FE-3: showFallback=true 상태에서 fallback 버튼 클릭 시 POST /engine/dual-trigger 호출 처리됨', async () => {
    const { postDualTrigger } = await import('@/07-shared/api/dual-trigger');
    const triggerMock = vi.mocked(postDualTrigger);
    // triggered 응답으로 성공 케이스 구성함
    triggerMock.mockResolvedValue({ status: 'triggered' });

    // useDualSession: showFallback=true 상태 강제 설정함
    (useDualSession as ReturnType<typeof vi.fn>).mockReturnValue({
      state: 'invited',
      partnerConnected: false,
      registryStatus: {
        ready: false,
        registered: 0,
        attempts: 0,
        inFlight: false,
      },
      showFallback: true,
      setDualSessionState: vi.fn(),
    });

    const user = userEvent.setup();
    renderLabPage();

    // 설정 드롭다운에서 DUAL 2PC 모드 선택 수행함
    const allButtons = screen.getAllByRole('button');
    const settingsBtnByIcon = allButtons.find((btn) =>
      btn.querySelector('svg.lucide-settings')
    );
    if (settingsBtnByIcon) {
      await user.click(settingsBtnByIcon);
    }
    const dual2pcBtn = await screen.findByText(/DUAL 2PC 모드/i);
    await user.click(dual2pcBtn);

    // fallback 버튼 클릭 후 dual-trigger 호출 확인함
    const fallbackBtn = screen.getByText(/다시 연결 시도/);
    await user.click(fallbackBtn);

    await waitFor(() => {
      expect(triggerMock).toHaveBeenCalledWith('test-group-fallback');
    });
  });

  it('T-FE-5: dual-trigger 503 응답 시 오류 메시지 "대기 상태가 아닙니다" 표시 처리됨', async () => {
    const { postDualTrigger } = await import('@/07-shared/api/dual-trigger');
    const triggerMock = vi.mocked(postDualTrigger);
    // 503 에러 시나리오 구성 — Axios 에러 형태로 reject 처리함
    triggerMock.mockRejectedValue({
      response: { status: 503, data: { message: 'pending 미충족' } },
    });

    // useDualSession: showFallback=true 상태 강제 설정함
    (useDualSession as ReturnType<typeof vi.fn>).mockReturnValue({
      state: 'invited',
      partnerConnected: false,
      registryStatus: {
        ready: false,
        registered: 0,
        attempts: 0,
        inFlight: false,
      },
      showFallback: true,
      setDualSessionState: vi.fn(),
    });

    const user = userEvent.setup();
    renderLabPage();

    // DUAL 2PC 모드 선택 수행함
    const allButtons = screen.getAllByRole('button');
    const settingsBtnByIcon = allButtons.find((btn) =>
      btn.querySelector('svg.lucide-settings')
    );
    if (settingsBtnByIcon) {
      await user.click(settingsBtnByIcon);
    }
    const dual2pcBtn = await screen.findByText(/DUAL 2PC 모드/i);
    await user.click(dual2pcBtn);

    // fallback 버튼 클릭 후 503 오류 메시지 표시 확인함
    const fallbackBtn = screen.getByText(/다시 연결 시도/);
    await user.click(fallbackBtn);

    await waitFor(() => {
      expect(screen.getByText(/대기 상태가 아닙니다/)).toBeInTheDocument();
    });
  });
});
