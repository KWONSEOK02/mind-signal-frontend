'use client';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import ChatAssistant from './chat-assistant';

vi.mock('@/07-shared/api/chat', () => ({
  chatApi: {
    sendMessage: vi.fn(),
    sendInquiry: vi.fn(),
  },
}));

/**
 * UI-W001 A12 회귀 — theme prop 을 받고도 무시해 배경이 gray-900 으로 고정돼 있었음.
 * 수정 전에는 아래 두 테스트 모두 RED (라이트에서도 다크 표면이 나옴).
 */
describe('ChatAssistant — 테마 반영 회귀 검증함', () => {
  /** 패널을 열고 그 루트 엘리먼트 반환함 */
  const openPanel = async (theme: 'light' | 'dark') => {
    const { container } = render(<ChatAssistant theme={theme} />);
    await userEvent.click(screen.getByRole('button'));
    const panel = container.querySelector('.rounded-4xl');
    expect(panel).not.toBeNull();
    return panel as HTMLElement;
  };

  it('라이트 테마에서 패널 표면이 밝은 색으로 렌더링됨', async () => {
    const panel = await openPanel('light');

    expect(panel.className).toContain('bg-white');
    expect(panel.className).toContain('border-slate-200');
    // 고정 다크 배경이 남아 있으면 회귀임
    expect(panel.className).not.toContain('bg-gray-900');
    expect(panel.className).not.toContain('bg-slate-900');
  });

  it('다크 테마에서 패널 표면이 어두운 색으로 렌더링됨', async () => {
    const panel = await openPanel('dark');

    expect(panel.className).toContain('bg-slate-900');
    expect(panel).not.toHaveClass('bg-white');
  });

  it('토글 버튼의 표시등 테두리가 dark: variant 대신 테마 분기를 씀', () => {
    // D3 잔여 — Tailwind v4 에서 dark: 는 OS 설정을 따라 제4의 테마 소스가 됐음
    const { container } = render(<ChatAssistant theme="light" />);
    const dot = container.querySelector('.animate-pulse');

    expect(dot).not.toBeNull();
    expect(dot?.className).not.toContain('dark:');
    expect(dot?.className).toContain('border-white');
  });
});
