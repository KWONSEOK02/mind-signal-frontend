'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useUI } from '@/app/providers/ui-context';
import Results from '@/03-pages/results/results';

/** useSearchParams를 사용하는 내부 컴포넌트 — Suspense 래핑 필수 */
function ResultsContent() {
  const searchParams = useSearchParams();
  const groupId = searchParams.get('groupId') || undefined;
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
        groupId={groupId}
      />
    </div>
  );
}

/**
 * 결과(Results) 페이지 라우트 컴포넌트임
 * useSearchParams 사용을 위해 Suspense 래핑함 (H-5)
 */
export default function ResultsRoutePage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <ResultsContent />
    </Suspense>
  );
}
