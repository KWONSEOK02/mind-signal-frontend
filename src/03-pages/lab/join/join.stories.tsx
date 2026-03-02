import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import JoinPage from './join-page';

/**
 * [Story] 피실험자 관점의 그룹 합류 및 측정 대기 페이지 사양 정의함
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
  },
};

export default meta;
type Story = StoryObj<typeof JoinPage>;

/**
 * [State] 초기 실험 합류 대기 상태의 프리뷰임
 */
export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story: '피실험자가 앱에 접속하여 QR 스캔을 시작하기 전의 초기 화면임.',
      },
    },
  },
};

/**
 * [Interactive] QR 스캐너가 활성화된 상태의 인터랙션 시뮬레이션임
 */
export const ScannerOpen: Story = {
  play: async ({ canvasElement }) => {
    const joinButton = Array.from(
      canvasElement.querySelectorAll('button')
    ).find((btn) => btn.textContent?.includes('실험 합류하기'));
    if (joinButton) {
      joinButton.click();
    }
  },
};

/**
 * [State] 특정 그룹에 합류 완료(SUBJECT 01)된 상태의 레이아웃 사양임
 */
export const JoinedAsSubject: Story = {
  parameters: {
    docs: {
      description: {
        story: '페어링 성공 후 피실험자 번호와 측정 제어 위젯이 노출된 상태임.',
      },
    },
  },
};
