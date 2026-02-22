'use client';

import React, { Suspense } from 'react';
import { JoinPage } from '@/03-pages/lab';

/**
 * [/join] 라우트의 엔트리 포인트 정의함
 * useSearchParams() 사용에 따른 클라이언트 사이드 보일아웃 방지를 위해 Suspense 사용함
 */
export default function JoinRoute() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <JoinPage />
    </Suspense>
  );
}
