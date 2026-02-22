'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Navbar } from '@/04-widgets/navbar';
import AuthModal from '@/05-features/auth/ui/auth-modal';
import { authApi } from '@/07-shared/api/auth';
import { PageType } from '@/07-shared/types';
import Home from '@/03-pages/home/home';
import Intro from '@/03-pages/intro/intro';
import { LabPage } from '@/03-pages/lab';
import { JoinPage } from '@/03-pages/lab';
import Results from '@/03-pages/results/results';
import Expand from '@/03-pages/expand/expand';
import Footer from '@/04-widgets/footer/footer';
import ChatAssistant from '@/05-features/chat-assistant/chat-assistant';

/**
 * [Main] 실제 로직을 담은 메인 콘텐츠 컴포넌트 정의함
 */
function MainContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // AGENTS.md 5.1: 렌더링 중 파생 상태 계산함
  const pageFromUrl = searchParams?.get('page') as PageType;
  const initialPage = pageFromUrl || 'home';

  const [currentPage, setCurrentPage] = useState<PageType>(initialPage);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState<string>('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [mounted, setMounted] = useState(false);

  /**
   * AGENTS.md 5.1: 쿼리 파라미터 변경 시 내부 상태 동기화 수행함
   */
  if (pageFromUrl && pageFromUrl !== currentPage) {
    setCurrentPage(pageFromUrl);
  }

  const toggleTheme = () =>
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));

  const handlePageChange = (page: PageType) => {
    setCurrentPage(page);
    router.push(`?page=${page}`, { scroll: false });
    if (typeof window !== 'undefined') window.scrollTo(0, 0);
  };

  /**
   * 하이드레이션 보장 및 인증 정보 로드 수행함
   */
  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      setMounted(true);
    });

    const initAuth = async () => {
      if (typeof window === 'undefined') return;

      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const response = await authApi.getMe();
        /**
         * 제공된 JSON 규격 반영함: data.data 가 아닌 data.user 구조임
         * response.data.user.name을 참조하여 사용자 이름 설정함
         */
        if (response.data && response.data.status === 'success') {
          // 중첩된 data 없이 user 필드가 바로 오는 구조로 파싱 수행함
          const user = response.data.user;
          if (user) {
            setUserName(user.name || 'User');
            setIsLoggedIn(true);
          }
        }
      } catch {
        localStorage.removeItem('token');
        setIsLoggedIn(false);
        setUserName('');
      }
    };
    initAuth();

    return () => cancelAnimationFrame(frameId);
  }, [isLoggedIn]); // mounted 의존성 제거하여 순환 호출 방지함

  // 마운트 전 서버-클라이언트 간 테마 불일치 방지 로직 적용함
  const activeThemeClass = mounted ? theme : 'dark';

  return (
    <div className={activeThemeClass}>
      <div
        className={`min-h-screen transition-colors duration-500 ${
          activeThemeClass === 'dark'
            ? 'bg-slate-950 text-white'
            : 'bg-slate-50 text-slate-900'
        }`}
      >
        <div className="relative z-10">
          <Navbar
            currentPage={currentPage}
            setCurrentPage={handlePageChange}
            theme={theme}
            toggleTheme={toggleTheme}
            isLoggedIn={isLoggedIn}
            setIsLoggedIn={setIsLoggedIn}
            userName={userName}
            openAuthModal={() => setIsAuthModalOpen(true)}
          />

          <main className="min-h-screen pt-20">
            {currentPage === 'home' && (
              <Home setCurrentPage={handlePageChange} theme={theme} />
            )}
            {currentPage === 'intro' && <Intro theme={theme} />}
            {currentPage === 'lab' && <LabPage />}
            {currentPage === 'join' && <JoinPage />}
            {currentPage === 'results' && (
              <Results
                theme={theme}
                isLoggedIn={isLoggedIn}
                setIsLoggedIn={setIsLoggedIn}
                setCurrentPage={handlePageChange}
                openAuthModal={() => setIsAuthModalOpen(true)}
              />
            )}
            {currentPage === 'expand' && <Expand theme={theme} />}
          </main>

          <Footer theme={theme} setCurrentPage={handlePageChange} />
          <ChatAssistant theme={theme} />
        </div>

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onLoginSuccess={() => setIsLoggedIn(true)}
          theme={theme}
        />
      </div>
    </div>
  );
}

/**
 * [Root] Suspense 경계를 제공하는 엔트리 포인트 정의함
 */
export default function MainPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <MainContent />
    </Suspense>
  );
}
