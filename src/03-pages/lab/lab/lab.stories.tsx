import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import LabPage from './lab-page';

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

/**
 * [State] 초기 대기 상태의 대시보드 프리뷰임
 */
export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story: '실험 시작 전, 피실험자 연결을 기다리는 초기 화면임.',
      },
    },
  },
};

/**
 * [Interactive] 첫 번째 피실험자용 QR 코드가 활성화된 상태임
 */
export const Subject1Pairing: Story = {
  play: async ({ canvasElement }) => {
    // 순차적 페어링 버튼을 찾아 클릭 인터랙션 수행함
    const button = Array.from(canvasElement.querySelectorAll('button')).find(
      (btn) => btn.textContent?.includes('Subject 01 연결 QR 생성')
    );

    if (button) {
      button.click();
    }
  },
};

/**
 * [State] 모든 피실험자가 합류하여 실험 준비가 완료된 상태임
 */
export const AllSubjectsReady: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '두 명의 피실험자가 모두 연결되어 실험 시작 버튼이 활성화된 상태임.',
      },
    },
  },
};
