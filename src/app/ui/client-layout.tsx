'use client';

import React, { useMemo, Suspense } from 'react';
import { usePathname } from 'next/navigation';
import Navbar from '@/04-widgets/navbar/navbar';
import Footer from '@/04-widgets/footer/footer';
import AuthModal from '@/05-features/auth/ui/auth-modal';
import ChatAssistant from '@/05-features/chat-assistant/chat-assistant';
import { UIProvider, useUI } from '@/app/providers/ui-context';
import { PageType } from '@/07-shared/types';

/**
 * [Layout Content] 전역 상태를 구독하여 실제 UI 컴포넌트를 배치함
 */
const ClientLayoutContent = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const ui = useUI();

  /**
   * Navbar 컴포넌트 호환성을 위해 현재 경로에서 PageType 상태값 파생함
   */
  const currentPageFromPath = useMemo(() => {
    return (pathname === '/' ? 'home' : pathname?.replace('/', '')) as PageType;
  }, [pathname]);

  return (
    <>
      {/* 조건부 렌더링 제거하여 항상 Navbar를 표시함 */}
      <Navbar
        theme={ui.theme}
        toggleTheme={ui.toggleTheme}
        currentPage={currentPageFromPath}
        setCurrentPage={ui.handlePageChange}
        isLoggedIn={ui.isLoggedIn}
        setIsLoggedIn={ui.setIsLoggedIn}
        userName={ui.userName}
        openAuthModal={ui.openAuthModal}
      />

      {/* 항상 상단 여백(pt-20)을 확보하여 Navbar와 콘텐츠 겹침 방지함 */}
      <main className="min-h-screen pt-20">{children}</main>

      {/* 조건부 렌더링 제거하여 항상 하단 위젯들을 표시함 */}
      <Footer theme={ui.theme} setCurrentPage={ui.handlePageChange} />
      <ChatAssistant theme={ui.theme} />

      <AuthModal
        isOpen={ui.isAuthModalOpen}
        onClose={ui.closeAuthModal}
        onLoginSuccess={() => {
          ui.refreshUser();
          ui.closeAuthModal();
        }}
        theme={ui.theme}
      />
    </>
  );
};

/**
 * [Root Layout Wrapper]
 * Suspense 경계를 통해 클라이언트 렌더링 안정성 확보함
 */
export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <UIProvider>
        <ClientLayoutContent>{children}</ClientLayoutContent>
      </UIProvider>
    </Suspense>
  );
}
