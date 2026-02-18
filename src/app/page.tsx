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

export default function MainPage() {
  // 1. URL과 브라우저 히스토리 관리를 위한 훅
  const router = useRouter();
  const searchParams = useSearchParams();

  // 2. 초기값 설정: URL에 ?page=intro 등이 있으면 그걸 쓰고, 없으면 'home'
  // (searchParams가 null일 수도 있으므로 안전하게 처리)
  const initialPage = (searchParams?.get('page') as PageType) || 'home';

  const [currentPage, setCurrentPage] = useState<PageType>(initialPage);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState<string>('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  const toggleTheme = () =>
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));

  // 3. 브라우저의 뒤로가기/앞으로가기 버튼을 눌렀을 때 화면 동기화
  useEffect(() => {
    const pageFromUrl = searchParams?.get('page') as PageType;
    if (pageFromUrl) {
      setCurrentPage(pageFromUrl);
    }
  }, [searchParams]);

  // 4. 페이지 변경 함수 (기존 setCurrentPage 대신 이걸 사용)
  // 화면 상태도 바꾸고 + URL 주소도 업데이트함.
  const handlePageChange = (page: PageType) => {
    setCurrentPage(page);
    router.push(`?page=${page}`, { scroll: false });
    window.scrollTo(0, 0); // 페이지 이동 시 맨 위로
  };

  useEffect(() => {
    // 앱 초기화 로직: 토큰 존재 시 백엔드에 사용자 정보 요청
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        // 백엔드에서 실제 가입된 유저 데이터를 가져옴.
        const response = await authApi.getMe();

        // 응답 구조에 맞춰 데이터 추출
        const { user } = response.data;

        // 상태에 실제 이름 저장
        setUserName(user.name);
        setIsLoggedIn(true);
      } catch {
        // 1. 'error' 변수를 사용하지 않으므로 catch 블록에서 생략하여 Lint 에러 해결
        localStorage.removeItem('token');
        setIsLoggedIn(false);
        setUserName('');
      }
    };
    initAuth();
  }, [isLoggedIn]); // 로그인 상태 변경 시(로그인 성공 후 등) 유저 정보를 동기화하기 위해 유지

  // Suspense 경계 설정 (useSearchParams 사용 시 필수)
  // 기존 구조를 유지하기 위해 return 전체를 Suspense로 감싼다.
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <div
        className={`min-h-screen transition-colors duration-500 ${theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}
      >
        <div className="relative z-10">
          <Navbar
            currentPage={currentPage}
            setCurrentPage={handlePageChange} // 여기서 만든 핸들러 전달
            theme={theme}
            toggleTheme={toggleTheme}
            isLoggedIn={isLoggedIn}
            setIsLoggedIn={setIsLoggedIn}
            userName={userName}
            openAuthModal={() => setIsAuthModalOpen(true)}
          />

          <main className="min-h-screen pt-20">
            {/* 현재 페이지 상태에 따라 컴포넌트 렌더링 */}
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
    </Suspense>
  );
}