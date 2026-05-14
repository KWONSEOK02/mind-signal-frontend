'use client';

import { useRef } from 'react';

/**
 * N-tap counter 훅 정의함.
 * 첫 tap 시점부터 windowMs 이내에 target 회 누적 시 onReach 호출함.
 * 첫 tap 후 windowMs 초과 시 counter 전체 reset 처리함.
 *
 * @param target - 도달 목표 tap 수
 * @param windowMs - 전체 window 시간 (첫 tap 시점부터 측정)
 * @param onReach - target 도달 시 1회 호출 콜백
 * @returns increment 핸들러
 */
export const useTapCounter = (
  target: number,
  windowMs: number,
  onReach: () => void
) => {
  const countRef = useRef(0);
  const firstTapAtRef = useRef<number>(0);

  function increment() {
    const now = Date.now();
    if (countRef.current === 0 || now - firstTapAtRef.current > windowMs) {
      // 첫 tap 또는 window 초과 — counter/firstTap reset 처리함
      countRef.current = 1;
      firstTapAtRef.current = now;
    } else {
      countRef.current += 1;
    }
    if (countRef.current >= target) {
      countRef.current = 0;
      firstTapAtRef.current = 0;
      onReach();
    }
  }

  return { increment };
};
