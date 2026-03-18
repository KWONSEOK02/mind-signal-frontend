import { test, expect } from '@playwright/test';

test.describe('홈 페이지', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('페이지 타이틀과 핵심 텍스트가 표시된다', async ({ page }) => {
    await expect(page).toHaveTitle(/Mind Signal|뇌파/i);
    await expect(page.getByText('뇌파')).toBeVisible();
    await expect(page.getByText('시그널')).toBeVisible();
  });

  test('졸업 프로젝트 배지가 표시된다', async ({ page }) => {
    await expect(
      page.getByText(/상명대학교.*휴먼AI공학전공.*팀 휴로/i)
    ).toBeVisible();
  });

  test('실험 시작 버튼이 존재한다', async ({ page }) => {
    // 홈에서 lab 혹은 실험 시작으로 이동하는 버튼
    const ctaButton = page.locator('button, a').filter({ hasText: /실험|시작|lab/i }).first();
    await expect(ctaButton).toBeVisible();
  });
});
