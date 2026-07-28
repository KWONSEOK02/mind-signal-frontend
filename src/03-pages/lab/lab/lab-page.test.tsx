'use client';

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { UIProvider } from '@/app/providers/ui-context';
import { saveOperatorSocketSession } from '@/07-shared/lib/operator-socket-session.lib';

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
    currentMetrics2: null,
    startMeasurement: vi.fn(),
    stopMeasurement: vi.fn(),
    joinDualRoom: vi.fn(),
  })),
  SignalMeasurer: () => null,
  OperatorStreamHealthBanner: () => null,
}));

/**
 * next/navigation mock 수행함 — useSearchParams의 groupId를 테스트에서 제어함 (F2).
 * vi.hoisted로 mock 함수를 끌어올려 factory 내부 참조 안전성 보장함.
 */
const { mockSearchParamsGet } = vi.hoisted(() => ({
  mockSearchParamsGet: vi.fn((key: string): string | null => {
    void key;
    return null;
  }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => ({ get: mockSearchParamsGet }),
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
 * measurementApi mock 수행함 — 네트워크 호출 방지함
 */
vi.mock('@/07-shared/api/signal', () => ({
  default: {
    startMeasurement: vi
      .fn()
      .mockResolvedValue({ data: { status: 'success' } }),
    startDualByGroup: vi
      .fn()
      .mockResolvedValue({ data: { status: 'success' } }),
  },
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

/**
 * operator self-join API mock — handleOperatorSelfJoin 클릭 경로 테스트용 (CodeRabbit #60)
 */
vi.mock('@/07-shared/api/session', () => ({
  default: {},
  createOperatorInviteToken: vi.fn(),
  joinAsOperator: vi.fn(),
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

  it('DUAL_2PC 모드 + 페어링 완료 + partnerConnected=false → operator 합류(이 PC) 버튼 표시 처리됨', async () => {
    // useDualSession: 파트너 미연결 상태 mock 설정함
    (useDualSession as ReturnType<typeof vi.fn>).mockReturnValue({
      state: 'waiting',
      partnerConnected: false,
      registryStatus: null,
      showFallback: false,
      setDualSessionState: vi.fn(),
    });

    // usePairing: 페어링 완료(양쪽 PAIRED) 상태 mock 설정함
    // pairedSubjects 충족 시 operator 합류(이 PC) 원클릭 버튼 표시함 (QR 제거됨)
    (usePairing as ReturnType<typeof vi.fn>).mockReturnValue({
      groupId: 'group-paired',
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

    // 페어링 완료 + partnerConnected=false이므로 operator 합류(이 PC) 버튼 표시 확인함
    expect(screen.getByTestId('operator-self-join')).toBeInTheDocument();
  });

  it('DUAL_2PC 모드 + groupId 없음 + 페어링 미완료 → Subject 연결 QR 생성 버튼 표시 처리됨', async () => {
    // useDualSession: 파트너 미연결 상태 mock 설정함
    (useDualSession as ReturnType<typeof vi.fn>).mockReturnValue({
      state: 'idle',
      partnerConnected: false,
      registryStatus: null,
      showFallback: false,
      setDualSessionState: vi.fn(),
    });

    // usePairing: groupId 없음, 페어링 0명 상태 mock 설정함
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
      subjectIndex: null,
      sessionId: null,
    });

    const user = userEvent.setup();
    renderLabPage();

    // 설정 버튼 클릭하여 모드 드롭다운 열기 수행함
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

    // groupId 없으므로 Subject 01 연결 QR 생성 버튼 표시 확인함
    expect(
      screen.getByRole('button', { name: /Subject 01 연결 QR 생성/ })
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
 * D4-FE: DUAL_2PC 실험 시작 시 startDualByGroup 호출 테스트 수행함
 */
describe('LabPage D4-FE — DUAL_2PC 실험 시작 startDualByGroup 호출 검증 수행함', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1280,
    });
  });

  it('DUAL_2PC + partnerConnected=true 시 실험 시작 클릭 → startDualByGroup 호출 처리됨', async () => {
    const measurementApi = await import('@/07-shared/api/signal');
    const startDualByGroupMock = vi.mocked(
      measurementApi.default.startDualByGroup
    );

    (useDualSession as ReturnType<typeof vi.fn>).mockReturnValue({
      state: 'ready',
      partnerConnected: true,
      registryStatus: null,
      showFallback: false,
      setDualSessionState: vi.fn(),
    });

    // groupId 있는 상태 mock 설정함 (pairingGroupId 반환)
    (usePairing as ReturnType<typeof vi.fn>).mockReturnValue({
      groupId: 'group-dual-2pc',
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
      subjectIndex: null,
      sessionId: null,
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

    // 실험 시작 버튼 클릭 수행함
    const startBtn = screen.getByRole('button', { name: /실험 시작/ });
    await user.click(startBtn);

    // startDualByGroup('group-dual-2pc') 호출 확인함
    expect(startDualByGroupMock).toHaveBeenCalledWith('group-dual-2pc');
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

    // usePairing: fallback 전제 — showFallback은 양쪽 PAIRED + assign-group 이후에만
    // true가 되므로 pairedSubjects는 [1,2](isAllPaired)여야 현실적임.
    (usePairing as ReturnType<typeof vi.fn>).mockReturnValue({
      groupId: 'test-group-fallback',
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

/**
 * 회귀 재현 — DUAL_2PC 첫 Subject QR 조기 소멸 (CodeRabbit lab-page.tsx:344)
 *
 * startPairing이 세션 생성 직후 groupId를 세팅하면, !groupId 기준 분기 때문에
 * subject가 스캔하기 전에 Subject 연결 QR 버튼이 파트너 초대로 전환되던 버그.
 * fix 전 RED(파트너 초대 버튼으로 전환), fix 후 GREEN(Subject 버튼 유지).
 */
describe('LabPage DUAL_2PC 첫 Subject QR 조기 소멸 회귀', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1280,
    });
  });

  it('groupId 세팅됨 + 페어링 미완료면 Subject 연결 QR 버튼 유지(파트너 초대 전환 안 됨)', async () => {
    (useDualSession as ReturnType<typeof vi.fn>).mockReturnValue({
      state: 'invited',
      partnerConnected: false,
      registryStatus: null,
      showFallback: false,
      setDualSessionState: vi.fn(),
    });
    // 세션 생성 직후: groupId 세팅됨, 아직 subject PAIRED 0
    (usePairing as ReturnType<typeof vi.fn>).mockReturnValue({
      groupId: 'gid-midpair',
      pairingCode: 'token-1',
      timeLeft: 300,
      pairedSubjects: [],
      isAllPaired: false,
      sessions: [],
      startPairing: vi.fn(),
      resetStatus: vi.fn(),
      requestPairing: vi.fn(),
      status: 'CREATED',
      subjectIndex: null,
      sessionId: null,
    });

    const user = userEvent.setup();
    renderLabPage();

    const settingsBtn = screen
      .getAllByRole('button')
      .find((btn) => btn.querySelector('svg.lucide-settings'));
    if (settingsBtn) await user.click(settingsBtn);
    const dual2pcBtn = await screen.findByText(/DUAL 2PC 모드/i);
    await user.click(dual2pcBtn);

    // 페어링 중이므로 Subject 연결 QR 버튼이 유지돼야 함
    expect(
      screen.getByRole('button', { name: /Subject 0\d 연결 QR 생성/ })
    ).toBeInTheDocument();
    // 파트너 PC 초대로 조기 전환되면 안 됨
    expect(
      screen.queryByRole('button', { name: /파트너 PC 초대/ })
    ).not.toBeInTheDocument();
  });
});

/**
 * inFlight 인디케이터 테스트 수행함
 *
 * DUAL_2PC 등록 진행 중(registryStatus.inFlight=true, partnerConnected=false)일 때
 * System Phase 박스에 "등록 시도 중..." 시각 피드백 노출 검증함.
 */
describe('LabPage DUAL_2PC inFlight 인디케이터 render 검증 수행함', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1280,
    });
    (usePairing as ReturnType<typeof vi.fn>).mockReturnValue({
      groupId: 'group-inflight',
      pairingCode: null,
      timeLeft: 300,
      pairedSubjects: [],
      isAllPaired: false,
      sessions: [],
      startPairing: vi.fn(),
      resetStatus: vi.fn(),
      requestPairing: vi.fn(),
      status: 'IDLE',
      subjectIndex: null,
      sessionId: null,
    });
  });

  it('inFlight=true + partnerConnected=false → "등록 시도 중..." 표시 처리됨', async () => {
    (useDualSession as ReturnType<typeof vi.fn>).mockReturnValue({
      state: 'invited',
      partnerConnected: false,
      registryStatus: {
        ready: false,
        registered: 0,
        attempts: 1,
        inFlight: true,
      },
      showFallback: false,
      setDualSessionState: vi.fn(),
    });

    const user = userEvent.setup();
    renderLabPage();

    const settingsBtn = screen
      .getAllByRole('button')
      .find((btn) => btn.querySelector('svg.lucide-settings'));
    if (settingsBtn) await user.click(settingsBtn);
    const dual2pcBtn = await screen.findByText(/DUAL 2PC 모드/i);
    await user.click(dual2pcBtn);

    expect(screen.getByText(/등록 시도 중/)).toBeInTheDocument();
  });

  it('inFlight=false → "등록 시도 중..." 미표시 처리됨', async () => {
    (useDualSession as ReturnType<typeof vi.fn>).mockReturnValue({
      state: 'invited',
      partnerConnected: false,
      registryStatus: {
        ready: false,
        registered: 0,
        attempts: 0,
        inFlight: false,
      },
      showFallback: false,
      setDualSessionState: vi.fn(),
    });

    const user = userEvent.setup();
    renderLabPage();

    const settingsBtn = screen
      .getAllByRole('button')
      .find((btn) => btn.querySelector('svg.lucide-settings'));
    if (settingsBtn) await user.click(settingsBtn);
    const dual2pcBtn = await screen.findByText(/DUAL 2PC 모드/i);
    await user.click(dual2pcBtn);

    expect(screen.queryByText(/등록 시도 중/)).not.toBeInTheDocument();
  });
});

/**
 * F2 — groupId provenance (신선한 pairing 우선, stale URL 표류 차단)
 *
 * 차트 0건 표류 근본원인 중 하나: 이전 operator-join 리다이렉트가 남긴
 * stale ?groupId= 가 새 페어링 그룹을 덮어써 BE/FE 그룹ID가 어긋남.
 * fix 전 RED(stale URL로 startDualByGroup 호출), fix 후 GREEN(pairing 우선).
 */
describe('LabPage F2 — groupId provenance (신선한 pairing 우선)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1280,
    });
    mockSearchParamsGet.mockReturnValue(null);
    (useDualSession as ReturnType<typeof vi.fn>).mockReturnValue({
      state: 'ready',
      partnerConnected: true,
      registryStatus: null,
      showFallback: false,
      setDualSessionState: vi.fn(),
    });
    (usePairing as ReturnType<typeof vi.fn>).mockReturnValue({
      groupId: 'fresh-pairing-group',
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
      subjectIndex: null,
      sessionId: null,
    });
  });

  it('stale URL ?groupId= 가 있어도 신선한 pairing groupId로 측정 시작함', async () => {
    // URL에 옛 그룹이 남아 있는 상황 재현함
    mockSearchParamsGet.mockReturnValue('stale-url-group');

    const measurementApi = await import('@/07-shared/api/signal');
    const startDualByGroupMock = vi.mocked(
      measurementApi.default.startDualByGroup
    );

    const user = userEvent.setup();
    renderLabPage();

    const settingsBtn = screen
      .getAllByRole('button')
      .find((b) => b.querySelector('svg.lucide-settings'));
    if (settingsBtn) await user.click(settingsBtn);
    const dual2pcBtn = await screen.findByText(/DUAL 2PC 모드/i);
    await user.click(dual2pcBtn);

    const startBtn = screen.getByRole('button', { name: /실험 시작/ });
    await user.click(startBtn);

    // 신선한 pairing 그룹으로 호출되어야 함 (stale URL 무시)
    expect(startDualByGroupMock).toHaveBeenCalledWith('fresh-pairing-group');
    expect(startDualByGroupMock).not.toHaveBeenCalledWith('stale-url-group');
  });
});

/**
 * F3 — 실험 시작 중복 클릭 가드
 *
 * 더블클릭 시 두 번째 start가 BE 전이 가드로 400을 받아 dev 오버레이를 유발하던 버그.
 * fix 전 RED(startDualByGroup 2회 호출), fix 후 GREEN(1회만).
 */
describe('LabPage F3 — 실험 시작 중복 클릭 가드', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1280,
    });
    mockSearchParamsGet.mockReturnValue(null);
    (useDualSession as ReturnType<typeof vi.fn>).mockReturnValue({
      state: 'ready',
      partnerConnected: true,
      registryStatus: null,
      showFallback: false,
      setDualSessionState: vi.fn(),
    });
    (usePairing as ReturnType<typeof vi.fn>).mockReturnValue({
      groupId: 'group-guard',
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
      subjectIndex: null,
      sessionId: null,
    });
  });

  it('실험 시작 더블클릭 시 startDualByGroup은 1회만 호출됨', async () => {
    const measurementApi = await import('@/07-shared/api/signal');
    const startDualByGroupMock = vi.mocked(
      measurementApi.default.startDualByGroup
    );
    // 시작 호출을 pending 상태로 유지함 — resolve되면 finally가 가드 ref를 해제하므로
    // 가드 작동 검증을 위해 미해결 Promise 반환함
    startDualByGroupMock.mockImplementation(
      () => new Promise(() => {}) as never
    );

    const user = userEvent.setup();
    renderLabPage();

    const settingsBtn = screen
      .getAllByRole('button')
      .find((b) => b.querySelector('svg.lucide-settings'));
    if (settingsBtn) await user.click(settingsBtn);
    const dual2pcBtn = await screen.findByText(/DUAL 2PC 모드/i);
    await user.click(dual2pcBtn);

    const startBtn = screen.getByRole('button', { name: /실험 시작/ });
    await user.click(startBtn);
    await user.click(startBtn);

    expect(startDualByGroupMock).toHaveBeenCalledTimes(1);
  });
});

