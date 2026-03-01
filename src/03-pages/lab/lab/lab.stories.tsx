import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import LabPage from './lab-page';

/**
 * [Story] 세션 생성 기능이 포함된 대시보드 사양 정의함
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

/**
 * 기본 대시보드 상태이며 사용자가 직접 버튼을 클릭하여 테스트함
 */
export const Default: Story = {};

/**
 * [Interactive] 세션 생성 영역이 활성화된 상태의 프리뷰임
 */
export const QRVisible: Story = {
  play: async ({ canvasElement }) => {
    // Storybook 로드 시 자동으로 세션 생성 버튼 클릭하도록 설정함
    const button = canvasElement.querySelector('button');
    if (button && button.textContent?.includes('세션 생성')) {
      button.click();
    }
  },
};
