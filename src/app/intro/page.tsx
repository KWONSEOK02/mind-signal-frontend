'use client';

import React from 'react';
import { useUI } from '@/app/providers/ui-context';
import Intro from '@/03-pages/intro/intro';

/**
 * 소개(Intro) 페이지 라우트 컴포넌트임
 */
export default function IntroRoutePage() {
  const { theme } = useUI();

  return (
    <div
      className={`transition-colors duration-500 min-h-screen ${
        theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-white text-slate-900'
      }`}
    >
      <Intro theme={theme} />
    </div>
  );
}
