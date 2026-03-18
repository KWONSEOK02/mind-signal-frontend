import { test, expect } from '@playwright/test';

/**
 * /results 페이지 테스트
 * - 동조율 점수 및 레포트 UI 확인
 * - 비로그인 상태의 잠금 UI 확인
 * - 공유/다운로드 버튼 동작 확인
 */
test.describe('/results 페이지', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/results');
  });

  test('뇌파 동조율 점수가 표시된다', async ({ page }) => {
    // 하드코딩된 점수 88.4% 확인
    await expect(page.getByText(/88\.4/)).toBeVisible();
  });

  test('동조율 레벨 설명 목록이 표시된다', async ({ page }) => {
    await expect(page.getByText('이심전심 소울메이트')).toBeVisible();
    await expect(page.getByText('환상의 티키타카')).toBeVisible();
    await expect(page.getByText('서먹서먹한 사이')).toBeVisible();
  });

  test('비로그인 상태에서 잠금 UI가 표시된다', async ({ page }) => {
    // 로컬스토리지에 토큰 없는 상태로 접근
    await page.evaluate(() => localStorage.removeItem('token'));
    await page.reload();

    // 잠금 아이콘 또는 로그인 유도 메시지 확인
    await expect(
      page.locator('button').filter({ hasText: /로그인/i })
    ).toBeVisible();
  });

  test('공유하기 버튼이 존재한다', async ({ page }) => {
    await expect(
      page.locator('button').filter({ hasText: /공유/i })
    ).toBeVisible();
  });

  test('결과 저장(다운로드) 버튼이 존재한다', async ({ page }) => {
    await expect(
      page.locator('button').filter({ hasText: /저장|다운로드/i })
    ).toBeVisible();
  });
});
