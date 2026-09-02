'use client';

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
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
  // 테스트 본문 끝의 mockRestore 는 assertion 실패 시 도달하지 못해 spy 가 다음
  // 테스트로 샘. 레포 관행대로 afterEach 로 원복함
  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  it('외부 링크 항목을 navbar 와 footer 가 같은 URL 로 새 탭에 엶', async () => {
    const external = NAV_ITEMS.find((i) => i.url);
    // throw 로 좁혀야 이후 external.url 접근이 strict 를 통과함
    if (!external?.url) throw new Error('외부 링크 항목이 없음');

    const openSpy = vi
      .spyOn(window, 'open')
      .mockImplementation(() => null as unknown as Window);

    const nav = render(<Navbar {...navbarProps} />);
    await userEvent.click(within(nav.container).getAllByText(external.name)[0]);
    expect(openSpy).toHaveBeenCalledWith(
      external.url,
      '_blank',
      'noopener,noreferrer'
    );
    nav.unmount();

    openSpy.mockClear();

    const foot = render(<Footer theme="dark" setCurrentPage={vi.fn()} />);
    await userEvent.click(
      within(foot.container).getByText(external.footerName ?? external.name)
    );
    expect(openSpy).toHaveBeenCalledWith(
      external.url,
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('테마 토글에 스크린샷 캡처용 testid 가 있음', () => {
    render(<Navbar {...navbarProps} />);

    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
  });
});
