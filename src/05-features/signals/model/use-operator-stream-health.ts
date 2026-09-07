'use client';

import { useEffect, useState } from 'react';
import { config } from '@/07-shared/config/config';
import { getSocket } from '@/07-shared/lib/socket-client';
import type { OperatorSocketSession } from '@/07-shared/lib/operator-socket-session.lib';

const JOIN_ACK_TIMEOUT_MS = 5_000;
const JOIN_RETRY_DELAY_MS = 1_000;
const MAX_JOIN_ATTEMPTS = 3;

type StreamHealthStatus = 'healthy' | 'stale' | 'disconnected';
type StreamHealthSource = 'backend' | 'engine';

/**
 * 서버 stream-health 이벤트 데이터 규격 정의함.
 */
export interface StreamHealthAlert {
  groupId: string;
  subjectIndex: number;
  status: StreamHealthStatus;
  source?: StreamHealthSource;
  silentMs?: number;
  recovered?: boolean;
}

/**
 * 운영자 경보 채널 미연결 사유 규격 정의함.
 */
export type OperatorAlertChannelIssue =
  | 'missing-token'
  | 'expired-token'
  | 'unauthorized'
  | 'connection-timeout'
  | 'ack-timeout'
  | 'join-failed';

interface JoinOperatorRoomAck {
  ok: boolean;
  error?: string;
}

interface UseOperatorStreamHealthResult {
  alerts: StreamHealthAlert[];
  channelIssue: OperatorAlertChannelIssue | null;
}

interface StreamHealthAlertState {
  groupId: string | null;
  alerts: StreamHealthAlert[];
}

interface OperatorAlertChannelState {
  subscriptionKey: string;
  issue: OperatorAlertChannelIssue | null;
}

/**
 * 운영자 전용 room 합류와 서버 stream-health 경보 구독을 관리함.
 *
 * @param groupId - 구독 대상 그룹 식별자
 * @param enabled - 운영자 경보 채널 활성 여부
 * @param session - 미만료 소켓 세션. null이면 missing-token 처리함
 * @param isExpiredSession - 저장 세션이 있으나 만료된 경우 true. expired-token 처리함
 * @returns 활성 서버 경보와 경보 채널 미연결 사유
 */
