// UI-W001 before/after 스크린샷 캡처.
// 사용: node scripts/capture-ui-shots.mjs before   (또는 after)
// 전제: next dev 가 localhost:3000 에 떠 있을 것.
//
// ponytail: 백엔드 없이 프론트만으로 재현되는 화면만 찍는다. 측정 중·결과 리포트는
// 라이브 상태와 인증 fixture 가 필요해 제외했다 (PLAN 6.1절).

import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const PHASE = process.argv[2];
if (!['before', 'after'].includes(PHASE)) {
  console.error('사용: node scripts/capture-ui-shots.mjs <before|after>');
  process.exit(1);
}

const BASE = 'http://localhost:3000';
const OUT = path.resolve(
  process.cwd(),
  '..',
  'docs',
  'png',
  PHASE
);

// 화면 ID 는 Figma `05 · 화면 인덱스` 기준.
const SCREENS = [
  { id: 'MS-PC-01', mobileId: 'MS-MO-02', path: '/' },
  { id: 'MS-PC-02', mobileId: 'MS-MO-14', path: '/intro' },
  { id: 'MS-PC-04', mobileId: 'MS-MO-04', path: '/lab' },
  { id: 'MS-PC-05', mobileId: 'MS-MO-05', path: '/join' },
  { id: 'MS-PC-09', mobileId: 'MS-MO-07', path: '/lab/operator-join' },
  { id: 'MS-PC-10', mobileId: 'MS-MO-13', path: '/expand' },
  { id: 'MS-PC-08', mobileId: 'MS-MO-12', path: '/results' },
];

const VIEWPORTS = [
  { w: 1440, h: 900, useMobileId: false },
  { w: 390, h: 844, useMobileId: true },
];

/** 내비바 토글을 눌러 라이트로 전환함. 소스가 UIContext state 하나뿐이라 이 경로밖에 없음 (D3). */
async function switchToLight(page, isMobile) {
  const desktop = page.locator('[data-testid="theme-toggle"]');
  if (!isMobile && (await desktop.count())) {
    await desktop.first().click();
    return true;
  }
  // 모바일은 토글이 드롭다운 안에 있어 메뉴를 먼저 연다.
  const mobileToggle = page.locator('[data-testid="theme-toggle-mobile"]');
  const burger = page.locator('nav button').last();
  await burger.click().catch(() => {});
  await page.waitForTimeout(400);
  if (await mobileToggle.count()) {
    await mobileToggle.first().click();
    return true;
  }
  return false;
}

const browser = await chromium.launch();
await mkdir(OUT, { recursive: true });
let ok = 0;
let failed = 0;

for (const screen of SCREENS) {
  for (const vp of VIEWPORTS) {
    const id = vp.useMobileId ? screen.mobileId : screen.id;
    const ctx = await browser.newContext({
      viewport: { width: vp.w, height: vp.h },
      deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();
    try {
      await page.goto(`${BASE}${screen.path}`, {
        waitUntil: 'networkidle',
        timeout: 60000,
      });
      // 스플래시와 진입 애니메이션이 끝나기를 기다린다.
      await page.waitForTimeout(2500);

      for (const theme of ['dark', 'light']) {
        if (theme === 'light') {
          const switched = await switchToLight(page, vp.useMobileId);
          if (!switched) {
            console.warn(`  ! ${id} ${vp.w} 라이트 전환 실패 — 건너뜀`);
            continue;
          }
          await page.waitForTimeout(900);
        }
        const file = path.join(OUT, `${id}-${theme}-${vp.w}.png`);
        await page.screenshot({ path: file, fullPage: true });
        console.log(`  ok ${path.basename(file)}`);
        ok += 1;
      }
    } catch (err) {
      failed += 1;
      console.error(`  X ${id} ${vp.w} — ${err.message.split('\n')[0]}`);
    } finally {
      await ctx.close();
    }
  }
}

await browser.close();
console.log(`\n${PHASE}: ${ok}장 생성, 실패 ${failed}건 -> ${OUT}`);
if (ok === 0) process.exit(1);
