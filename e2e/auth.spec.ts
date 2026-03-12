import { test, expect } from '@playwright/test';

/**
 * 인증 모달 테스트
 * - 로그인/회원가입 폼 UI 및 유효성 검사 동작 확인
 * - 실제 API 호출 없이 UI 레이어만 검증
 */
test.describe('인증 모달', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/results');
  });

  test('로그인 버튼 클릭 시 인증 모달이 열린다', async ({ page }) => {
    const loginButton = page.locator('button').filter({ hasText: /로그인/i }).first();
    await loginButton.click();

    await expect(page.getByText('반갑습니다!')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test('모달 배경 클릭 시 모달이 닫힌다', async ({ page }) => {
    const loginButton = page.locator('button').filter({ hasText: /로그인/i }).first();
    await loginButton.click();

    await expect(page.getByText('반갑습니다!')).toBeVisible();

    // 배경(overlay) 클릭
    await page.locator('.fixed.inset-0.bg-slate-950\\/60').click();

    await expect(page.getByText('반갑습니다!')).not.toBeVisible();
  });

  test('회원가입 탭으로 전환하면 이름/비밀번호 확인 필드가 나타난다', async ({ page }) => {
    const loginButton = page.locator('button').filter({ hasText: /로그인/i }).first();
    await loginButton.click();

    // 회원가입 링크 클릭
    await page.getByText('회원가입').click();

    await expect(page.getByText('시작하기')).toBeVisible();
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="passwordConfirm"]')).toBeVisible();
  });

  test('비밀번호 불일치 시 에러 메시지가 표시된다', async ({ page }) => {
    const loginButton = page.locator('button').filter({ hasText: /로그인/i }).first();
    await loginButton.click();

    await page.getByText('회원가입').click();

    await page.locator('input[name="name"]').fill('테스트 유저');
    await page.locator('input[name="email"]').fill('test@example.com');
    await page.locator('input[name="password"]').fill('password123');
    await page.locator('input[name="passwordConfirm"]').fill('different456');

    await page.locator('button[type="submit"]').click();

    await expect(page.getByText('비밀번호가 일치하지 않습니다.')).toBeVisible();
  });

  test('이메일 미입력 시 제출이 막힌다', async ({ page }) => {
    const loginButton = page.locator('button').filter({ hasText: /로그인/i }).first();
    await loginButton.click();

    // 이메일 비워두고 비밀번호만 입력
    await page.locator('input[name="password"]').fill('password123');
    await page.locator('button[type="submit"]').click();

    // HTML5 required 유효성 검사 — 모달이 그대로 열려 있어야 함
    await expect(page.getByText('반갑습니다!')).toBeVisible();
  });

  test('외부 계정 로그인 버튼(구글, 카카오)이 표시된다', async ({ page }) => {
    const loginButton = page.locator('button').filter({ hasText: /로그인/i }).first();
    await loginButton.click();

    await expect(page.getByText('외부 계정으로 로그인하기')).toBeVisible();

    // 소셜 버튼 2개(Google, Kakao)
    const socialButtons = page.locator('.fixed button[type="button"]');
    await expect(socialButtons).toHaveCount(2);
  });
});
