import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import LabPage from './lab-page';

const meta: Meta<typeof LabPage> = {
  title: '03-pages/Lab/LabPage',
  component: LabPage,
  parameters: {
    // 관제 센터 UI 확인을 위해 전체 화면으로 렌더링함
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof LabPage>;

export const Default: Story = {};
