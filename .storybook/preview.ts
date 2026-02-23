import type { Preview } from '@storybook/nextjs-vite';
// Tailwind CSS 및 전역 스타일 적용을 위해 globals.css 임포트함
import '../src/app/globals.css';

const preview: Preview = {
  parameters: {
    // Next.js App Router 환경 설정을 추가함
    nextjs: {
      appDirectory: true,
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      // 'todo' - UI에서 접근성 위반 사항만 표시함
      test: 'todo',
    },
  },
};

export default preview;