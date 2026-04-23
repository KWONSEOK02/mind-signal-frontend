'use client';

import { useState } from 'react';

/**
 * DUAL_2PC 세션 상태 유니온 타입 정의함
 */
export type DualSessionState =
  | 'invited' // token 발급 대기
  | 'joining' // joinAsOperator 진행 중
  | 'ready' // 두 subject 등록 완료, 측정 대기
  | 'measuring' // 측정 중
  | 'completed' // 측정 완료
  | 'aborted'; // 등록 실패 / 세션 만료

/**
 * DUAL_2PC 세션 상태 머신 훅 skeleton 정의함 (Phase 16 Wave 1)
 *
 * @param groupId - 그룹 식별자 (null이면 미초기화 상태임)
 * @returns 세션 상태 + 파트너 연결 여부
 */
export function useDualSession(groupId: string | null): {
  state: DualSessionState;
  partnerConnected: boolean;
} {
  const [state, setState] = useState<DualSessionState>('invited');
  const [partnerConnected, setPartnerConnected] = useState(false);

  // TODO Wave 2 (BE-3/BE-socket/FE-5 완료 후):
  // - socket join-room emit + ack (5초 timeout + 재시도 1회)
  // - dual-session-ready 리스너 → state 'ready' → 'measuring' 전이
  // - dual-session-failed 리스너 → state 'aborted' + 에러 표시
  // - stimulus_start 이벤트 수신 → 로컬 수신 시각 기록 + skew 계산
  // - aligned_pair 이벤트 수신 → DUAL_2PC 모드 전용 측정 데이터 처리
  void groupId;
  void setState;
  void setPartnerConnected;

  return { state, partnerConnected };
}
