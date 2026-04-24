'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { getSocket } from '@/07-shared/lib/socket-client';
import { config } from '@/07-shared/config/config';

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
 * dual-session-ready 이벤트 페이로드 구조 정의함
 */
interface DualSessionReadyPayload {
  groupId: string;
  timestamp_ms: number;
}

/**
 * dual-session-failed 이벤트 페이로드 구조 정의함
 */
interface DualSessionFailedPayload {
  groupId: string;
  error: string;
}

/**
 * measurement-complete 이벤트 페이로드 구조 정의함 (DUAL_2PC room emit)
 */
interface MeasurementCompletePayload {
  sessionId?: string;
  groupId?: string;
}

/**
 * [Feature] DUAL_2PC 세션 상태 머신 훅 정의함 (Phase 16 Wave 2 본 구현)
 *
 * Socket.io 이벤트 리스너 등록/해제 및 상태 전이 처리함:
 * - dual-session-ready → state 'ready' → 'measuring' 전이
 * - dual-session-failed → state 'aborted'
 * - measurement-complete → state 'completed'
 *
 * @param groupId - 그룹 식별자 (null이면 미초기화 상태임)
 * @param experimentMode - 현재 실험 모드 (DUAL_2PC 여부 판별 목적)
 * @returns 세션 상태 + 파트너 연결 여부 + 상태 직접 변경 함수
 */
export function useDualSession(
  groupId: string | null,
  experimentMode?: string
): {
  state: DualSessionState;
  partnerConnected: boolean;
  setDualSessionState: (s: DualSessionState) => void;
} {
  const [state, setState] = useState<DualSessionState>('invited');
  const [partnerConnected, setPartnerConnected] = useState(false);

  // 이벤트 핸들러 ref 보관하여 정확한 off 처리 가능하게 함
  const readyHandlerRef = useRef<
    ((payload: DualSessionReadyPayload) => void) | null
  >(null);
  const failedHandlerRef = useRef<
    ((payload: DualSessionFailedPayload) => void) | null
  >(null);
  const completeHandlerRef = useRef<
    ((payload: MeasurementCompletePayload) => void) | null
  >(null);

  // 외부에서 상태 직접 변경 가능하게 노출함 (v3 N-5: 202 수신 시 'joining' 전이)
  const setDualSessionState = useCallback((s: DualSessionState) => {
    setState(s);
  }, []);

  useEffect(() => {
    // DUAL_2PC 모드 + groupId 모두 있을 때만 소켓 이벤트 등록함
    if (!groupId || experimentMode !== 'DUAL_2PC') return;

    const socket = getSocket(config.api.socketUrl ?? config.api.baseUrl);

    // dual-session-ready: BE가 두 DE 등록 완료 + stimulus 준비됨을 통보
    const readyHandler = ({ groupId: gid }: DualSessionReadyPayload) => {
      if (gid !== groupId) return; // 다른 그룹 이벤트 무시함
      setState('measuring');
      setPartnerConnected(true);
    };

    // dual-session-failed: BE 측 60초 timeout 또는 처리 오류 발생함
    const failedHandler = ({ groupId: gid }: DualSessionFailedPayload) => {
      if (gid !== groupId) return; // 다른 그룹 이벤트 무시함
      setState('aborted');
      setPartnerConnected(false);
    };

    // measurement-complete: 두 subject 모두 완료 후 1회 emit됨 (v7 H-2)
    const completeHandler = ({ groupId: gid }: MeasurementCompletePayload) => {
      if (gid !== groupId) return; // 다른 그룹 이벤트 무시함
      setState('completed');
    };

    readyHandlerRef.current = readyHandler;
    failedHandlerRef.current = failedHandler;
    completeHandlerRef.current = completeHandler;

    socket.on('dual-session-ready', readyHandler);
    socket.on('dual-session-failed', failedHandler);
    socket.on('measurement-complete', completeHandler);

    return () => {
      // 리스너 해제 수행함
      if (readyHandlerRef.current) {
        socket.off('dual-session-ready', readyHandlerRef.current);
        readyHandlerRef.current = null;
      }
      if (failedHandlerRef.current) {
        socket.off('dual-session-failed', failedHandlerRef.current);
        failedHandlerRef.current = null;
      }
      if (completeHandlerRef.current) {
        socket.off('measurement-complete', completeHandlerRef.current);
        completeHandlerRef.current = null;
      }
    };
  }, [groupId, experimentMode]);

  return { state, partnerConnected, setDualSessionState };
}
