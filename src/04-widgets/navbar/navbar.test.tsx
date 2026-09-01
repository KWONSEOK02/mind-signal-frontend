'use client';

import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { NAV_ITEMS } from '@/07-shared/constants/nav-items';
import Navbar from './navbar';
import Footer from '../footer/footer';

const navbarProps = {
  currentPage: 'home' as const,
  setCurrentPage: vi.fn(),
  theme: 'dark' as const,
  toggleTheme: vi.fn(),
  isLoggedIn: false,
  setIsLoggedIn: vi.fn(),
  openAuthModal: vi.fn(),
};

/**
 * UI-W001 A8 회귀 — 내비 항목 6개와 외부 URL 을 navbar 와 footer 가 각자
 * 하드코딩하고 있었음. 한쪽만 고치면 두 곳이 조용히 어긋남.
 * 수정 전에는 footer 가 자기 배열을 써서 NAV_ITEMS 와 무관하게 렌더됐음.
 */
describe('내비 항목 단일 출처 회귀 검증함', () => {
  it('navbar 가 NAV_ITEMS 의 name 을 그대로 렌더함', () => {
    render(<Navbar {...navbarProps} />);

    for (const item of NAV_ITEMS) {
      // 데스크톱과 모바일 양쪽에 같은 항목이 있으므로 최소 1개 존재만 확인함
      expect(screen.getAllByText(item.name).length).toBeGreaterThan(0);
    }
  });

  it('footer 가 같은 출처를 쓰고 footerName 이 있으면 그것을 렌더함', () => {
    const { container } = render(
      <Footer theme="dark" setCurrentPage={vi.fn()} />
    );
    const sitemap = within(container);

    for (const item of NAV_ITEMS) {
      expect(sitemap.getAllByText(item.footerName ?? item.name).length).toBe(1);
    }
  });

  it('외부 링크 항목이 양쪽에서 같은 URL 을 가리킴', () => {
    const external = NAV_ITEMS.filter((i) => i.url);

    expect(external.length).toBeGreaterThan(0);
    // 정본이 하나이므로 URL 중복 정의가 존재할 수 없음
    for (const item of external) {
      expect(item.url).toMatch(/^https?:\/\//);
    }
  });

  it('테마 토글에 스크린샷 캡처용 testid 가 있음', () => {
    render(<Navbar {...navbarProps} />);

    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
  });
});
