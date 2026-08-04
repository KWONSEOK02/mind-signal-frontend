import { test, expect } from '@playwright/test';

test.describe('홈 페이지', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('페이지 타이틀과 핵심 텍스트가 표시된다', async ({ page }) => {
    await expect(page).toHaveTitle(/Mind Signal|뇌파/i);
    // 히어로의 큰 타이틀을 특정함. exact 없이 부분 매치하면 nav 와 footer 의
    // "뇌파 시그널" 과 본문 문장까지 5개가 잡혀 strict mode 위반이 남
    await expect(page.getByText('뇌파', { exact: true })).toBeVisible();
    await expect(page.getByText('시그널', { exact: true })).toBeVisible();
  });

  test('졸업 프로젝트 배지가 표시된다', async ({ page }) => {
    await expect(
      page.getByText(/상명대학교.*휴먼AI공학전공.*팀 휴로/i)
    ).toBeVisible();
  });

  test('실험 시작 버튼이 존재한다', async ({ page }) => {
    // 홈에서 lab 혹은 실험 시작으로 이동하는 버튼.
    // visible 필터가 없으면 모바일 뷰포트에서 접힌 nav 의 "실험실" 버튼을
    // 잡아 보이지 않는 요소를 기다리다 실패함
    const ctaButton = page
      .locator('button, a')
      .filter({ hasText: /실험|시작|lab/i, visible: true })
      .first();
    await expect(ctaButton).toBeVisible();
  });
});
