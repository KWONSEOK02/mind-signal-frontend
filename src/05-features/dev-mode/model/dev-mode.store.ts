'use client';

import { create } from 'zustand';

/**
 * dev mode 단일 토글 store 정의함. session-only persist X.
 * 새로고침 시 자동 reset 처리함 (Zustand 5.x 기본 동작).
 *
 * 'use client' 의무 — Next.js 16 App Router에서 Server Component import 시 런타임 오류 방지함.
 */
interface DevModeState {
  isDevModeOn: boolean;
  setOn: () => void;
  setOff: () => void;
}

const INITIAL_STATE = { isDevModeOn: false } as const;

export const useDevModeStore = create<DevModeState>((set) => ({
  ...INITIAL_STATE,
  setOn: () => set({ isDevModeOn: true }),
  setOff: () => set({ isDevModeOn: false }),
}));

// test 환경 reset 패턴 — partial merge로 action 보존 처리함
// useDevModeStore.setState({ isDevModeOn: false })
// replace=true 사용 금지 — setOn/setOff action을 지워 FM-1 등에서 깨짐.
