import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { playwright } from '@vitest/browser-playwright';

/**
 * Vitest 및 Vite 환경 통합 설정 정의함
 */
export default defineConfig({
  plugins: [
    react(),
    // 프로젝트 경로 별칭(@) 인식을 위한 플러그인 사용함
    tsconfigPaths()
  ],
  /**
   * [오류 해결] 브라우저 환경에서 Node.js 전역 변수 모킹함
   * Next.js 및 Storybook 내부의 process.env 참조 에러 방지함
   */
  define: {
    'process.env': {},
  },
  test: {
    browser: {
      enabled: true,
      instances: [
        { browser: 'chromium' },
      ],
      provider: playwright(),
      headless: true,
    },
    globals: true,
    setupFiles: ['./.storybook/vitest.setup.ts'],
  },
  /**
   * AGENTS 1.3: 빌드 타임 최적화 및 워터폴 방지 설정함
   */
  optimizeDeps: {
    include: [
      'lucide-react',
      'next/navigation',
      'react-qr-barcode-scanner',
      'qrcode.react',
      'zod',
      'recharts',
      'axios',
      'react',
      'react-dom',
      'react/jsx-runtime',
      '@storybook/nextjs-vite',
      '@tanstack/react-query',
      'zustand'
    ],
    /**
     * 모듈 해석 오류 방지를 위해 특정 경로 제외함
     */
    exclude: [
      'sb-original/image-context',
      'next/dist/client/components/redirect-status-code'
    ]
  },
  resolve: {
    alias: {
      'sb-original/image-context': 'react'
    }
  }
});