/**
 * CodeRabbit #60 — 측정 시작 실패를 전부 비치명으로 삼키지 않음
 * 400(중복/MEASURING)만 무시하고 401/500/네트워크는 visible error로 노출함.
 */
describe('LabPage CR — 측정 시작 실패 visible error', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1280,
    });
    mockSearchParamsGet.mockReturnValue(null);
    (useDualSession as ReturnType<typeof vi.fn>).mockReturnValue({
      state: 'ready',
      partnerConnected: true,
      registryStatus: null,
      showFallback: false,
      setDualSessionState: vi.fn(),
    });
    (usePairing as ReturnType<typeof vi.fn>).mockReturnValue({
      groupId: 'group-err',
      pairingCode: null,
      timeLeft: 300,
      pairedSubjects: [1, 2],
      isAllPaired: true,
      sessions: [
        { id: 's1', subjectIndex: 1 },
        { id: 's2', subjectIndex: 2 },
      ],
      startPairing: vi.fn(),
      resetStatus: vi.fn(),
      requestPairing: vi.fn(),
      status: 'PAIRED',
      subjectIndex: null,
      sessionId: null,
    });
  });

  const openDual2pcAndStart = async () => {
    const user = userEvent.setup();
    renderLabPage();
    const settingsBtn = screen
      .getAllByRole('button')
      .find((b) => b.querySelector('svg.lucide-settings'));
    if (settingsBtn) await user.click(settingsBtn);
    await user.click(await screen.findByText(/DUAL 2PC 모드/i));
    await user.click(screen.getByRole('button', { name: /실험 시작/ }));
  };

  it('startDualByGroup 500 실패 시 visible error 표시함', async () => {
    const measurementApi = await import('@/07-shared/api/signal');
    vi.mocked(measurementApi.default.startDualByGroup).mockRejectedValue({
      response: { status: 500 },
    });

    await openDual2pcAndStart();

    expect(await screen.findByText(/측정 시작 실패/)).toBeInTheDocument();
  });

  it('startDualByGroup 400(이미 MEASURING 기대 메시지)는 error 안 띄움', async () => {
    const measurementApi = await import('@/07-shared/api/signal');
    vi.mocked(measurementApi.default.startDualByGroup).mockRejectedValue({
      response: {
        status: 400,
        data: {
          message:
            '그룹 내 전이 불가 세션이 존재하여 측정을 시작할 수 없습니다.',
        },
      },
    });

    await openDual2pcAndStart();
    await new Promise((r) => setTimeout(r, 50));

    expect(screen.queryByText(/측정 시작 실패/)).not.toBeInTheDocument();
  });

  it('startDualByGroup 400(예상 외 메시지)는 visible error 표시함', async () => {
    const measurementApi = await import('@/07-shared/api/signal');
    vi.mocked(measurementApi.default.startDualByGroup).mockRejectedValue({
      response: { status: 400, data: { message: '잘못된 요청입니다.' } },
    });

    await openDual2pcAndStart();

    expect(await screen.findByText(/잘못된 요청입니다/)).toBeInTheDocument();
  });
});

