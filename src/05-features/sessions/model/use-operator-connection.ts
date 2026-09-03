'use client';

import { useState } from 'react';
import {
  createOperatorInviteToken,
  joinAsOperator,
} from '@/07-shared/api/session';
import {
  readOperatorSocketSession,
  saveOperatorSocketSession,
  type OperatorSocketSession,
} from '@/07-shared/lib/operator-socket-session.lib';

/**
 * 운영자 경보 채널 연결 상태 정의함.
 *
 * `expired`를 별도 값으로 두는 이유 — 저장 세션이 없는 것과 만료된 것은 화면에서
 * 다른 안내가 필요함. lib이 만료를 null로 뭉개면 만료 신호가 사라짐(UI-W006 D2)
 */
export type OperatorConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'expired'
  | 'error';

export interface UseOperatorConnectionResult {
  status: OperatorConnectionStatus;
  /** 미만료 세션만 담음. 만료 여부는 status로 구분함 */
  session: OperatorSocketSession | null;
  error: string | null;
  connect: () => Promise<boolean>;
}

const isExpired = (session: OperatorSocketSession) =>
  Date.now() >= session.socketTokenExpiresAt;

/**
 * 운영자 경보 채널의 복원·발급·저장을 한 곳에서 소유함.
 *
 * 이 훅을 만든 이유는 캡슐화가 아니라 **판정 주체 단일화**임. 이전에는 "채널이 살아
 * 있나"의 답이 페이지 복원 effect와 저장소 lib와 stream-health 훅 셋에 흩어져 있어,
 * lib이 만료를 null로 반환하게 바꾸면 만료 신호가 조용히 죽는 구조였음(UI-W006 D1).
 *
 * @param groupId - 그룹 식별자. null이면 idle 유지함
 * @returns 연결 상태와 미만료 세션과 재연결 액션
 */
export function useOperatorConnection(
  groupId: string | null
): UseOperatorConnectionResult {
  // connect() 로 새로 얻은 세션만 담음. 복원분은 아래 파생값이 담당함
  const [issued, setIssued] = useState<{
    groupId: string;
    session: OperatorSocketSession;
  } | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 저장 세션 복원은 effect 가 아니라 렌더 중 파생값으로 계산함.
   *
   * effect + setState 로 하면 cascading render 를 만들고 lint 가 막음. 복원은
   * 외부 시스템 구독이 아니라 순수 읽기라 파생값이 맞음
   */
  const stored =
    groupId && (!issued || issued.groupId !== groupId)
      ? readOperatorSocketSession(groupId)
      : null;
  const activeSession =
    issued && issued.groupId === groupId
      ? issued.session
      : stored && !isExpired(stored)
        ? stored
        : null;

  const status: OperatorConnectionStatus = !groupId
    ? 'idle'
    : pending
      ? 'connecting'
      : activeSession
        ? 'connected'
        : error
          ? 'error'
          : stored
            ? 'expired'
            : 'idle';

  const session = status === 'connected' ? activeSession : null;

  const connect = async (): Promise<boolean> => {
    if (!groupId) return false;
    // 더블클릭 가드. BE는 inFlight·isFullyRegistered로 이미 멱등함(UI-W006 D5)
    if (pending) return false;

    setPending(true);
    setError(null);
    try {
      const { token } = await createOperatorInviteToken(groupId);
      const joined = await joinAsOperator(token);
      const next: OperatorSocketSession = {
        socketToken: joined.socketToken,
        socketTokenExpiresAt: joined.socketTokenExpiresAt,
        experimentMode: joined.experimentMode,
      };

      try {
        saveOperatorSocketSession(joined.groupId, next);
      } catch (storageError) {
        // 저장 실패가 실험 진행을 차단하지 않도록 경고만 기록함
        console.warn('운영자 소켓 세션 저장 실패함:', storageError);
      }

      setIssued({ groupId: joined.groupId, session: next });
      setPending(false);
      return true;
    } catch (err) {
      // 실제 오류를 삼키지 않고 BE 메시지를 우선 노출함
      console.error('[useOperatorConnection]', err);
      const beMessage = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setError(
        beMessage ??
          '운영자 연결 실패함 — 세션을 만든 계정으로만 가능함. 다시 시도 필요함.'
      );
      setIssued(null);
      setPending(false);
      return false;
    }
  };

  return { status, session, error, connect };
}
