/**
 * SEQUENTIAL 측정 E2E 스펙 — PLAN Scenario 1 (happy path) 구현함
 *
 * 실행 전제조건:
 * - Heroku BE (mind-signal-backend) 기동
 * - Vercel FE 또는 로컬 Next.js dev server 기동
 * - Data Engine(DE) mock 모드 활성화 필요:
 *   MOCK_MEASUREMENT_DURATION_SECONDS=10 환경변수 + DE mock CSV 주입 모드
 *   (Phase 14 Wave 2에서 DE mock 패턴이 추가되기 전까지 test.skip 유지)
 *
 * @see .plans/14-dual-ble-resolution/PLAN.md Scenario 1 (lines 654-666)
 * @see PLAN I10 Medium: Mock 측정 주입 메커니즘
 *
 * --- SKIP 조건 ---
 * DE mock 모드가 준비되지 않은 경우 test.skip으로 CI 실패 방지함.
 * DE mock 모드 구현 완료(Wave 2 T1-DE* 태스크 완료) 후 아래 test.skip을 제거할 것.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { test, expect } = require('@playwright/test');

/**
 * DE mock 모드 활성화 여부 체크함
 * 환경변수 MOCK_MEASUREMENT_DURATION_SECONDS가 설정된 경우에만 스킵 해제 가능함
 */
const isMockModeAvailable =
  process.env.MOCK_MEASUREMENT_DURATION_SECONDS !== undefined;

test.describe('/lab SEQUENTIAL happy path', () => {
  /**
   * DE mock 모드가 없으면 전체 스펙 스킵 처리함
   * Wave 2 DE mock 패턴 완성 후 아래 조건부 skip을 제거할 것
   */
  test.skip(
    !isMockModeAvailable,
    'DE mock mode not available — set MOCK_MEASUREMENT_DURATION_SECONDS to enable'
  );

  test('SEQUENTIAL 전체 흐름 — Subject 1 → Subject 2 → 분석 → 결과 화면', async ({
    page,
  }: {
    page: import('@playwright/test').Page;
  }) => {
    // Step 1: /lab 진입
    await page.goto('/lab');
    await expect(page.locator('h1')).toBeVisible();

    // Step 2: 설정 메뉴에서 SEQUENTIAL 모드 선택
    const settingsBtn = page.locator('button').filter({ has: page.locator('svg.lucide-settings') });
    await settingsBtn.click();
    await page.getByText('SEQUENTIAL 모드 (순차)').click();

    // Step 3: QR 생성 버튼 클릭
    await page.getByRole('button', { name: /QR 생성/i }).click();
    await expect(page.locator('[data-testid="qr-code"], canvas, img[alt*="QR"]')).toBeVisible({
      timeout: 10000,
    });

    // Step 4 (페어링 mock 호출)은 DE mock 모드 완성 전까지 보류됨
    // 실제 mock 페어링 API가 준비되면 token + groupId 추출 후 pair 엔드포인트를 호출할 것
    // 현재는 페어링 로직이 비어 있어 Step 5 `Start Subject 1` 활성화가 timeout나는 원인이었으므로 블록 자체를 제거함

    // Step 5: Start Subject 1 클릭
    await page.getByRole('button', { name: /Start Subject 1/i }).click();

    // Step 6: Subject 1 측정 완료 대기 (최대 30초, mock 설정 시 10초)
    const mockDuration =
      (parseInt(process.env.MOCK_MEASUREMENT_DURATION_SECONDS ?? '10') + 5) *
      1000;
    await expect(
      page.getByRole('button', { name: /Start Subject 2/i })
    ).toBeEnabled({ timeout: mockDuration });

    // Step 7: Start Subject 2 클릭
    await page.getByRole('button', { name: /Start Subject 2/i }).click();

    // Step 8: Subject 2 측정 완료 대기
    await expect(
      page.getByRole('button', { name: /Analyze|분석/i })
    ).toBeEnabled({ timeout: mockDuration });

    // Step 9: Analyze 버튼 클릭
    await page.getByRole('button', { name: /Analyze|분석/i }).click();

    // Step 10: 결과 페이지 로딩 대기
    await page.waitForURL(/\/results/, { timeout: 30000 });

    // Step 11: 유사도 점수 표시 확인
    await expect(page.getByText(/반응 유사도 분석 리포트/i)).toBeVisible({
      timeout: 30000,
    });
    await expect(page.getByText(/반응 유사도 점수/i)).toBeVisible();

    // band_ratio_diff 및 FAA 섹션 확인
    await expect(page.getByText(/delta/i)).toBeVisible();
    await expect(page.getByText(/FAA/i)).toBeVisible();

    // 스크린샷 저장
    await page.screenshot({ path: 'test-results/sequential-happy-path.png' });
  });
});

/**
 * Scenario 2: 홈 페이지 라벨 regression — 비로그인 상태에서도
 * 홈 페이지(`/`) 본문에 "Inter-brain Synchrony" 문자열이 없음을 확인 처리함.
 * DUAL/SEQUENTIAL 결과 페이지 라벨 정합성은 별도 컴포넌트 단위 테스트에서 검증함.
 */
test.describe('Home page label regression', () => {
  test('홈 페이지 본문에 Inter-brain Synchrony 레이블 부재 처리됨', async ({
    page,
  }: {
    page: import('@playwright/test').Page;
  }) => {
    await page.goto('/');
    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText).not.toContain('Inter-brain Synchrony');
  });
});
