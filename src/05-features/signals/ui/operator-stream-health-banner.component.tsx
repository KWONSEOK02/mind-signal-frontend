'use client';

import { useOperatorStreamHealth } from '../model/use-operator-stream-health';
import type {
  OperatorAlertChannelIssue,
  StreamHealthAlert,
} from '../model/use-operator-stream-health';

interface OperatorStreamHealthBannerProps {
  groupId: string | null;
  enabled: boolean;
  refreshKey?: number;
}

const CHANNEL_ISSUE_MESSAGES: Record<OperatorAlertChannelIssue, string> = {
  'missing-token': '운영자 소켓 토큰이 없음',
  'expired-token': '운영자 소켓 토큰이 만료됨',
  unauthorized: '운영자 경보 채널 인증이 거부됨',
  'connection-timeout': '소켓 연결 응답이 지연됨',
  'ack-timeout': '운영자 room 합류 응답이 지연됨',
  'join-failed': '운영자 room 합류에 실패함',
};

const formatSubjectLabel = (subjectIndex: number) =>
  `피실험자 ${String(subjectIndex).padStart(2, '0')}`;

const formatAlertDetail = (alert: StreamHealthAlert) => {
  const statusLabel =
    alert.status === 'disconnected' ? '연결 끊김' : '신호 정지';
  const sourceLabel = alert.source === 'engine' ? '엔진' : '백엔드';
  const silentSeconds =
    typeof alert.silentMs === 'number'
      ? ` · ${Math.round(alert.silentMs / 1000)}초 무응답`
      : '';
  return `${statusLabel} · ${sourceLabel} 감지${silentSeconds}`;
};

/**
 * 서버가 판정한 운영자 스트림 경보와 채널 상태를 상단 배너로 표시함.
 *
 * @param props - 그룹, 활성 여부, 토큰 갱신 식별자
 * @returns 경보 존재 시 비차단 배너, 경보 부재 시 null
 */
export function OperatorStreamHealthBanner({
  groupId,
  enabled,
  refreshKey = 0,
}: OperatorStreamHealthBannerProps) {
  const { alerts, channelIssue } = useOperatorStreamHealth(
    groupId,
    enabled,
    refreshKey
  );

  if (!enabled || (!channelIssue && alerts.length === 0)) return null;

  return (
    <section
      aria-label="서버 스트림 경보"
      className="max-w-[1600px] mx-auto mb-6 space-y-3"
    >
      {channelIssue ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-5 py-4 text-amber-100 shadow-lg shadow-amber-950/10"
        >
          <span
            aria-hidden="true"
            className="mt-1.5 h-3 w-3 shrink-0 rounded-full border-2 border-amber-300 bg-amber-400/30 shadow-[0_0_0_5px_rgba(251,191,36,0.12)]"
          />
          <div className="space-y-1">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-400">
              서버 경보 채널 미연결
            </p>
            <p className="text-sm font-medium leading-relaxed">
              실험은 진행 중이나 스트림 경보 채널이 연결되지 않음.{' '}
              {CHANNEL_ISSUE_MESSAGES[channelIssue]}.
            </p>
          </div>
        </div>
      ) : null}

      {alerts.map((alert) => (
        <div
          key={alert.subjectIndex}
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-5 py-4 text-rose-100 shadow-lg shadow-rose-950/10"
        >
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-rose-400 text-xs font-black text-rose-950"
          >
            !
          </span>
          <div className="space-y-1">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-400">
              서버 스트림 경보
            </p>
            <p className="text-sm font-bold">
              {formatSubjectLabel(alert.subjectIndex)}
            </p>
            <p className="text-xs font-medium text-rose-200/80">
              {formatAlertDetail(alert)}
            </p>
          </div>
        </div>
      ))}
    </section>
  );
}
