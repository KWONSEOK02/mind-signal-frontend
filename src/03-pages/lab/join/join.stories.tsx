import type { Meta, StoryObj } from '@storybook/react';
import JoinPage from './join-page';

const meta: Meta<typeof JoinPage> = {
  title: '03-pages/Lab/JoinPage',
  component: JoinPage,
  parameters: {
    // 모바일 환경 디자인 확인을 위해 레이아웃 설정함
    layout: 'fullscreen',
    viewport: { defaultViewport: 'mobile1' },
  },
};

export default meta;
type Story = StoryObj<typeof JoinPage>;

export const Default: Story = {};