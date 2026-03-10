import type { Meta, StoryObj } from '@storybook/react';
import { within } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { expect } from 'storybook/test';
import { http, HttpResponse } from 'msw';
import JoinPage from './join-page';

// ─────────────────────────────────────────────────────────────────────────────
// 공통 MSW 핸들러 팩토리 정의함
// ─────────────────────────────────────────────────────────────────────────────

/**
 * [Helper] 페어링 API 성공 응답 핸들러를 생성함
 * 피실험자 인덱스와 그룹 ID를 주입하여 재사용 가능한 핸들러 반환함
 */
const makePairingSuccessHandler = (
  groupId: string,
  subjectIndex: number,
  pairingToken: string
) =>
  http.post(/.*sessions.*pair.*/, () =>
    HttpResponse.json({
      status: 'success',
      data: {
        groupId,
        subjectIndex,
        pairingToken,
        expiresAt: new Date(Date.now() + 300_000).toISOString(),
      },
    })
  );

/**
 * [Helper] 신호 전송 API 성공 응답 핸들러를 생성함
 */
const makeSignalHandler = () =>
  http.post(/.*signals.*realtime.*/, () =>
    HttpResponse.json({ status: 'success' })
  );

// ─────────────────────────────────────────────────────────────────────────────
// Meta 정의함
// ─────────────────────────────────────────────────────────────────────────────

/**
 * [Story] 피실험자 관점의 그룹 합류 및 측정 대기 페이지 전체 사양 정의함
 *
 * ## 주요 상태
 * - **Default** — 초기 대기 화면 (IDLE)
 * - **ScannerOpen** — QR 스캐너 활성 화면
 * - **JoinedAsSubject01** — 1번 피실험자로 합류 완료 (PAIRED)
 * - **JoinedAsSubject02** — 2번 피실험자로 합류 완료 (PAIRED)
 * - **MeasuringActive** — 합류 완료 후 뇌파 측정 중
 * - **ExpiredStatus** — 세션 만료 에러 (EXPIRED)
 * - **NetworkError** — 서버 오류 에러 (ERROR)
 * - **URLAutoJoin** — URL `?code=` 파라미터를 통한 자동 페어링
 */
