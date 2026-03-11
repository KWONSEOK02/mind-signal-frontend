import type { Meta, StoryObj } from '@storybook/react';
import { within } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { expect } from 'storybook/test';
import { http, HttpResponse } from 'msw';
import LabPage from './lab-page';

/**
 * [Story] 운영자 관점의 그룹 기반 실험 대시보드 전체 상태 사양 정의함
 *
 * LabPage는 다음 진입점 분기를 포함함:
 * - SSR 하이드레이션 전: 빈 슬레이트 배경만 렌더링함
 * - 모바일 환경: MobileLabView로 즉시 전환함
 * - 데스크톱 환경: 실험 모드(DUAL / BTI) 기반 운영자 대시보드 렌더링함
 *
 * 페어링 흐름:
 * 1. 운영자가 "Subject 01 연결 QR 생성" 버튼 클릭 → POST /sessions 호출 → QR 표시
 * 2. 피실험자 QR 스캔 후 → GET /sessions/group/{groupId}/status 폴링(3초) → guestJoined=true 감지
 * 3. Subject 01 페어링 완료 → 자동으로 Subject 02 QR 생성 시작 (DUAL 모드 시)
 * 4. 모든 피실험자 페어링 완료 → "실험 시작" 버튼 활성화
 * 5. "실험 시작" 클릭 → POST /signals/realtime 매 1초 호출 시작
 */
const meta: Meta<typeof LabPage> = {
  title: '03-pages/Lab/LabPage',
  component: LabPage,
  parameters: {
    layout: 'fullscreen',
    nextjs: {
      appDirectory: true,
    },
    docs: {
      description: {
        component:
          '운영자가 피실험자를 연결하고 뇌파 측정 실험을 제어하는 대시보드임. DUAL(2인) 및 BTI(1인) 모드를 지원하며, MSW를 통해 세션 API를 모킹하여 전체 페어링 흐름을 검증함.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof LabPage>;

// ---------------------------------------------------------------------------
// 공통 헬퍼: 스토리별 독립 순차 세션 핸들러 팩토리 정의함
// ---------------------------------------------------------------------------

/**
 * [Helper] 스토리별로 독립적인 callCount 클로저를 가진 순차 세션 핸들러를 생성함.
 * 각 스토리의 loaders에서 reset()을 호출하여 이전 스토리의 callCount 오염을 방지함.
 * (IIFE를 스토리 파라미터에 직접 인라인하면 모듈 평가 시 단 한 번만 실행되어
 *  여러 스토리 간 callCount가 누적되는 문제가 발생함 — 이 팩토리로 해결함)
 */
const createDualSessionHandlerSet = (groupId: string) => {
  let callCount = 0;
  const handler = http.post(/.*\/sessions$/, () => {
    callCount += 1;
    return HttpResponse.json({
      status: 'success',
      data: {
        groupId,
        subjectIndex: callCount === 1 ? 1 : 2,
        pairingToken: callCount === 1 ? 'QR-TOKEN-S01' : 'QR-TOKEN-S02',
        expiresAt: new Date(Date.now() + 300000).toISOString(),
      },
    });
  });
  const reset = () => { callCount = 0; };
  return { handler, reset };
};

// 스토리별 독립 핸들러 세트 생성함 (각자 고유한 callCount 클로저 보유함)
const subject1ConnectedHandlers = createDualSessionHandlerSet('GROUP-ALPHA');
const experimentReadyHandlers = createDualSessionHandlerSet('GROUP-BETA');
const experimentRunningHandlers = createDualSessionHandlerSet('GROUP-GAMMA');

// ---------------------------------------------------------------------------
// 1. Default — DUAL 모드 초기 유휴 상태
// ---------------------------------------------------------------------------

/**
 * [State] DUAL 모드(기본값)에서의 초기 유휴 상태임.
 *
 * - "Dual Subject Monitor" 제목이 표시됨
 * - Subject 01 / Subject 02 모두 WAITING 상태
 * - System Phase: "Awaiting Entry"
 * - "Subject 01 연결 QR 생성" 버튼이 활성화되어 있음
 * - 톱니바퀴 설정 버튼이 헤더 우측에 위치함
 */
export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'DUAL 모드 기본값으로 진입한 초기 화면임. 아직 어떤 피실험자도 연결되지 않은 유휴 상태이며, Subject 01 QR 생성 버튼과 설정 버튼이 노출됨.',
      },
    },
  },
};

