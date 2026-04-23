'use client';

import React from 'react';
import type { DualSessionState } from '@/05-features/sessions/model/use-dual-session';

/**
 * DualSessionBanner 컴포넌트 props 정의함
 */
interface DualSessionBannerProps {
  /** 현재 실험 모드 문자열 */
  experimentMode: string;
  /** DUAL_2PC 세션 상태 (use-dual-session 훅에서 가져옴) */
  state: DualSessionState;
  /** 파트너 PC 연결 여부 */
  partnerConnected: boolean;
}

/**
 * [Widget] DUAL_2PC 측정 중 상단 배너 컴포넌트 정의함 (Phase 16 FE-4)
 *
 * experimentMode === 'DUAL_2PC' + state === 'measuring' 조건에서만 렌더함
 * 텍스트: "DUAL 2PC 측정 중 · 파트너 PC {연결됨|연결 대기}" (PLAN L145)
 */
export function DualSessionBanner({
  experimentMode,
  state,
  partnerConnected,
}: DualSessionBannerProps) {
  // DUAL_2PC + measuring 조건에서만 배너 표시함 (PLAN L144-145)
  if (experimentMode !== 'DUAL_2PC' || state !== 'measuring') {
    return null;
  }

  return (
    <div
      className="w-full bg-indigo-600 text-white text-sm font-bold text-center py-2 px-4 flex items-center justify-center gap-2"
      role="status"
      aria-live="polite"
    >
      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
      <span>
        DUAL 2PC 측정 중 · 파트너 PC {partnerConnected ? '연결됨' : '연결 대기'}
      </span>
    </div>
  );
}

export default DualSessionBanner;
