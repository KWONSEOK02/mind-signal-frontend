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
 * [Interactive] QR 생성 후 닫기 버튼을 눌러 세션을 리셋하는 시나리오임
 * [Fix] TypeError 방지를 위해 expect 직접 임포트 제거함
 * vitest run 환경에서는 globals: true 설정에 의해 전역 expect 참조 수행함
 */
export const QRResetInteraction: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 1. QR 생성 버튼 노출 대기 및 클릭 수행함
    const createBtn = await canvas.findByText(/Subject 01 연결 QR 생성/i);
    await userEvent.click(createBtn);

    // 2. 닫기 버튼 노출 대기 및 클릭 수행함
    const closeBtn = await canvas.findByText(/닫기/i);
    await userEvent.click(closeBtn);

    /**
     * [Assertion] 전역 환경에서 제공되는 expect 객체 사용하여 상태 초기화 검증함
     * 스토리북 UI에서는 setup 파일의 shim이 동작하고, Vitest 실행 시에는 실제 매처가 동작함
     */
    const resetBtn = await canvas.findByText(/Subject 01 연결 QR 생성/i);
    await expect(resetBtn).toBeDefined();
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
              pairingToken: 'ABCDEF',
              expiresAt: new Date(Date.now() + 300000).toISOString(),
            },
          });
        }),
        // 세션 상태 확인 API에서 항상 '연결됨' 상태 반환하도록 모킹함
        http.get(/.*status.*/, () => {
          return HttpResponse.json({
            status: 'success',
            data: { guestJoined: true },
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

    // 2. 모킹된 API 응답을 통해 Subject 02 대기 화면으로 전환되는지 확인 수행함
    // 폴링(3초) 대기 시간을 넉넉히 고려하여 timeout을 10000ms로 증가함
    await canvas.findByText(
      /STEP 2: SUBJECT 02 WAITING/i,
      {},
      { timeout: 10000 }
    );

    // 3. 두 번째 연결까지 완료되어 최종적으로 '실험 시작' 버튼이 노출되는지 확인 수행함
    const startBtn = await canvas.findByRole(
      'button',
      { name: /실험 시작/i },
      { timeout: 10000 }
    );
    await expect(startBtn).toBeDefined();
  },
};