export function useOperatorStreamHealth(
  groupId: string | null,
  enabled: boolean,
  session: OperatorSocketSession | null,
  isExpiredSession = false
): UseOperatorStreamHealthResult {
  const [alertState, setAlertState] = useState<StreamHealthAlertState>({
    groupId: null,
    alerts: [],
  });
  const [channelState, setChannelState] =
    useState<OperatorAlertChannelState | null>(null);

  const subscriptionKey = groupId
    ? `${groupId}:${session?.socketToken ?? (isExpiredSession ? 'expired' : 'none')}`
    : null;
  const alerts = alertState.groupId === groupId ? alertState.alerts : [];
  const channelIssue =
    enabled &&
    subscriptionKey &&
    channelState?.subscriptionKey === subscriptionKey
      ? channelState.issue
      : null;

  useEffect(() => {
    if (!enabled || !groupId) return;

    let isDisposed = false;
    const currentSubscriptionKey = `${groupId}:${session?.socketToken ?? (isExpiredSession ? 'expired' : 'none')}`;
    const setSessionIssue = (issue: OperatorAlertChannelIssue) => {
      queueMicrotask(() => {
        if (!isDisposed) {
          setChannelState({
            subscriptionKey: currentSubscriptionKey,
            issue,
          });
        }
      });
    };

    // 만료 판정은 useOperatorConnection이 소유함. 여기서 저장소를 다시 읽지 않음.
    // isExpiredSession 분기를 지우면 만료 신호가 영영 안 뜨므로 반드시 유지할 것
    if (isExpiredSession) {
      setSessionIssue('expired-token');
      return () => {
        isDisposed = true;
      };
    }

    const operatorSession = session;
    if (!operatorSession) {
      setSessionIssue('missing-token');
      return () => {
        isDisposed = true;
      };
    }

    const socket = getSocket(config.api.socketUrl ?? config.api.baseUrl);
    const timeoutIds = new Set<ReturnType<typeof setTimeout>>();
    let joinAttemptCount = 0;
    let isUnauthorized = false;

    const scheduleTimeout = (callback: () => void, delayMs: number) => {
      const timeoutId = setTimeout(() => {
        timeoutIds.delete(timeoutId);
        callback();
      }, delayMs);
      timeoutIds.add(timeoutId);
      return timeoutId;
    };

    const clearScheduledTimeout = (
      timeoutId: ReturnType<typeof setTimeout>
    ) => {
      clearTimeout(timeoutId);
      timeoutIds.delete(timeoutId);
    };

    const streamHealthHandler = (payload: StreamHealthAlert) => {
      if (payload.groupId !== groupId) return;

      if (payload.status === 'healthy' && payload.recovered === true) {
        setAlertState((currentState) => ({
          groupId,
          alerts: (currentState.groupId === groupId
            ? currentState.alerts
            : []
          ).filter((alert) => alert.subjectIndex !== payload.subjectIndex),
        }));
        return;
      }

      if (payload.status !== 'stale' && payload.status !== 'disconnected') {
        return;
      }

      setAlertState((currentState) => {
        const currentAlerts =
          currentState.groupId === groupId ? currentState.alerts : [];
        const remainingAlerts = currentAlerts.filter(
          (alert) => alert.subjectIndex !== payload.subjectIndex
        );
        return {
          groupId,
          alerts: [...remainingAlerts, payload].sort(
            (left, right) => left.subjectIndex - right.subjectIndex
          ),
        };
      });
    };

    const joinOperatorRoom = () => {
      if (
        isDisposed ||
        isUnauthorized ||
        joinAttemptCount >= MAX_JOIN_ATTEMPTS
      ) {
        return;
      }

      joinAttemptCount += 1;
      let isAttemptSettled = false;

      const handleFailure = (issue: OperatorAlertChannelIssue) => {
        if (isDisposed) return;
        setChannelState({
          subscriptionKey: currentSubscriptionKey,
          issue,
        });

        if (issue !== 'unauthorized' && joinAttemptCount < MAX_JOIN_ATTEMPTS) {
          scheduleTimeout(joinOperatorRoom, JOIN_RETRY_DELAY_MS);
        }
      };

      const ackTimeoutId = scheduleTimeout(() => {
        if (isAttemptSettled) return;
        isAttemptSettled = true;
        handleFailure('ack-timeout');
      }, JOIN_ACK_TIMEOUT_MS);

      socket.emit(
        'join-operator-room',
        { groupId, token: operatorSession.socketToken },
        (ack: JoinOperatorRoomAck) => {
          if (isAttemptSettled || isDisposed) return;
          isAttemptSettled = true;
          clearScheduledTimeout(ackTimeoutId);

          if (ack.ok) {
            joinAttemptCount = 0;
            setChannelState({
              subscriptionKey: currentSubscriptionKey,
              issue: null,
            });
            return;
          }

          if (ack.error === 'unauthorized') {
            isUnauthorized = true;
            handleFailure('unauthorized');
            return;
          }

          handleFailure('join-failed');
        }
      );
    };

    let connectionTimeoutId: ReturnType<typeof setTimeout> | null = null;

    const connectHandler = () => {
      if (isUnauthorized) return;
      if (connectionTimeoutId) {
        clearScheduledTimeout(connectionTimeoutId);
        connectionTimeoutId = null;
      }
      // 직전 실패로 예약된 재시도와 ack 타임아웃을 정리함.
      // 남겨두면 재연결 직후 합류와 겹쳐 중복 emit되고 시도 횟수가 어긋남
      timeoutIds.forEach((timeoutId) => clearTimeout(timeoutId));
      timeoutIds.clear();
      joinAttemptCount = 0;
      joinOperatorRoom();
    };

    socket.on('stream-health', streamHealthHandler);
    socket.on('connect', connectHandler);

    if (socket.connected) {
      joinOperatorRoom();
    } else {
      connectionTimeoutId = scheduleTimeout(() => {
        if (!isDisposed) {
          setChannelState({
            subscriptionKey: currentSubscriptionKey,
            issue: 'connection-timeout',
          });
        }
      }, JOIN_ACK_TIMEOUT_MS);
    }

    return () => {
      isDisposed = true;
      if (connectionTimeoutId) {
        clearScheduledTimeout(connectionTimeoutId);
      }
      timeoutIds.forEach((timeoutId) => clearTimeout(timeoutId));
      timeoutIds.clear();
      socket.off('stream-health', streamHealthHandler);
      socket.off('connect', connectHandler);
    };
  }, [enabled, groupId, session, isExpiredSession]);

  return { alerts, channelIssue };
}
