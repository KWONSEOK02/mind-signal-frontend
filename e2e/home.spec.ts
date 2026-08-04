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
    // 홈의 기본 CTA. 텍스트로 넓게 찾으면 nav 의 "실험실" 버튼까지 잡혀
    // 정작 CTA 가 사라져도 테스트가 통과함 — testid 로 그것만 지목함
    const ctaButton = page.getByTestId('home-cta-lab');
    await expect(ctaButton).toBeVisible();
  });
});
