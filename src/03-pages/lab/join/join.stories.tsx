import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import JoinPage from './join-page';

/**
 * [Story] 실험 참가자 조인 페이지의 시각적 사양 정의함
 */
const meta: Meta<typeof JoinPage> = {
  title: '03-pages/Lab/JoinPage',
  component: JoinPage,
  parameters: {
    // AGENTS 5.8: 모바일 접근성 확인 위해 풀스크린 레이아웃 사용함
    layout: 'fullscreen',
    viewport: { defaultViewport: 'mobile1' },
    // Next.js 라우팅 모킹 설정함
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/join',
        query: { code: 'TEST-SESSION-CODE' },
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof JoinPage>;

/**
 * 기본 조인 페이지 상태 정의함
 */
export const Default: Story = {};
