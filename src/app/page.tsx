'use client';

import React, { useState, useEffect } from 'react';
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
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState<string>('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  const toggleTheme = () =>
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));

  useEffect(() => {
    // 앱 초기화 로직: 토큰 존재 시 백엔드에 사용자 정보 요청
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        // 백엔드에서 실제 가입된 유저 데이터를 가져옵니다.
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

  return (
    <div
      className={`min-h-screen transition-colors duration-500 ${theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}
    >
      <div className="relative z-10">
        <Navbar
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
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
            <Home setCurrentPage={setCurrentPage} theme={theme} />
          )}
          {currentPage === 'intro' && <Intro theme={theme} />}
          {currentPage === 'lab' && <Lab theme={theme} />}
          {currentPage === 'results' && (
            <Results
              theme={theme}
              isLoggedIn={isLoggedIn}
              setIsLoggedIn={setIsLoggedIn}
              setCurrentPage={setCurrentPage}
              openAuthModal={() => setIsAuthModalOpen(true)}
            />
          )}
          {currentPage === 'expand' && <Expand theme={theme} />}
        </main>

        <Footer theme={theme} setCurrentPage={setCurrentPage} />
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
