'use client';

import React, { Suspense } from 'react';
import { OperatorJoinPage } from '@/03-pages/lab';

/**
 * [/lab/operator-join] 라우트 엔트리 포인트 정의함
 * useSearchParams() 사용에 따른 클라이언트 사이드 보일아웃 방지를 위해 Suspense 사용함
 * URL 파라미터: ?token=XXX&groupId=XXX (PLAN 아키텍처 결정 #10)
 */
export default function OperatorJoinRoute() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <OperatorJoinPage />
    </Suspense>
  );
}