const meta: Meta<typeof JoinPage> = {
  title: '03-pages/Lab/JoinPage',
  component: JoinPage,
  parameters: {
    layout: 'fullscreen',
    viewport: { defaultViewport: 'mobile1' },
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/join',
      },
    },
    docs: {
      description: {
        component:
          '피실험자가 QR 코드를 스캔하여 실험 그룹에 합류하고 뇌파 측정을 제어하는 페이지임. ' +
          '`useSyncExternalStore` 로 SSR 가드를 구현하며, URL `?code=TOKEN` 파라미터가 있으면 페이지 진입 즉시 자동으로 페어링을 요청함.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof JoinPage>;

// ─────────────────────────────────────────────────────────────────────────────
// 1. Default — 초기 IDLE 상태
// ─────────────────────────────────────────────────────────────────────────────

/**
 * [State] 피실험자가 앱에 처음 진입했을 때의 초기 대기 화면임.
 * QR 스캔 버튼만 노출되며 스캐너 및 에러 카드는 숨겨진 상태임.
 */
export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '페이지 최초 진입 시 보여지는 IDLE 상태임. ' +
          '"실험 합류하기 (QR 스캔)" 버튼 한 개만 노출되며, 에러 카드와 SUBJECT 카드는 표시되지 않음.',
      },
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. ScannerOpen — QR 스캐너 활성화 상태
// ─────────────────────────────────────────────────────────────────────────────

/**
 * [Interactive] QR 스캐너를 열어 카메라 접근 UI가 렌더링되는지 검증함.
 *
 * Storybook 샌드박스에는 카메라가 없으므로 html5-qrcode 가 에러 상태를 표시할 수 있으나,
 * 스캐너 래퍼 DOM 영역 자체가 삽입되었는지를 기준으로 검증 수행함.
 */
export const ScannerOpen: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '"실험 합류하기 (QR 스캔)" 버튼을 클릭하면 `isScannerOpen` 상태가 `true` 로 전환되어 ' +
          '`<QRScanner>` 컴포넌트가 렌더링됨. 카메라를 사용할 수 없는 환경에서는 스캐너 UI 오류 메시지가 노출될 수 있음.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 1. 초기 "실험 합류하기" 버튼을 찾아 클릭하여 스캐너를 활성화함
    const joinButton = await canvas.findByText(/실험 합류하기/i, {}, { timeout: 3000 });
    await userEvent.click(joinButton);

    // 2. 스캐너가 마운트된 후 버튼이 사라졌는지 확인하여 상태 전환을 검증함
    //    (버튼은 !isScannerOpen 조건에서만 렌더링되므로 사라진 것을 단언함)
    await expect(
      canvas.queryByText(/실험 합류하기 \(QR 스캔\)/i)
    ).not.toBeInTheDocument();
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. JoinedAsSubject01 — PAIRED 상태 (피실험자 01번)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * [State] URL ?code= 파라미터를 통한 자동 페어링으로 1번 피실험자로 합류 완료된 상태임.
 *
 * MSW 가 `POST /sessions/:token/pair` 를 인터셉트하여 `subjectIndex: 1` 을 반환함.
 * 합류 완료 후 "SUBJECT 01" 카드와 `<SignalMeasurer>` 위젯이 노출됨.
 */
export const JoinedAsSubject01: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'URL `?code=GROUP_SESSION_TOKEN_S01` 파라미터 감지 → 자동 페어링 요청 → 성공 응답으로 ' +
          '"SUBJECT 01" 상태 카드 및 측정 제어 위젯이 노출된 화면임.',
      },
    },
    msw: {
      handlers: [
        makePairingSuccessHandler('GROUP-TEST-01', 1, 'MOCK-TOKEN-S01'),
      ],
    },
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/join',
        search: '?code=GROUP_SESSION_TOKEN_S01',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 자동 페어링이 완료되면 "SUBJECT 01" 텍스트가 노출됨 (비동기 상태 갱신 대기함)
    const subjectLabel = await canvas.findByText(/SUBJECT\s+01/i, {}, { timeout: 5000 });
    await expect(subjectLabel).toBeInTheDocument();

    // "다른 그룹에 참여하기" 재설정 버튼도 함께 노출되는지 확인함
    const leaveButton = await canvas.findByText(/다른 그룹에 참여하기/i, {}, { timeout: 3000 });
    await expect(leaveButton).toBeInTheDocument();
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. JoinedAsSubject02 — PAIRED 상태 (피실험자 02번)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * [State] URL ?code= 파라미터를 통한 자동 페어링으로 2번 피실험자로 합류 완료된 상태임.
 *
 * `subjectIndex: 2` 반환 → "SUBJECT 02" 카드로 렌더링됨을 검증함.
 * 그룹 ID가 다른 세션임을 보여주기 위해 별도 그룹 ID를 사용함.
 */
export const JoinedAsSubject02: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '동일 세션 내 두 번째 피실험자로 합류한 상태임. ' +
          '`subjectIndex: 2` 응답에 따라 "SUBJECT 02" 카드가 렌더링되며, 그룹 ID가 카드에 표시됨.',
      },
    },
    msw: {
      handlers: [
        makePairingSuccessHandler('GROUP-TEST-02', 2, 'MOCK-TOKEN-S02'),
      ],
    },
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/join',
        search: '?code=GROUP_SESSION_TOKEN_S02',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // SUBJECT 02 카드가 노출될 때까지 대기함
    const subjectLabel = await canvas.findByText(/SUBJECT\s+02/i, {}, { timeout: 5000 });
    await expect(subjectLabel).toBeInTheDocument();

    // 그룹 ID 배지가 렌더링되었는지 확인함
    const groupIdBadge = await canvas.findByText(/GROUP-TEST-02/i, {}, { timeout: 3000 });
    await expect(groupIdBadge).toBeInTheDocument();
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. MeasuringActive — 페어링 완료 후 뇌파 측정 시작 상태
// ─────────────────────────────────────────────────────────────────────────────

