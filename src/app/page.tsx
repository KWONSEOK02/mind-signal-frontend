'use client';

import React from 'react';
import { useUI } from '@/app/providers/ui-context';
import Home from '@/03-pages/home/home';

/**
 * 메인(Home) 페이지 라우트 컴포넌트임
 * 단일 컴포넌트 렌더링으로 파일 복잡도 축소함
 */
export default function MainPage() {
  const { theme, handlePageChange } = useUI();

  return (
    <div
      className={`transition-colors duration-500 min-h-screen ${
        theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-white text-slate-900'
      }`}
    >
      <Home theme={theme} setCurrentPage={handlePageChange} />
    </div>
  );
}