/**
 * CodeRabbit #60 — operator self-join 클릭 동작 커버리지
 * 버튼 표시뿐 아니라 클릭 후 pending(합류 중...) + BE 오류 메시지 노출을 검증함.
 */
describe('LabPage CR — operator self-join 클릭 경로', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1280,
    });
    mockSearchParamsGet.mockReturnValue(null);
    // 페어링 완료 + partnerConnected=false → operator 합류(이 PC) 버튼 노출
    (useDualSession as ReturnType<typeof vi.fn>).mockReturnValue({
      state: 'waiting',
      partnerConnected: false,
      registryStatus: null,
      showFallback: false,
      setDualSessionState: vi.fn(),
    });
    (usePairing as ReturnType<typeof vi.fn>).mockReturnValue({
      groupId: 'group-selfjoin',
      pairingCode: null,
      timeLeft: 300,
      pairedSubjects: [1, 2],
      isAllPaired: true,
      sessions: [
        { id: 's1', subjectIndex: 1 },
        { id: 's2', subjectIndex: 2 },
      ],
      startPairing: vi.fn(),
      resetStatus: vi.fn(),
      requestPairing: vi.fn(),
      status: 'PAIRED',
      subjectIndex: null,
      sessionId: null,
    });
  });

  const openDual2pcAndClickJoin = async () => {
    const user = userEvent.setup();
    renderLabPage();
    const settingsBtn = screen
      .getAllByRole('button')
      .find((b) => b.querySelector('svg.lucide-settings'));
    if (settingsBtn) await user.click(settingsBtn);
    await user.click(await screen.findByText(/DUAL 2PC 모드/i));
    await user.click(screen.getByTestId('operator-self-join'));
  };

  it('합류 클릭 시 합류 중... pending 표시함', async () => {
    const sessionMod = await import('@/07-shared/api/session');
    // invite 토큰 발급이 진행 중인 동안 pending 상태 유지
    vi.mocked(sessionMod.createOperatorInviteToken).mockReturnValue(
      new Promise(() => {}) as never
    );

    await openDual2pcAndClickJoin();

    expect(await screen.findByText(/합류 중/)).toBeInTheDocument();
  });

  it('합류 실패 시 BE 오류 메시지 노출함', async () => {
    const sessionMod = await import('@/07-shared/api/session');
    vi.mocked(sessionMod.createOperatorInviteToken).mockResolvedValue({
      token: 'tok',
      expiresAt: 9999999999999,
    });
    vi.mocked(sessionMod.joinAsOperator).mockRejectedValue({
      response: { data: { message: 'operator 합류 거부됨' } },
    });

    await openDual2pcAndClickJoin();

    expect(await screen.findByText(/operator 합류 거부됨/)).toBeInTheDocument();
  });
});

describe('LabPage 초대 운영자 experimentMode 복원 처리함', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1280,
    });
    mockSearchParamsGet.mockImplementation((key: string) =>
      key === 'groupId' ? 'joined-group' : null
    );
    saveOperatorSocketSession('joined-group', {
      socketToken: 'operator-socket-token',
      socketTokenExpiresAt: Date.now() + 60_000,
      experimentMode: 'DUAL_2PC',
    });
    (useDualSession as ReturnType<typeof vi.fn>).mockReturnValue({
      state: 'waiting',
      partnerConnected: false,
      registryStatus: null,
      showFallback: false,
      setDualSessionState: vi.fn(),
    });
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
      subjectIndex: null,
      sessionId: null,
    });
  });

  it('저장된 DUAL_2PC 모드를 대시보드 소켓 경로에 반영함', async () => {
    renderLabPage();

    await waitFor(() => {
      expect(useDualSession).toHaveBeenCalledWith('joined-group', 'DUAL_2PC');
    });
  });
});