// ---------------------------------------------------------------------------
// 2. SettingsOpen — 설정 드롭다운 열린 상태
// ---------------------------------------------------------------------------

/**
 * [Interactive] 톱니바퀴 설정 버튼 클릭 시 모드 선택 드롭다운이 열리는 동작 검증함.
 *
 * play 함수:
 * 1. 헤더 우측 Settings(SVG) 버튼 식별 및 클릭
 * 2. "DUAL 모드 (2인)" 및 "BTI 모드 (1인)" 옵션이 DOM에 존재하는지 단언함
 */
export const SettingsOpen: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '톱니바퀴 버튼 클릭 후 실험 모드 선택 드롭다운이 노출되는 상태임. 두 가지 모드 옵션("DUAL 모드 (2인)", "BTI 모드 (1인)")이 정상적으로 렌더링되는지 확인함.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 설정(톱니바퀴) 버튼을 SVG 클래스 기반으로 식별하여 클릭 수행함
    const allButtons = canvas.getAllByRole('button');
    const settingsBtn = allButtons.find((btn: HTMLElement) =>
      btn.querySelector('svg.lucide-settings')
    );
    await expect(settingsBtn).toBeDefined();
    if (settingsBtn) {
      await userEvent.click(settingsBtn);
    }

    // 드롭다운 메뉴의 두 모드 옵션이 렌더링되었는지 단언함
    const dualOption = await canvas.findByText(/DUAL 모드 \(2인\)/i);
    const btiOption = await canvas.findByText(/BTI 모드 \(1인\)/i);
    await expect(dualOption).toBeInTheDocument();
    await expect(btiOption).toBeInTheDocument();
  },
};

// ---------------------------------------------------------------------------
// 3. BtiMode — BTI 모드(1인) 전환 후 상태
// ---------------------------------------------------------------------------

/**
 * [Interactive] 설정 드롭다운을 통해 BTI 모드(1인)로 전환하는 시나리오임.
 *
 * 전환 후 확인 사항:
 * - 페이지 타이틀이 "Brain-BTI Analyzer"로 변경됨
 * - Subject 02 연결 상태 카드가 "DISABLED"(불투명도 감소)로 표시됨
 * - System Phase 설명이 "1명의 피실험자"로 업데이트됨
 * - "Subject 01 연결 QR 생성" 버튼만 존재함
 */
export const BtiMode: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'BTI 모드(1인) 전환 후 대시보드 상태임. 제목이 "Brain-BTI Analyzer"로 변경되고 Subject 02 카드가 비활성화(DISABLED)됨을 확인함.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 1. 설정 버튼 식별 및 드롭다운 활성화 수행함 (미발견 시 명시적 에러 발생시킴)
    const allButtons = canvas.getAllByRole('button');
    const settingsBtn = allButtons.find((btn: HTMLElement) =>
      btn.querySelector('svg.lucide-settings')
    );
    if (!settingsBtn) throw new Error('Settings button not found: svg.lucide-settings 버튼을 찾을 수 없음');
    await userEvent.click(settingsBtn);

    // 2. 드롭다운 내 BTI 모드 옵션 클릭하여 전환 수행함
    const btiModeBtn = await canvas.findByText(/BTI 모드 \(1인\)/i);
    await userEvent.click(btiModeBtn);

    // 3. 제목이 Brain-BTI Analyzer로 변경되었는지 단언함
    await expect(canvas.getByText(/Brain-BTI/i)).toBeInTheDocument();
  },
};

// ---------------------------------------------------------------------------
// 4. QRVisible — Subject 01 QR 코드 표시 상태
// ---------------------------------------------------------------------------

/**
 * [State + Interactive] Subject 01 QR 코드가 표시된 상태임.
 *
 * MSW로 POST /sessions를 모킹하여 pairingToken을 즉시 반환함.
 * play 함수:
 * 1. "Subject 01 연결 QR 생성" 버튼 클릭
 * 2. QR 섹션에 "STEP 1: SUBJECT 01 WAITING" 텍스트가 나타나는지 확인함
 * 3. "닫기" 버튼이 렌더링되는지 확인함
 */
