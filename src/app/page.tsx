'use client';

import React, { Suspense } from 'react';
// [피드백 반영] 임포트 경로를 Provider 소스 파일로 직접 연결함
import { useUI } from '@/app/providers/ui-context';
import Home from '@/03-pages/home/home';
import Intro from '@/03-pages/intro/intro';
import { LabPage, JoinPage } from '@/03-pages/lab';
import Results from '@/03-pages/results/results';
import Expand from '@/03-pages/expand/expand';

/**
 * [Main] 전역 레이아웃에서 관리되는 통합 상태를 사용하여 개별 페이지 콘텐츠 렌더링함
 */
function MainContent() {
  const {
    theme,
    currentPage,
    isLoggedIn,
    setIsLoggedIn,
    handlePageChange,
    openAuthModal,
  } = useUI();

  return (
    <div
      className={`transition-colors duration-500 ${
        theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-white text-slate-900'
      }`}
    >
      <div className="min-h-screen">
        {currentPage === 'home' && (
          <Home theme={theme} setCurrentPage={handlePageChange} />
        )}
        {currentPage === 'intro' && <Intro theme={theme} />}
        {currentPage === 'lab' && <LabPage />}
        {currentPage === 'join' && <JoinPage />}
        {currentPage === 'results' && (
          <Results
            theme={theme}
            isLoggedIn={isLoggedIn}
            setIsLoggedIn={setIsLoggedIn}
            // 레이아웃의 실제 핸들러를 주입하여 기능 정상 작동 보장함
            setCurrentPage={handlePageChange}
            openAuthModal={openAuthModal}
          />
        )}
        {currentPage === 'expand' && <Expand theme={theme} />}
      </div>
    </div>
  );
}

/**
 * [Entry] Suspense 경계를 제공하여 클라이언트 사이드 데이터 로딩 안정성 확보함
 */
export default function MainPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <MainContent />
    </Suspense>
  );
}
