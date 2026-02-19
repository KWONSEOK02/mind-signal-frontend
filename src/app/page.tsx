'use client';

import React, { useState, useEffect, Suspense } from 'react'; // Suspense 추가
import { useSearchParams, useRouter } from 'next/navigation'; // URL 관리를 위해 추가
import { Navbar } from '@/04-widgets/navbar';
import AuthModal from '@/05-features/auth/ui/auth-modal';
import { authApi } from '@/07-shared/api/auth';
import { PageType } from '@/07-shared/types';
import Home from '@/03-pages/home/home';
import Intro from '@/03-pages/intro/intro';
import Lab from '@/03-pages/lab/lab';
import Results from '@/03-pages/results/results';
import Expand from '@/03-pages/expand/expand';
import Footer from '@/04-widgets/footer/footer';
import ChatAssistant from '@/05-features/chat-assistant/chat-assistant';

// [수정 포인트 1] 실제 로직을 담은 내부 컴포넌트 분리
// useSearchParams를 사용하는 모든 로직을 이곳으로 옮깁니다.
function MainContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 1. URL 파라미터에서 현재 페이지 값을 가져옵니다.
  const pageFromUrl = searchParams?.get('page') as PageType;

  // 2. 초기값 설정: URL에 값이 있으면 사용하고, 없으면 'home'을 기본값으로 합니다.
  const initialPage = pageFromUrl || 'home';

  const [currentPage, setCurrentPage] = useState<PageType>(initialPage);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState<string>('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // [중요: 린트 에러 해결 포인트]
  // 기존의 useEffect 대신, 렌더링 과정에서 URL 파라미터와 현재 상태가 다를 경우 직접 업데이트.
  // 이는 'Cascading Renders' 에러를 방지하는 React의 권장 패턴
  if (pageFromUrl && pageFromUrl !== currentPage) {
    setCurrentPage(pageFromUrl);
  }

  const toggleTheme = () =>
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));

  const handlePageChange = (page: PageType) => {
    setCurrentPage(page);
    router.push(`?page=${page}`, { scroll: false });
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const response = await authApi.getMe();
        const { user } = response.data;
        setUserName(user.name);
        setIsLoggedIn(true);
      } catch {
        localStorage.removeItem('token');
        setIsLoggedIn(false);
        setUserName('');
      }
    };
    initAuth();
  }, [isLoggedIn]);

  return (
    <div
      className={`min-h-screen transition-colors duration-500 ${
        theme === 'dark'
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
          {currentPage === 'lab' && <Lab theme={theme} />}
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
  );
}

// [수정 포인트 2] 빌드 에러를 해결하는 Entry Point
// MainPage는 오직 Suspense Boundary만 관리하며 MainContent를 감싼다.
export default function MainPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <MainContent />
    </Suspense>
  );
}