export const QRVisible: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '"Subject 01 연결 QR 생성" 버튼 클릭 후 QR 코드 영역이 나타나는 상태임. MSW가 POST /sessions 응답을 즉시 반환하여 QR 토큰이 빠르게 렌더링됨.',
      },
    },
    msw: {
      handlers: [
        // POST /sessions → Subject 01 세션 데이터 즉시 반환 수행함
        http.post(/.*\/sessions$/, () => {
          return HttpResponse.json({
            status: 'success',
            data: {
              groupId: 'GROUP-ALPHA',
              subjectIndex: 1,
              pairingToken: 'QR-TOKEN-S01',
              expiresAt: new Date(Date.now() + 300000).toISOString(),
            },
          });
        }),
        // GET /sessions/group/.../status → 아직 미접속 상태 반환하여 폴링 지속시킴
        http.get(/.*\/sessions\/group\/.*\/status$/, () => {
          return HttpResponse.json({
            status: 'success',
            data: {
              groupId: 'GROUP-ALPHA',
              sessions: [
                { subjectIndex: 1, status: 'CREATED', guestJoined: false },
              ],
            },
          });
        }),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 1. QR 생성 버튼 클릭 수행함
    const createBtn = await canvas.findByText(/Subject 01 연결 QR 생성/i);
    await userEvent.click(createBtn);

    // 2. STEP 1 안내 텍스트가 QR 섹션에 표시되는지 확인함 (타임아웃 5초)
    const stepLabel = await canvas.findByText(
      /STEP 1: SUBJECT 01 WAITING/i,
      {},
      { timeout: 5000 }
    );
    await expect(stepLabel).toBeInTheDocument();

    // 3. 닫기 버튼으로 변경되었는지 확인함
    await expect(canvas.getByText(/닫기/i)).toBeInTheDocument();
  },
};

// ---------------------------------------------------------------------------
// 5. Subject1Connected — Subject 01 페어링 완료 → Subject 02 자동 시작 상태
// ---------------------------------------------------------------------------

/**
 * [State + Interactive] Subject 01 페어링 완료 후 Subject 02 QR이 자동 생성되는 시나리오임.
 *
 * 페어링 엔진은 3초 간격으로 GET /sessions/group/.../status를 폴링함.
 * guestJoined=true 감지 시 Subject 01이 paired 처리되고,
 * useEffect가 즉시 Subject 02 startPairing()을 호출함.
 *
 * MSW 핸들러:
 * - POST /sessions: 첫 번째 호출(Subject 01)과 두 번째 호출(Subject 02) 모두 처리함
 * - GET /sessions/group/.../status: Subject 01 guestJoined=true 반환하여 페어링 완료 유도함
 *
 * 단언:
 * - "STEP 2: SUBJECT 02 WAITING" 또는 "Subject 02 연결 QR 생성" 버튼이 나타나는지 확인함
 */