/**
 * [Interactive] 페어링 완료 후 "측정 시작하기" 버튼을 클릭하여
 * `isMeasuring: true` 상태로 전환된 화면을 검증함.
 *
 * MSW 로 `POST /signals/realtime` 도 함께 인터셉트하여 신호 전송 실패 없이 진행함.
 * Footer 영역의 녹색 점이 활성화되고 "측정 중지하기" 버튼이 노출됨.
 */
export const MeasuringActive: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '합류 완료 후 "측정 시작하기" 버튼 클릭으로 신호 스트리밍이 시작된 상태임. ' +
          'Footer의 `Live Data Link Active` 점이 에메랄드 색으로 변하고 중지 버튼이 노출됨.',
      },
    },
    msw: {
      handlers: [
        makePairingSuccessHandler('GROUP-MEASURE-01', 1, 'MOCK-TOKEN-M01'),
        makeSignalHandler(),
      ],
    },
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/join',
        search: '?code=MEASURE_SESSION_TOKEN_M01',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 1. 페어링 완료 후 SUBJECT 카드 대기함
    await canvas.findByText(/SUBJECT/i, {}, { timeout: 5000 });

    // 2. "측정 시작하기" 버튼을 클릭하여 측정 상태로 전환함
    const startButton = await canvas.findByText(/측정 시작하기/i, {}, { timeout: 3000 });
    await userEvent.click(startButton);

    // 3. 측정 중 상태에서 "측정 중지하기" 버튼이 노출되는지 검증함
    const stopButton = await canvas.findByText(/측정 중지하기/i, {}, { timeout: 3000 });
    await expect(stopButton).toBeInTheDocument();

    // 4. 신호 스트리밍 상태 표시 텍스트("Streaming Data...") 확인함
    const streamingLabel = await canvas.findByText(/Streaming Data/i, {}, { timeout: 3000 });
    await expect(streamingLabel).toBeInTheDocument();
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. ExpiredStatus — 세션 만료 에러 (EXPIRED)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * [State] 만료된 토큰으로 페어링 시도 시 서버가 HTTP 410 을 반환하는 상태임.
 *
 * `status === EXPIRED` 로 전환되어 에러 안내 카드와 "다시 시도하기" 버튼이 노출됨.
 * `use-pairing.ts` 에서 410/401 응답을 `EXPIRED` 로 매핑하는 로직을 커버함.
 */
export const ExpiredStatus: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'HTTP 410 응답을 수신하면 `usePairing` 이 상태를 `EXPIRED` 로 설정함. ' +
          '"세션이 만료되었거나 유효하지 않은 실험 정보임" 안내 문구와 "다시 시도하기" 버튼이 노출됨.',
      },
    },
    msw: {
      handlers: [
        http.post(/.*sessions.*pair.*/, () =>
          HttpResponse.json({ status: 'fail', message: 'Session expired' }, { status: 410 })
        ),
      ],
    },
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/join',
        search: '?code=EXPIRED_TOKEN_XYZ',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 에러 카드 내 만료 안내 문구가 노출될 때까지 대기함
    const expiredMessage = await canvas.findByText(
      /세션이 만료되었거나/i,
      {},
      { timeout: 5000 }
    );
    await expect(expiredMessage).toBeInTheDocument();

    // "다시 시도하기" 재시도 버튼이 에러 카드 하단에 함께 노출됨을 확인함
    const retryButton = await canvas.findByText(/다시 시도하기/i, {}, { timeout: 3000 });
    await expect(retryButton).toBeInTheDocument();
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 7. NetworkError — 서버 오류 (ERROR)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * [State] 서버가 HTTP 500 을 반환하여 `status === ERROR` 로 전환된 상태임.
 *
 * 410/401 이외의 HTTP 오류는 `use-pairing.ts` 에서 `ERROR` 로 분류되어
 * 네트워크 오류 안내 문구와 "다시 시도하기" 버튼이 노출됨.
 */
