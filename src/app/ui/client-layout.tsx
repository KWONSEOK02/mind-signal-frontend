'use client';

import React, { useMemo, Suspense } from 'react';
// [Fix] 누락되었던 usePathname 임포트 구문 추가함
import { usePathname } from 'next/navigation';
import Navbar from '@/04-widgets/navbar/navbar';
import Footer from '@/04-widgets/footer/footer';
import AuthModal from '@/05-features/auth/ui/auth-modal';
import ChatAssistant from '@/05-features/chat-assistant/chat-assistant';
import { UIProvider, useUI } from '@/app/providers/ui-context';

/**
 * [Layout Content] 전역 상태를 구독하여 실제 UI 컴포넌트를 배치함
 */
const ClientLayoutContent = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const ui = useUI();

  /**
   * [AGENTS.md 5.1] 실험실 및 참여 페이지에서의 위젯 노출 여부 파생함
   */
  const shouldHideWidgets = useMemo(() => {
    const excludePaths = ['/lab', '/join'];
    return (
      excludePaths.some((path) => pathname?.startsWith(path)) ||
      ui.currentPage === 'lab' ||
      ui.currentPage === 'join'
    );
  }, [pathname, ui.currentPage]);

  return (
    <>
      {!shouldHideWidgets && (
        <Navbar
          theme={ui.theme}
          toggleTheme={ui.toggleTheme}
          currentPage={ui.currentPage}
          setCurrentPage={ui.handlePageChange}
          isLoggedIn={ui.isLoggedIn}
          setIsLoggedIn={ui.setIsLoggedIn}
          userName={ui.userName}
          openAuthModal={ui.openAuthModal}
        />
      )}

      <main className={shouldHideWidgets ? '' : 'min-h-screen pt-20'}>
        {children}
      </main>

      {!shouldHideWidgets && (
        <>
          <Footer theme={ui.theme} setCurrentPage={ui.handlePageChange} />
          <ChatAssistant theme={ui.theme} />
        </>
      )}

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
 * [AGENTS.md 1.5] useSearchParams() 사용에 따른 빌드 에러 방지를 위해 Suspense 적용함
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
