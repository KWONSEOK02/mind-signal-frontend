import { test, expect } from '@playwright/test';

test.describe('챗봇 (ChatAssistant)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // 페이지 로드 대기
    await page.waitForLoadState('networkidle');
  });

  test('챗봇 버튼이 표시되고 클릭하면 채팅창이 열린다', async ({ page }) => {
    // 챗봇 FAB 버튼 (fixed 위치 div 내부의 버튼)
    const fab = page.locator('div.fixed button.rounded-full');
    await expect(fab).toBeVisible();

    await fab.click();
    await expect(page.locator('h3', { hasText: 'NEURO' })).toBeVisible();
    await expect(page.getByText('Project AI Concierge')).toBeVisible();
  });

  test('초기 인사 메시지가 표시된다', async ({ page }) => {
    await page.locator('div.fixed button.rounded-full').click();
    await expect(page.getByText('안녕하세요! 뉴로입니다.')).toBeVisible();
  });

  test('메시지를 입력하고 전송하면 응답이 표시된다', async ({ page }) => {
    // 챗봇 열기
    await page.locator('div.fixed button.rounded-full').click();
    await expect(page.getByText('안녕하세요! 뉴로입니다.')).toBeVisible();

    // "소개" 입력 → level 1 키워드 매칭 → URL 응답
    const input = page.getByPlaceholder('무엇이든 물어보세요...');
    await input.fill('소개');
    await input.press('Enter');

    // 봇 응답 대기 (level 1: 링크 안내)
    await expect(page.getByText('관련 사이트를 안내해 드립니다.')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('a[href*="intro"]')).toBeVisible();
  });

  test('level 3 응답 시 문의하기 폼이 표시된다', async ({ page }) => {
    await page.locator('div.fixed button.rounded-full').click();
    await expect(page.getByText('안녕하세요! 뉴로입니다.')).toBeVisible();

    // 매칭 안 되는 메시지 → level 3
    const input = page.getByPlaceholder('무엇이든 물어보세요...');
    await input.fill('asdfghjkl');
    await input.press('Enter');

    // 문의하기 폼 표시 대기
    await expect(page.getByText('담당자에게 문의하기')).toBeVisible({ timeout: 10000 });
    await expect(page.getByPlaceholder('이메일 주소')).toBeVisible();
    await expect(page.getByPlaceholder('문의 내용을 입력하세요')).toBeVisible();
    await expect(page.getByText('문의 보내기')).toBeVisible();
  });

  test('문의하기 폼에 이메일/내용 미입력 시 버튼이 비활성화된다', async ({ page }) => {
    await page.locator('div.fixed button.rounded-full').click();
    await expect(page.getByText('안녕하세요! 뉴로입니다.')).toBeVisible();

    const input = page.getByPlaceholder('무엇이든 물어보세요...');
    await input.fill('asdfghjkl');
    await input.press('Enter');

    await expect(page.getByText('담당자에게 문의하기')).toBeVisible({ timeout: 10000 });

    // 둘 다 비어있으면 비활성화
    const submitBtn = page.getByRole('button', { name: '문의 보내기' });
    await expect(submitBtn).toBeDisabled();

    // 이메일만 입력 → 여전히 비활성화
    await page.getByPlaceholder('이메일 주소').fill('test@test.com');
    await expect(submitBtn).toBeDisabled();

    // 내용도 입력 → 활성화
    await page.getByPlaceholder('문의 내용을 입력하세요').fill('테스트 문의');
    await expect(submitBtn).toBeEnabled();
  });

  test('채팅창 닫기 버튼이 동작한다', async ({ page }) => {
    await page.locator('div.fixed button.rounded-full').click();
    await expect(page.locator('h3', { hasText: 'NEURO' })).toBeVisible();

    // X 버튼 클릭 (채팅 헤더 내 닫기 버튼)
    await page.locator('div.fixed button.rounded-full').first().click();

    await expect(page.locator('h3', { hasText: 'NEURO' })).not.toBeVisible();
  });
});
