import type { Meta, StoryObj } from '@storybook/react';
import MobileLabView from './mobile-lab-view';

/**
 * [Story] 모바일 기기 접속 시 노출되는 실험 참여 유도 화면 사양 정의함
 */
const meta: Meta<typeof MobileLabView> = {
  title: '03-pages/Lab/UI/MobileLabView',
  component: MobileLabView,
  parameters: {
    layout: 'fullscreen',
    // 모바일 전용 뷰 확인을 위해 기본 뷰포트 고정 수행함
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};

export default meta;
type Story = StoryObj<typeof MobileLabView>;

/**
 * [State] 기본 모바일 참여 안내 화면 프리뷰임
 */
export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '모바일 환경에서 실험실 페이지 접속 시 최초로 노출되는 참여 유도 화면임.',
      },
    },
  },
};
