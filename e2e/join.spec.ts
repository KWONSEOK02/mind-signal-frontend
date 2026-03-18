import { test, expect } from '@playwright/test';

/**
 * /join 페이지 테스트
 * - QR 스캔 버튼 UI 확인
 * - 에러 상태 UI 확인
 * - URL 파라미터 기반 자동 페어링 동작 확인
 */
test.describe('/join 페이지', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/join');
  });

  test('페이지 제목과 안내 문구가 표시된다', async ({ page }) => {
    await expect(page.getByText('Join')).toBeVisible();
    await expect(page.getByText('Experiment')).toBeVisible();
    await expect(
      page.getByText(/QR 코드를 스캔하여/i)
    ).toBeVisible();
  });

  test('QR 스캔 버튼이 표시된다', async ({ page }) => {
    await expect(page.getByText('실험 합류하기 (QR 스캔)')).toBeVisible();
  });

  test('QR 스캔 버튼 클릭 시 스캐너 UI가 열린다', async ({ page }) => {
    await page.getByText('실험 합류하기 (QR 스캔)').click();

    // 스캐너가 열리면 QR 스캔 버튼은 사라져야 함
    await expect(page.getByText('실험 합류하기 (QR 스캔)')).not.toBeVisible();
  });

  test('유효하지 않은 code 파라미터로 접근 시 에러 상태가 표시된다', async ({ page }) => {
    await page.goto('/join?code=invalid-token-xyz');

    // 에러 또는 만료 상태 UI 대기 (API 응답 후)
    await expect(
      page.getByText(/세션이 만료되었거나|네트워크 또는 서버 오류/i)
    ).toBeVisible({ timeout: 10000 });

    // 재시도 버튼도 표시되어야 함
    await expect(page.getByText('다시 시도하기')).toBeVisible();
  });

  test('다시 시도하기 버튼 클릭 시 초기 상태로 돌아간다', async ({ page }) => {
    await page.goto('/join?code=invalid-token-xyz');

    await expect(
      page.getByText(/세션이 만료되었거나|네트워크 또는 서버 오류/i)
    ).toBeVisible({ timeout: 10000 });

    await page.getByText('다시 시도하기').click();

    // 초기 상태: QR 스캔 버튼이 다시 나타나야 함
    await expect(page.getByText('실험 합류하기 (QR 스캔)')).toBeVisible();
  });

  test('하단 Live Data Link 상태 표시가 존재한다', async ({ page }) => {
    await expect(page.getByText('Live Data Link Active')).toBeVisible();
  });
});
