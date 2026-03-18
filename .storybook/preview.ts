import type { Preview } from '@storybook/nextjs-vite';
import { initialize, mswLoader } from 'msw-storybook-addon';
// Tailwind CSS 및 전역 스타일 적용을 위해 globals.css 임포트함
import '../src/app/globals.css';

// MSW 환경 초기화 수행함 (onUnhandledRequest 설정으로 모킹되지 않은 요청 경고 무시함)
initialize({
  onUnhandledRequest: 'bypass',
});

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
  // MSW 로더를 전역에 등록하여 각 스토리의 parameters.msw 설정을 활성화함
  loaders: [mswLoader],
};

export default preview;