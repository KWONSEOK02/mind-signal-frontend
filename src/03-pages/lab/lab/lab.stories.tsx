import type { Meta, StoryObj } from '@storybook/react';
import { within } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import LabPage from './lab-page';
import { expect } from 'storybook/test';
import { http, HttpResponse } from 'msw';

/**
 * [Story] 운영자 관점의 그룹 기반 실험 대시보드 사양 정의함
 */
const meta: Meta<typeof LabPage> = {
  title: '03-pages/Lab/LabPage',
  component: LabPage,
  parameters: {
    layout: 'fullscreen',
    nextjs: {
      appDirectory: true,
    },
  },
};

export default meta;
type Story = StoryObj<typeof LabPage>;

export const Default: Story = {};

/**
 * [Interactive] BTI 모드 (1인) 화면 렌더링 확인용 스토리 추가함
 * play 함수를 통해 진입 시 톱니바퀴 메뉴를 열어 모드를 전환하도록 자동화함
 */
export const BtiMode: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 1. 설정(톱니바퀴) 버튼을 찾아 클릭하여 드롭다운 활성화함
    const allButtons = canvas.getAllByRole('button');
    const settingsBtn = allButtons.find((btn: HTMLElement) =>
      btn.querySelector('svg.lucide-settings')
    );
    if (settingsBtn) {
      await userEvent.click(settingsBtn);
    }

    // 2. 드롭다운 내 BTI 모드 (1인) 버튼을 클릭하여 모드 전환함
    const btiModeBtn = await canvas.findByText(/BTI 모드 \(1인\)/i);
    await userEvent.click(btiModeBtn);

    // 3. UI가 BTI 모드(1인 전용)로 변경되었는지 단언함
    await expect(canvas.getByText(/Brain-Targeted/i)).toBeInTheDocument();
  },
};

/**
 * [Interactive] QR 생성 후 모드 변경을 통해 세션을 리셋하는 시나리오임
 * 기존 톱니바퀴 단일 클릭에서 '메뉴 열기 -> 모드 재선택'으로 로직 동기화함
 */
export const QRResetInteraction: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 1. QR 생성 버튼 노출 대기 및 클릭 수행함
    const createBtn = await canvas.findByText(/Subject 01 연결 QR 생성/i);
    await userEvent.click(createBtn);

    // 2. QR 닫기 버튼으로 1차 닫기 검증 (직접 닫기)
    const closeBtn = await canvas.findByText(/닫기/i);
    await userEvent.click(closeBtn);

    // 3. 다시 QR 열기 수행함
    await userEvent.click(await canvas.findByText(/Subject 01 연결 QR 생성/i));

    // 4. 설정(톱니) 버튼 식별하여 클릭 수행함 (드롭다운 활성화)
    const allButtons = canvas.getAllByRole('button');
    const settingsBtn = allButtons.find((btn: HTMLElement) =>
      btn.querySelector('svg.lucide-settings')
    );
    if (settingsBtn) {
      await userEvent.click(settingsBtn);
    }

    // 5. 드롭다운 내 DUAL 모드 재선택하여 초기화 유도함
    const dualModeBtn = await canvas.findByText(/DUAL 모드 \(2인\)/i);
    await userEvent.click(dualModeBtn);

    // 6. 모드 변경 로직에 의해 QR 대기 화면이 사라지고 초기 버튼으로 복구되었는지 확인함
    await expect(
      canvas.getByText(/Subject 01 연결 QR 생성/i)
    ).toBeInTheDocument();
  },
};

/**
 * [State] 두 명의 피실험자가 모두 연결되어 실험 시작이 가능한 상태의 스토리 추가함
 * MSW(Mock Service Worker)를 통해 세션 상태 API 응답을 모킹하여 UI 상태 전이 구현함
 */
export const ExperimentReady: Story = {
  parameters: {
    msw: {
      handlers: [
        // 실제 API 경로가 다를 수 있으므로 정규표현식(RegExp)을 사용하여 부분 일치하도록 모킹함
        http.post(/.*pairing.*/, () => {
          return HttpResponse.json({
            status: 'success',
            data: {
              groupId: 'TEST_GROUP',
              subjectIndex: 1, // 테스트 환경 호환을 위한 임의 인덱스 할당함
              pairingToken: 'ABCDEF',
              expiresAt: new Date(Date.now() + 300000).toISOString(),
            },
          });
        }),
        // 세션 상태 확인 API에서 모두 연결된 배열을 반환하도록 모킹함
        http.get(/.*status.*/, () => {
          return HttpResponse.json({
            status: 'success',
            data: {
              groupId: 'TEST_GROUP',
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

    // 1. 초기 QR 생성 버튼 클릭하여 페어링 흐름 시작 수행함
    const createBtn = await canvas.findByText(/Subject 01 연결 QR 생성/i);
    await userEvent.click(createBtn);

    // 2. 모킹된 API 응답을 통해 최종 실험 시작 버튼이 노출되는지 검증함
    // 폴링 주기 및 상태 갱신을 위해 넉넉한 시간 부여함
    const startBtn = await canvas.findByRole(
      'button',
      { name: /실험 시작/i },
      { timeout: 5000 }
    );

    await expect(startBtn).toBeInTheDocument();
  },
};
