'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { getSocket } from '@/07-shared/lib/socket-client';
import { config } from '@/07-shared/config/config';
import {
  fetchRegistryStatus,
  type RegistryStatus,
} from '@/07-shared/api/dual-trigger';

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
 * @returns 세션 상태 + 파트너 연결 여부 + 등록 상태 + 폴백 표시 여부 + 상태 직접 변경 함수
 */
export function useDualSession(
  groupId: string | null,
  experimentMode?: string
): {
  state: DualSessionState;
  partnerConnected: boolean;
  registryStatus: RegistryStatus | null;
  showFallback: boolean;
  setDualSessionState: (s: DualSessionState) => void;
} {
  const [state, setState] = useState<DualSessionState>('invited');
  const [partnerConnected, setPartnerConnected] = useState(false);

  // registry-status polling 상태 정의함
  const [registryStatus, setRegistryStatus] = useState<RegistryStatus | null>(
    null
  );
  const failedSinceRef = useRef<number | null>(null);
  const [showFallback, setShowFallback] = useState(false);

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

    // dual-session-ready: BE가 측정 전이 신호 emit 처리함
    // partnerConnected 설정은 polling이 담당하므로 상태 전이만 수행함
    const readyHandler = ({ groupId: gid }: DualSessionReadyPayload) => {
      if (gid !== groupId) return; // 다른 그룹 이벤트 무시함
      setState('measuring');
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

  /**
   * registry-status 1초 폴링 수행함 (DUAL_2PC + groupId 존재 시만)
   * ready=true 수신 → partnerConnected=true + state 'invited'→'ready' 전이
   * 10초간 inFlight=false + ready=false 지속 → showFallback=true 처리함
   */
  useEffect(() => {
    if (!groupId || experimentMode !== 'DUAL_2PC') return;

    let cancelled = false;
    let activeAbort: AbortController | null = null;

    const intervalId = setInterval(async () => {
      if (cancelled) return;
      activeAbort?.abort();
      activeAbort = new AbortController();

      try {
        const status = await fetchRegistryStatus(groupId, activeAbort.signal);
        if (cancelled) return;
        setRegistryStatus(status);

        if (status.ready) {
          // 등록 완료 → 파트너 연결 확정 + 상태 전이 수행함
          setPartnerConnected(true);
          setState((prev) => (prev === 'invited' ? 'ready' : prev));
          failedSinceRef.current = null;
          setShowFallback(false);
        } else {
          // 미완료 상태 → 파트너 연결 해제 + stuck 여부 판별 후 폴백 노출 결정함
          setPartnerConnected(false);
          const isStuck = !status.inFlight && !status.ready;
          if (isStuck) {
            if (failedSinceRef.current === null) {
              failedSinceRef.current = Date.now();
            } else if (Date.now() - failedSinceRef.current >= 10_000) {
              setShowFallback(true);
            }
          } else {
            failedSinceRef.current = null;
            setShowFallback(false);
          }
        }
      } catch (err) {
        // AbortError는 정상 취소이므로 무시함
        if ((err as Error).name === 'AbortError') return;
        // 네트워크 오류 → 다음 tick 재시도 처리함
      }
    }, 1000);

    return () => {
      cancelled = true;
      activeAbort?.abort();
      clearInterval(intervalId);
      // 세션 전환/unmount 시 stale 상태 누수 방지 — 이전 그룹의 등록/연결 상태 청소함
      setRegistryStatus(null);
      setPartnerConnected(false);
      setShowFallback(false);
      failedSinceRef.current = null;
    };
  }, [groupId, experimentMode]);

  return {
    state,
    partnerConnected,
    registryStatus,
    showFallback,
    setDualSessionState,
  };
}