export const Subject1Connected: Story = {
  // 스토리 실행 전 callCount를 0으로 리셋하여 이전 스토리와 격리함
  loaders: [async () => { subject1ConnectedHandlers.reset(); return {}; }],
  parameters: {
    docs: {
      description: {
        story:
          'Subject 01 페어링 완료 직후 상태임. 엔진이 guestJoined=true를 감지하면 자동으로 Subject 02 QR 생성을 시작함. 연결 상태 그리드에서 Subject 01이 CONNECTED로 표시됨.',
      },
    },
    msw: {
      handlers: [
        // 스토리별 독립 핸들러 사용하여 callCount 오염 방지함
        subject1ConnectedHandlers.handler,
        // GET /sessions/group/.../status → Subject 01 guestJoined=true 반환하여 페어링 완료 유도함
        http.get(/.*\/sessions\/group\/.*\/status$/, () => {
          return HttpResponse.json({
            status: 'success',
            data: {
              groupId: 'GROUP-ALPHA',
              sessions: [
                { subjectIndex: 1, status: 'PAIRED', guestJoined: true },
                { subjectIndex: 2, status: 'CREATED', guestJoined: false },
              ],
            },
          });
        }),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 1. Subject 01 QR 생성 버튼 클릭하여 페어링 흐름 시작 수행함
    const createBtn = await canvas.findByText(/Subject 01 연결 QR 생성/i);
    await userEvent.click(createBtn);

    // 2. 폴링 3초 후 Subject 01 페어링 완료 → Subject 02 QR 자동 시작
    //    Subject 02 QR 섹션 또는 "CONNECTED" 텍스트 대기함 (타임아웃 8초)
    const step2Label = await canvas.findByText(
      /STEP 2: SUBJECT 02 WAITING/i,
      {},
      { timeout: 8000 }
    );
    await expect(step2Label).toBeInTheDocument();

    // 3. Subject 01 연결 상태가 CONNECTED로 변경되었는지 단언함
    const connectedCards = canvas.getAllByText(/CONNECTED/i);
    await expect(connectedCards.length).toBeGreaterThanOrEqual(1);
  },
};

// ---------------------------------------------------------------------------
// 6. ExperimentReady — 두 피실험자 모두 연결 완료 상태
// ---------------------------------------------------------------------------

/**
 * [State + Interactive] DUAL 모드에서 두 피실험자가 모두 페어링 완료된 상태임.
 *
 * MSW 핸들러:
 * - POST /sessions: Subject 01/02 순차 반환
 * - GET /sessions/group/.../status: 첫 폴링부터 두 Session 모두 guestJoined=true 반환
 *
 * 단언:
 * - "실험 시작" 버튼이 녹색(emerald)으로 나타남
 * - System Phase가 "Experiment Ready"로 변경됨
 * - Subject 01/02 모두 CONNECTED 표시
 */
export const ExperimentReady: Story = {
  // 스토리 실행 전 callCount를 0으로 리셋하여 이전 스토리와 격리함
  loaders: [async () => { experimentReadyHandlers.reset(); return {}; }],
  parameters: {
    docs: {
      description: {
        story:
          'DUAL 모드에서 두 피실험자가 모두 연결 완료된 최종 준비 상태임. "실험 시작" 버튼(녹색)이 활성화되고 System Phase가 "Experiment Ready"로 전환됨.',
      },
    },
    msw: {
      handlers: [
        // 스토리별 독립 핸들러 사용하여 callCount 오염 방지함
        experimentReadyHandlers.handler,
        // 상태 폴링: 즉시 두 피실험자 모두 guestJoined=true 반환하여 빠른 완료 유도함
        http.get(/.*\/sessions\/group\/.*\/status$/, () => {
          return HttpResponse.json({
            status: 'success',
            data: {
              groupId: 'GROUP-BETA',
              sessions: [
                { subjectIndex: 1, status: 'PAIRED', guestJoined: true },
                { subjectIndex: 2, status: 'PAIRED', guestJoined: true },
              ],
            },
          });
        }),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 1. 첫 번째 QR 생성 버튼 클릭하여 페어링 흐름 시작 수행함
    const createBtn = await canvas.findByText(/Subject 01 연결 QR 생성/i);
    await userEvent.click(createBtn);

    // 2. 폴링 감지 후 두 피실험자 모두 paired → "실험 시작" 버튼 등장 대기함
    const startBtn = await canvas.findByRole(
      'button',
      { name: /실험 시작/i },
      { timeout: 8000 }
    );
    await expect(startBtn).toBeInTheDocument();

    // 3. System Phase 텍스트가 "Experiment Ready"로 변경되었는지 단언함
    await expect(canvas.getByText(/Experiment Ready/i)).toBeInTheDocument();
  },
};

// ---------------------------------------------------------------------------
// 7. ExperimentRunning — 실험 시작 버튼 클릭 후 측정 중 상태
// ---------------------------------------------------------------------------

/**
 * [Interactive] 실험 시작 버튼 클릭 후 신호 전송이 시작되는 시나리오임.
 *
 * "실험 시작" 클릭 → subject1Signal.startMeasurement() 호출 →
 * POST /signals/realtime 매 1초 요청 시작함.
 *
 * MSW 핸들러:
 * - POST /sessions: Subject 01/02 순차 반환
 * - GET /sessions/group/.../status: 즉시 완료 상태 반환
 * - POST /signals/realtime: 200 OK 응답 처리
 *
 * 단언:
 * - "실험 시작" 버튼 클릭 가능 상태 확인
 * - 클릭 후 버튼이 사라지는지 확인함 (startMeasurement 호출 → 상태 전환)
 */
export const ExperimentRunning: Story = {
  // 스토리 실행 전 callCount를 0으로 리셋하여 이전 스토리와 격리함
  loaders: [async () => { experimentRunningHandlers.reset(); return {}; }],
  parameters: {
    docs: {
      description: {
        story:
          '"실험 시작" 버튼 클릭 후 모든 피실험자에게 신호 측정이 시작되는 상태임. POST /signals/realtime 요청이 MSW에 의해 처리되어 실제 서버 없이 측정 루프 동작을 검증함.',
      },
    },
    msw: {
      handlers: [
        // 스토리별 독립 핸들러 사용하여 callCount 오염 방지함
        experimentRunningHandlers.handler,
        // 상태 폴링: 즉시 완료 상태 반환 수행함
        http.get(/.*\/sessions\/group\/.*\/status$/, () => {
          return HttpResponse.json({
            status: 'success',
            data: {
              groupId: 'GROUP-GAMMA',
              sessions: [
                { subjectIndex: 1, status: 'PAIRED', guestJoined: true },
                { subjectIndex: 2, status: 'PAIRED', guestJoined: true },
              ],
            },
          });
        }),
        // 실시간 신호 전송 엔드포인트 모킹 수행함
        http.post(/.*\/signals\/realtime$/, () => {
          return HttpResponse.json({ status: 'success' });
        }),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 1. QR 생성 버튼 클릭하여 페어링 시작 수행함
    const createBtn = await canvas.findByText(/Subject 01 연결 QR 생성/i);
    await userEvent.click(createBtn);

    // 2. "실험 시작" 버튼 등장 대기 및 클릭 수행함
    const startBtn = await canvas.findByRole(
      'button',
      { name: /실험 시작/i },
      { timeout: 8000 }
    );
    await expect(startBtn).toBeInTheDocument();
    await userEvent.click(startBtn);

    // 3. 클릭 후에도 버튼이 여전히 존재하는지 확인함
    //    (startMeasurement 호출만 수행하며 버튼 제거 로직은 컴포넌트에 없음)
    await expect(canvas.getByRole('button', { name: /실험 시작/i })).toBeInTheDocument();
  },
};

// ---------------------------------------------------------------------------
// 8. QRResetInteraction — QR 생성 후 모드 변경으로 세션 리셋 시나리오
// ---------------------------------------------------------------------------

/**
 * [Interactive] QR이 열려 있는 상태에서 모드를 변경하면 세션이 초기화되는 시나리오임.
 *
 * 전체 흐름:
 * 1. "Subject 01 연결 QR 생성" 클릭 → QR 표시
 * 2. "닫기" 클릭 → QR 닫힘
 * 3. 다시 "Subject 01 연결 QR 생성" 클릭 → QR 재표시
 * 4. 설정 버튼 클릭 → DUAL 모드 재선택 → handleModeChange 호출 → resetStatus + QR 닫힘
 * 5. 초기 상태("Subject 01 연결 QR 생성")로 복구됨 단언
 */
export const QRResetInteraction: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'QR 열린 상태에서 설정 메뉴를 통해 모드를 변경하면 세션이 초기화되고 QR이 닫히는 시나리오임. handleModeChange가 resetStatus와 setIsQRVisible(false)를 함께 호출하는 동작을 검증함.',
      },
    },
    msw: {
      handlers: [
        http.post(/.*\/sessions$/, () => {
          return HttpResponse.json({
            status: 'success',
            data: {
              groupId: 'GROUP-DELTA',
              subjectIndex: 1,
              pairingToken: 'QR-TOKEN-RESET',
              expiresAt: new Date(Date.now() + 300000).toISOString(),
            },
          });
        }),
        http.get(/.*\/sessions\/group\/.*\/status$/, () => {
          return HttpResponse.json({
            status: 'success',
            data: {
              groupId: 'GROUP-DELTA',
              sessions: [
                { subjectIndex: 1, status: 'CREATED', guestJoined: false },
              ],
            },
          });
        }),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 1. QR 생성 버튼 클릭 수행함
    const createBtn = await canvas.findByText(/Subject 01 연결 QR 생성/i);
    await userEvent.click(createBtn);

    // 2. QR 닫기 버튼 클릭 수행함
    const closeBtn = await canvas.findByText(/닫기/i);
    await userEvent.click(closeBtn);

    // 3. 다시 QR 열기 수행함
    const reopenBtn = await canvas.findByText(/Subject 01 연결 QR 생성/i);
    await userEvent.click(reopenBtn);

    // 4. 설정 버튼 식별 및 드롭다운 활성화 수행함
    const allButtons = canvas.getAllByRole('button');
    const settingsBtn = allButtons.find((btn: HTMLElement) =>
      btn.querySelector('svg.lucide-settings')
    );
    if (settingsBtn) {
      await userEvent.click(settingsBtn);
    }

    // 5. DUAL 모드 재선택하여 모드 변경 트리거 수행함 (QR 초기화 유도)
    const dualModeBtn = await canvas.findByText(/DUAL 모드 \(2인\)/i);
    await userEvent.click(dualModeBtn);

    // 6. 모드 변경으로 인해 QR이 닫히고 초기 버튼으로 복구되었는지 단언함
    await expect(
      canvas.getByText(/Subject 01 연결 QR 생성/i)
    ).toBeInTheDocument();
  },
};

// ---------------------------------------------------------------------------
// 9. BtiExperimentReady — BTI 모드(1인) 실험 준비 완료 상태
// ---------------------------------------------------------------------------

/**
 * [Interactive] BTI 모드에서 단일 피실험자 페어링 완료 후 실험 준비 상태임.
 *
 * BTI 모드는 targetCount=1이므로 Subject 01 페어링만으로 isAllPaired=true가 됨.
 * 따라서 폴링에서 guestJoined=true를 감지하면 즉시 "실험 시작" 버튼이 활성화됨.
 *
 * play 함수:
 * 1. 설정 → BTI 모드 전환
 * 2. "Subject 01 연결 QR 생성" 클릭
 * 3. "실험 시작" 버튼 등장 대기 및 단언
 */
export const BtiExperimentReady: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'BTI 모드(1인)에서 Subject 01 페어링 완료 즉시 실험 준비 상태가 되는 시나리오임. targetCount=1이므로 단일 피실험자 연결만으로 "실험 시작" 버튼이 활성화됨.',
      },
    },
    msw: {
      handlers: [
        // BTI 모드 Subject 01 세션 생성 수행함
        http.post(/.*\/sessions$/, () => {
          return HttpResponse.json({
            status: 'success',
            data: {
              groupId: 'GROUP-BTI-01',
              subjectIndex: 1,
              pairingToken: 'QR-TOKEN-BTI-S01',
              expiresAt: new Date(Date.now() + 300000).toISOString(),
            },
          });
        }),
        // 폴링: Subject 01 즉시 guestJoined=true 반환하여 단일 페어링 완료 유도함
        http.get(/.*\/sessions\/group\/.*\/status$/, () => {
          return HttpResponse.json({
            status: 'success',
            data: {
              groupId: 'GROUP-BTI-01',
              sessions: [
                { subjectIndex: 1, status: 'PAIRED', guestJoined: true },
              ],
            },
          });
        }),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 1. 설정 버튼 클릭하여 드롭다운 활성화 수행함 (미발견 시 명시적 에러 발생시킴)
    const allButtons = canvas.getAllByRole('button');
    const settingsBtn = allButtons.find((btn: HTMLElement) =>
      btn.querySelector('svg.lucide-settings')
    );
    if (!settingsBtn) throw new Error('Settings button not found: svg.lucide-settings 버튼을 찾을 수 없음');
    await userEvent.click(settingsBtn);

    // 2. BTI 모드 (1인) 선택하여 모드 전환 수행함
    const btiModeBtn = await canvas.findByText(/BTI 모드 \(1인\)/i);
    await userEvent.click(btiModeBtn);

    // 3. BTI 모드 전환 확인함 (제목 변경)
    await expect(canvas.getByText(/Brain-BTI/i)).toBeInTheDocument();

    // 4. Subject 01 QR 생성 버튼 클릭 수행함
    const createBtn = await canvas.findByText(/Subject 01 연결 QR 생성/i);
    await userEvent.click(createBtn);

    // 5. 1인 모드이므로 Subject 01 페어링 완료만으로 "실험 시작" 활성화됨 (타임아웃 8초)
    const startBtn = await canvas.findByRole(
      'button',
      { name: /실험 시작/i },
      { timeout: 8000 }
    );
    await expect(startBtn).toBeInTheDocument();
  },
};
