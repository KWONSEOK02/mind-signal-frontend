'use client';

import { useEffect, useState } from 'react';
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
  // 오류에 groupId 를 묶음. 그룹 A 실패가 그룹 B 화면에 남으면 안 됨 (CodeRabbit #85)
  const [failure, setFailure] = useState<{
    groupId: string;
    message: string;
  } | null>(null);

  /**
   * 저장 세션 복원은 effect 가 아니라 렌더 중 파생값으로 계산함.
   *
   * effect + setState 로 하면 cascading render 를 만들고 lint 가 막음. 복원은
   * 외부 시스템 구독이 아니라 순수 읽기라 파생값이 맞음
   */
  const issuedForGroup =
    issued && issued.groupId === groupId ? issued.session : null;
  const stored =
    groupId && !issuedForGroup ? readOperatorSocketSession(groupId) : null;

  // 발급 세션에도 만료를 적용함. 안 하면 30분 뒤에도 connected 로 남아
  // 만료 안내와 재연결 흐름이 시작되지 않음 (CodeRabbit #85)
  const candidate = issuedForGroup ?? stored;
  const activeSession = candidate && !isExpired(candidate) ? candidate : null;
  const error = failure && failure.groupId === groupId ? failure.message : null;

  const status: OperatorConnectionStatus = !groupId
    ? 'idle'
    : pending
      ? 'connecting'
      : activeSession
        ? 'connected'
        : candidate
          ? 'expired'
          : error
            ? 'error'
            : 'idle';

  const session = status === 'connected' ? activeSession : null;

  /**
   * 만료 시각에 재평가를 예약함. 타이머가 없으면 화면이 열려 있는 동안
   * connected 로 멈춰 있어 만료를 영영 알리지 못함 (CodeRabbit #85)
   */
  const expiresAt = activeSession?.socketTokenExpiresAt ?? null;
  const [, forceReevaluate] = useState(0);
  useEffect(() => {
    if (expiresAt === null) return;
    const delay = expiresAt - Date.now();
    if (delay <= 0) return;
    const timeoutId = setTimeout(() => forceReevaluate((n) => n + 1), delay);
    return () => clearTimeout(timeoutId);
  }, [expiresAt]);

  const connect = async (): Promise<boolean> => {
    if (!groupId) return false;
    // 더블클릭 가드. BE는 inFlight·isFullyRegistered로 이미 멱등함(UI-W006 D5)
    if (pending) return false;

    setPending(true);
    setFailure(null);
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
      setFailure(null);
      setPending(false);
      return true;
    } catch (err) {
      // 실제 오류를 삼키지 않고 BE 메시지를 우선 노출함
      console.error('[useOperatorConnection]', err);
      const beMessage = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setFailure({
        groupId,
        message:
          beMessage ??
          '운영자 연결 실패함 — 세션을 만든 계정으로만 가능함. 다시 시도 필요함.',
      });
      setIssued(null);
      setPending(false);
      return false;
    }
  };

  return { status, session, error, connect };
}
