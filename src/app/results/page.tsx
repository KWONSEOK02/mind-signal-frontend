'use client';

import React from 'react';
import { useUI } from '@/app/providers/ui-context';
import Results from '@/03-pages/results/results';

/**
 * 결과(Results) 페이지 라우트 컴포넌트임
 * 전역 컨텍스트에서 인증 관련 상태를 주입하여 전달함
 */
export default function ResultsRoutePage() {
  const { theme, isLoggedIn, setIsLoggedIn, handlePageChange, openAuthModal } =
    useUI();

  return (
    <div
      className={`transition-colors duration-500 min-h-screen ${
        theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-white text-slate-900'
      }`}
    >
      <Results
        theme={theme}
        isLoggedIn={isLoggedIn}
        setIsLoggedIn={setIsLoggedIn}
        setCurrentPage={handlePageChange}
        openAuthModal={openAuthModal}
      />
    </div>
  );
}
