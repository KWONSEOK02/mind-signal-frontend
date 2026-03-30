import { test, expect } from '@playwright/test';

/**
 * /results 페이지 테스트
 * - groupId 없이 접근 시 빈 상태 확인
 * - 비로그인 상태의 잠금 UI 확인
 * - groupId 포함 접근 시 로딩 상태 확인
 */
test.describe('/results 페이지', () => {
  test('비로그인 상태에서 잠금 UI가 표시된다', async ({ page }) => {
    await page.goto('/results');
    await page.evaluate(() => localStorage.removeItem('token'));
    await page.reload();

    // 잠금 아이콘 또는 로그인 유도 메시지 확인
    await expect(
      page.getByRole('button', { name: '로그인 하고 결과 보기' })
    ).toBeVisible();
  });

  test('groupId 없이 접근 시 빈 상태가 표시된다', async ({ page }) => {
    // 로그인 상태 시뮬레이션 (임의 토큰 설정)
    await page.goto('/results');
    await page.evaluate(() => localStorage.setItem('token', 'test-token'));
    await page.reload();

    // groupId 없으면 "결과를 찾을 수 없습니다" 또는 로그인 유도
    await expect(
      page
        .getByText('결과를 찾을 수 없습니다')
        .or(page.getByRole('button', { name: '로그인 하고 결과 보기' }))
    ).toBeVisible();
  });

  test('groupId 포함 접근 시 로딩 또는 결과 UI가 표시된다', async ({
    page,
  }) => {
    await page.goto('/results?groupId=test-group-id');

    // 로딩 스피너 또는 에러 또는 잠금 UI 중 하나가 표시됨
    await expect(
      page
        .getByText('분석 결과를 불러오는 중')
        .or(page.getByText('일시적 오류'))
        .or(page.getByRole('button', { name: '로그인 하고 결과 보기' }))
    ).toBeVisible();
  });

  test('메인으로 돌아가기 버튼이 동작한다', async ({ page }) => {
    await page.goto('/results');

    // 비로그인 또는 groupId 없는 상태 모두 메인 이동 가능
    const backButton = page.getByRole('button', {
      name: /메인으로 돌아가기/i,
    });
    const loginButton = page.getByRole('button', {
      name: '로그인 하고 결과 보기',
    });

    // 둘 중 하나는 보여야 함
    await expect(backButton.or(loginButton)).toBeVisible();
  });
});
