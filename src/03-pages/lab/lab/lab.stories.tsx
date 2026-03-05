<<<<<<< HEAD
import type { Meta, StoryObj } from '@storybook/react';
import { within } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import LabPage from './lab-page';
import { expect } from 'storybook/test';

/**
 * [Story] 운영자 관점의 그룹 기반 실험 대시보드 사양 정의함
 */
=======
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import LabPage from './lab-page';

>>>>>>> main
const meta: Meta<typeof LabPage> = {
  title: '03-pages/Lab/LabPage',
  component: LabPage,
  parameters: {
<<<<<<< HEAD
    layout: 'fullscreen',
    nextjs: {
      appDirectory: true,
    },
=======
    // 관제 센터 UI 확인을 위해 전체 화면으로 렌더링함
    layout: 'fullscreen',
>>>>>>> main
  },
};

export default meta;
type Story = StoryObj<typeof LabPage>;

export const Default: Story = {};
<<<<<<< HEAD

/**
 * [Interactive] QR 생성 후 닫기 버튼을 눌러 세션을 리셋하는 시나리오임
 * [Fix] TypeError 방지를 위해 expect 직접 임포트 제거함
 * vitest run 환경에서는 globals: true 설정에 의해 전역 expect 참조 수행함
 */
export const QRResetInteraction: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 1. QR 생성 버튼 클릭 수행함
    const createBtn = await canvas.getByText(/Subject 01 연결 QR 생성/i);
    await userEvent.click(createBtn);

    // 2. 닫기 버튼 노출 및 클릭 수행함
    const closeBtn = await canvas.getByText(/닫기/i);
    await userEvent.click(closeBtn);

    /**
     * [Assertion] 전역 환경에서 제공되는 expect 객체 사용하여 상태 초기화 검증함
     * 스토리북 UI에서는 setup 파일의 shim이 동작하고, Vitest 실행 시에는 실제 매처가 동작함
     */
    await expect(canvas.getByText(/Subject 01 연결 QR 생성/i)).toBeDefined();
  },
};
=======
>>>>>>> main
