/**
 * Admin Force-Pair E2E — 5-tap dev mode + admin force-pair modal happy + 404 path
 *
 * - viewport: 데스크탑 1280x720 + UA 강제 (mobile project 실행 시에도 desktop 분기 유지)
 * - JWT seed: localStorage.setItem('token', 'TEST-JWT') + Bearer header assert
 * - mocks: POST /api/sessions + GET /api/sessions/group/:gid/status 폴링 + POST /api/sessions/:token/admin-pair
 *
 * @see .plans/_archive/legacy/K-dev-mode-force-pair/PLAN.md §8-2 (rev.4)
 */

import { test, expect, type Page, type Route } from '@playwright/test';

const DESKTOP_VIEWPORT = { width: 1280, height: 720 };
const DESKTOP_UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

test.use({ viewport: DESKTOP_VIEWPORT, userAgent: DESKTOP_UA });

/**
 * JWT seed + 3 mock 라우트 등록 수행함.
 *
 * @param page - Playwright Page
 * @param adminPairResponder - POST /api/sessions/:token/admin-pair 응답 핸들러
 */
async function seedAuthAndMocks(
  page: Page,
  adminPairResponder: (route: Route) => Promise<void> | void
): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem('token', 'TEST-JWT');
  });

  // ui-context의 getMe 호출 → BE 미가동 시 token 제거됨. 인증 통과 mock 처리함
  await page.route('**/user/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: { name: '테스트 관리자', email: 'gwonseok02@gmail.com' },
      }),
    });
  });

  await page.route('**/api/sessions', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          id: 'sess-1',
          pairingToken: 'TEST-TOKEN-1',
          groupId: 'gid-1',
          subjectIndex: 1,
        },
      }),
    });
  });

  await page.route('**/api/sessions/group/gid-1/status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          groupId: 'gid-1',
          sessions: [
            { subjectIndex: 1, status: 'CREATED', guestJoined: false },
          ],
        },
      }),
    });
  });

  await page.route(
    '**/api/sessions/TEST-TOKEN-1/admin-pair',
    adminPairResponder
  );
}

/**
 * Operator Dashboard 라벨 div 5회 탭으로 dev mode 진입함.
 */
async function fiveTapDevModeTrigger(page: Page): Promise<void> {
  const target = page.locator('[data-testid="dev-mode-tap-target"]');
  await target.waitFor({ state: 'visible' });
  for (let i = 0; i < 5; i += 1) {
    await target.click({ force: true });
  }
}

test.describe('Admin Force-Pair — Happy Path (1280x720 desktop)', () => {
  test('5-tap dev mode → email submit → 200 → modal close', async ({
    page,
  }) => {
    const adminPairRequests: { authHeader?: string; body?: unknown }[] = [];

    await seedAuthAndMocks(page, async (route) => {
      const request = route.request();
      const allHeaders = await request.allHeaders();
      adminPairRequests.push({
        authHeader: allHeaders['authorization'],
        body: request.postDataJSON(),
      });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: { id: 'sess-1' },
        }),
      });
    });

    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/lab');
    await page.waitForLoadState('networkidle');

    // Operator Dashboard 라벨 표시 확인 (데스크탑 분기 진입)
    await expect(
      page.locator('[data-testid="dev-mode-tap-target"]')
    ).toBeVisible({ timeout: 15000 });

    // Subject 01 QR 생성 → pairingCode = TEST-TOKEN-1 확정
    await page
      .getByRole('button', { name: /Subject 01 연결 QR 생성/ })
      .click();

    // 5-tap dev mode 진입
    await fiveTapDevModeTrigger(page);

    const dialog = page.getByRole('dialog', { name: 'Admin dev mode' });
    await expect(dialog).toBeVisible();

    await page.fill('input[name="email"]', 'gwonseok02@gmail.com');
    await page.getByRole('button', { name: '강제 페어링' }).click();

    await expect(dialog).toBeHidden();

    expect(adminPairRequests).toHaveLength(1);
    expect(adminPairRequests[0].authHeader).toBe('Bearer TEST-JWT');
    expect(adminPairRequests[0].body).toEqual({
      email: 'gwonseok02@gmail.com',
    });

    expect(consoleErrors).toEqual([]);
  });
});

test.describe('Admin Force-Pair — Error Path 404 (1280x720 desktop)', () => {
  test('404 응답 시 한국어 inline + modal 유지', async ({ page }) => {
    await seedAuthAndMocks(page, async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'fail',
          message: '대상 사용자를 찾을 수 없습니다.',
        }),
      });
    });

    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/lab');
    await page.waitForLoadState('networkidle');
    await expect(
      page.locator('[data-testid="dev-mode-tap-target"]')
    ).toBeVisible({ timeout: 15000 });

    await page
      .getByRole('button', { name: /Subject 01 연결 QR 생성/ })
      .click();

    await fiveTapDevModeTrigger(page);

    const dialog = page.getByRole('dialog', { name: 'Admin dev mode' });
    await expect(dialog).toBeVisible();

    await page.fill('input[name="email"]', 'nonexistent@test.com');
    await page.getByRole('button', { name: '강제 페어링' }).click();

    // Next.js `__next-route-announcer__`도 role="alert" 보유 — 모달 alert만 필터링함
    const alert = page
      .getByRole('alert')
      .filter({ hasText: '대상 사용자 또는 토큰' });
    await expect(alert).toBeVisible();
    await expect(dialog).toBeVisible();
    expect(
      await page.locator('input[name="email"]').inputValue()
    ).toBe('nonexistent@test.com');

    // 404 응답 fetch 자체에서 brower가 발생시키는 resource error는 의도된 mock 응답이므로 필터링함
    const unexpectedErrors = consoleErrors.filter(
      (msg) => !msg.includes('Failed to load resource')
    );
    expect(unexpectedErrors).toEqual([]);
  });
});
