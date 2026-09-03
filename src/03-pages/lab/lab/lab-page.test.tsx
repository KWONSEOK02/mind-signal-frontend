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
  StreamEndBanner: () => null,
}));

/**
 * next/navigation mock 수행함 — useSearchParams의 groupId를 테스트에서 제어함 (F2).
 * vi.hoisted로 mock 함수를 끌어올려 factory 내부 참조 안전성 보장함.
 */
const { mockSearchParamsGet, mockRouterReplace } = vi.hoisted(() => ({
  mockSearchParamsGet: vi.fn((key: string): string | null => {
    void key;
    return null;
  }),
  // A6 리다이렉트 단언을 위해 replace 를 공유 mock 으로 끌어올림
  mockRouterReplace: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: mockRouterReplace,
    refresh: vi.fn(),
  }),
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

  it('기본 DUAL_2PC 모드 + isAllPaired=true + partnerConnected=false → 시작 버튼 미표시, operator 합류 버튼 표시 (regression)', () => {
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

    // SESSION-W002 로 기본 모드가 DUAL_2PC 가 되면서 게이트가 바뀌었다.
    // isAllPaired 단독으로는 더 이상 시작 버튼이 열리지 않고(lab-page.tsx:392)
    // 파트너 PC 합류를 기다리는 operator 합류 버튼이 나온다.
    // partnerConnected=true 경로의 양의 단언은 이 파일 위쪽 테스트가 덮는다.
    renderLabPage();

    expect(
      screen.queryByRole('button', { name: /실험 시작/ })
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('operator-self-join')).toBeInTheDocument();
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

/**
 * [Helper] navigator.userAgent 교체 수행함. UI-W002 에서 라우팅 판정이
 * 화면 폭이 아니라 UA 로 바뀌었으므로 테스트도 UA 를 제어함
 */
const setUserAgent = (value: string) => {
  Object.defineProperty(window.navigator, 'userAgent', {
    writable: true,
    configurable: true,
    value,
  });
};

const DESKTOP_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

const setViewportWidth = (value: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value,
  });
};

/**
 * UI-W001 A6 회귀 — 모바일 접속이 안내 전용 화면(MobileLabView)에 멈춰 있었음.
 * 그 화면이 /join 첫 화면과 같은 한 문장만 말해 화면 1개와 탭 1회가 낭비됐음.
 *
 * UI-W002 (FE #78) 로 판정 기준이 바뀜. 라우팅은 모바일 UA 단독으로 하고
 * 화면 폭은 안내 배너 표시에만 씀. 운영자가 창을 좁히는 것만으로 측정 도중
 * 대시보드에서 쫓겨나던 결함을 없앰
 */
describe('LabPage 모바일 진입 리다이렉트 검증함', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setUserAgent(DESKTOP_UA);
    setViewportWidth(1280);
    (useDualSession as ReturnType<typeof vi.fn>).mockReturnValue({
      state: 'idle',
      partnerConnected: false,
      registryStatus: null,
      showFallback: false,
      setDualSessionState: vi.fn(),
    });
    (usePairing as ReturnType<typeof vi.fn>).mockReturnValue({
      groupId: null,
      pairingCode: null,
      timeLeft: 0,
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

  it('모바일 UA 진입 시 /join 으로 replace 처리됨', async () => {
    setUserAgent(MOBILE_UA);
    setViewportWidth(390);

    renderLabPage();

    await waitFor(() => {
      expect(mockRouterReplace).toHaveBeenCalledWith('/join');
    });
  });

  it('데스크톱 진입 시 리다이렉트하지 않음', async () => {
    renderLabPage();

    await waitFor(() => {
      expect(useDualSession).toHaveBeenCalled();
    });
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });

  /**
   * FE #78 회귀 — 좁은 창은 라우팅 사유가 아님. 운영자가 창을 반분할로 놓거나
   * DevTools 모바일 에뮬레이션을 켜는 것만으로 768px 미만이 됨
   */
  it('데스크톱 UA 는 창이 좁아도 리다이렉트하지 않고 안내 배너를 렌더함', async () => {
    setViewportWidth(600);

    renderLabPage();

    await waitFor(() => {
      expect(useDualSession).toHaveBeenCalled();
    });
    expect(mockRouterReplace).not.toHaveBeenCalled();
    expect(screen.getByTestId('desktop-only-notice')).toBeInTheDocument();
  });

  /**
   * 배너의 합류 경로는 버튼이 아니라 링크여야 함. 새 탭 열기와 주소 복사가
   * 이 자리의 실사용 시나리오라 링크 시맨틱을 잃으면 안 됨 (FE #78 교차검토)
   */
  it('안내 배너의 합류 경로가 링크 시맨틱을 유지함', async () => {
    setViewportWidth(600);

    renderLabPage();

    await waitFor(() => {
      expect(screen.getByTestId('desktop-only-notice')).toBeInTheDocument();
    });
    const joinLink = screen.getByRole('link', { name: '합류 화면' });
    expect(joinLink).toHaveAttribute('href', '/join');
  });

  /**
   * FE #78 회귀 — 측정 세션 도중 resize 로 대시보드가 언마운트되면 소켓 구독과
   * 페어링 상태가 함께 소실됨. resize 는 배너 표시만 갱신해야 함
   */
  it('렌더 뒤 창을 좁혀도 리다이렉트하지 않음', async () => {
    renderLabPage();

    await waitFor(() => {
      expect(useDualSession).toHaveBeenCalled();
    });

    setViewportWidth(600);
    window.dispatchEvent(new Event('resize'));

    await waitFor(() => {
      expect(screen.getByTestId('desktop-only-notice')).toBeInTheDocument();
    });
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });
});
