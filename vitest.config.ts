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
    tsconfigPaths()
  ],
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
  ssr: {
    noExternal: [
      '@storybook/nextjs-vite'
    ]
  },
  optimizeDeps: {
    include: [
      'lucide-react',
      'react-qr-barcode-scanner',
      'html5-qrcode',
      'qrcode.react',
      'zod',
      'recharts',
      'axios',
      'react',
      'react-dom',
      'react/jsx-runtime',
      '@tanstack/react-query',
      'zustand',
      // [Fix] 테스트 실행 시 재번들링 경고 방지를 위해 추가함
      '@storybook/react'
    ],
    exclude: [
      'sb-original/image-context',
      'next/navigation',
      '@storybook/nextjs-vite',
      'playwright-core',
      'chromium-bidi'
    ]
  },
  resolve: {
    alias: {
      'sb-original/image-context': 'react'
    }
  }
});