export const NetworkError: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'HTTP 500 응답 수신 시 `usePairing` 이 상태를 `ERROR` 로 설정함. ' +
          '"네트워크 또는 서버 오류가 발생함" 안내 문구와 재시도 버튼이 노출됨.',
      },
    },
    msw: {
      handlers: [
        http.post(/.*sessions.*pair.*/, () =>
          HttpResponse.json({ status: 'fail', message: 'Internal server error' }, { status: 500 })
        ),
      ],
    },
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/join',
        search: '?code=ERROR_TOKEN_500',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 서버 오류 안내 문구가 에러 카드에 노출되는지 확인함
    const errorMessage = await canvas.findByText(
      /네트워크 또는 서버 오류/i,
      {},
      { timeout: 5000 }
    );
    await expect(errorMessage).toBeInTheDocument();

    // 재시도 버튼 존재 여부를 함께 검증함
    const retryButton = await canvas.findByText(/다시 시도하기/i, {}, { timeout: 3000 });
    await expect(retryButton).toBeInTheDocument();
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 8. URLAutoJoin — URL ?code= 파라미터 자동 페어링 기능 문서화함
// ─────────────────────────────────────────────────────────────────────────────

/**
 * [Feature] URL `?code=` 파라미터 기반 자동 페어링 동작 방식을 시연하는 스토리임.
 *
 * ## 자동 합류 흐름
 * 1. 피실험자가 QR 코드를 카메라 앱으로 스캔 → 브라우저가 `/join?code=TOKEN` URL 을 오픈함
 * 2. `JoinPage` 는 마운트 직후 `useEffect` 에서 `searchParams.get('code')` 를 감지함
 * 3. `extractToken(rawCode)` 로 순수 토큰을 추출 후 `requestPairing(token)` 을 자동 호출함
 * 4. 사용자는 버튼을 직접 클릭하지 않아도 즉시 그룹에 합류됨
 *
 * 이 스토리는 QR 스캔 없이 URL 직접 접근 시나리오(딥링크, 공유 링크 등)에서도
 * 동일한 자동 합류 로직이 동작함을 보여줌.
 */
export const URLAutoJoin: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'QR 코드를 직접 스캔하지 않아도 `/join?code=TOKEN` URL 로 접근하면 ' +
          '페이지가 마운트되는 즉시 자동으로 페어링을 요청함. ' +
          '딥링크, 공유 링크, QR 앱 리디렉션 등 다양한 진입 경로를 지원함.',
      },
    },
    msw: {
      handlers: [
        makePairingSuccessHandler('GROUP-AUTO-01', 1, 'MOCK-TOKEN-AUTO'),
      ],
    },
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/join',
        search: '?code=AUTO_TOKEN_123',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // URL 파라미터 감지 → 자동 페어링 → PAIRED 상태 전환이 완료될 때까지 대기함
    await canvas.findByText(/SUBJECT/i, {}, { timeout: 5000 });

    // "Connection Verified" 뱃지가 표시되어 연결이 성공적으로 완료되었음을 확인함
    const verifiedBadge = await canvas.findByText(/Connection Verified/i, {}, { timeout: 3000 });
    await expect(verifiedBadge).toBeInTheDocument();

    // "측정 시작하기" 버튼이 노출되어 즉시 측정 가능한 상태임을 검증함
    const startButton = await canvas.findByText(/측정 시작하기/i, {}, { timeout: 3000 });
    await expect(startButton).toBeInTheDocument();
  },
};
