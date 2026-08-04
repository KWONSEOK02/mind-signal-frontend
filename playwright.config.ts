import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // webServer 가 next dev 라 라우트를 온디맨드 컴파일함. 워커를 코어 수만큼
  // 풀면 수십 개 컨텍스트가 한 dev 서버를 동시에 때려 첫 요청이 30초 기본
  // 타임아웃을 넘김. 개별 실행은 통과하는데 전체 실행만 무더기로 깨지던
  // 원인이 이것이었음 (2026-08-04 실측)
  workers: 4,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'] },
    },
  ],
  webServer: {
    command: 'next dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
