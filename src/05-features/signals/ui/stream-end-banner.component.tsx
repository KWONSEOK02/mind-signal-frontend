'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { MIN_ANALYSIS_SECONDS } from '@/07-shared/constants/experiment';

/** 마지막 샘플 이후 이 시간이 지나면 스트림이 멈춘 것으로 본다(ms). 백엔드 checkStale과 같은 값 */
const STALE_THRESHOLD_MS = 20_000;

/** 판정 갱신 주기(ms). 배너는 초 단위 정확도가 필요하지 않다 */
const TICK_MS = 5_000;

interface StreamEndBannerProps {
  /** DUAL_2PC 측정 중일 때만 true. 그 밖에는 판정 자체를 하지 않는다 */
  enabled: boolean;
  /** 측정 경과 시간(초) */
  elapsedSeconds: number;
  /** subject 1 마지막 샘플 수신 시각(epoch ms). null은 미수신 */
  lastSampleAt1: number | null;
  /** subject 2 마지막 샘플 수신 시각(epoch ms). null은 미수신 */
  lastSampleAt2: number | null;
}

/**
 * DE 자연 종료 추정 배너를 표시함.
 *
 * 화면은 `measurement-complete` 소켓 이벤트로만 측정 종료를 안다. 그 이벤트는 백엔드가
 * 두 subject 모두 COMPLETED일 때만 발행하고, COMPLETED 전이는 stop 경로에서만 일어난다.
 * 그래서 DE가 제 시간을 채우고 스스로 끝내도 화면은 계속 측정 중으로 남는다.
 * 이 배너는 그 상태를 운영자에게 알린다.
 *
 * ponytail: 알리기만 하고 stop을 대신 호출하지 않는다. 판정이 틀렸을 때
 * 살아 있는 스트림을 끊는 피해가 되돌릴 수 없다. 조작 수단(실험 중지 버튼)은 이미 있다.
 *
 * @param props - 활성 여부, 경과 시간, 양 subject 마지막 수신 시각
 * @returns 종료 추정 시 비차단 배너, 그 밖에는 null
 */
export function StreamEndBanner({
  enabled,
  elapsedSeconds,
  lastSampleAt1,
  lastSampleAt2,
}: StreamEndBannerProps) {
  // 판정이 현재 시각에 의존한다. 시계는 React 밖의 값이라 useSyncExternalStore로 읽는다.
  // 렌더 중 Date.now() 직접 호출(불순)과 effect 내 setState(연쇄 렌더) 둘 다 피한다.
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!enabled) return () => {};
      const id = setInterval(onChange, TICK_MS);
      return () => clearInterval(id);
    },
    [enabled]
  );
  // TICK_MS 단위로 내림해 tick 사이에는 같은 값을 돌려준다.
  // 매번 다른 값을 주면 getSnapshot이 불안정해져 무한 렌더가 된다
  const now = useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / TICK_MS) * TICK_MS,
    () => 0
  );

  if (!enabled) return null;
  // 초반 연결 지연을 종료로 오판하지 않도록 최소 분석 시간을 먼저 넘겨야 한다
  if (elapsedSeconds < MIN_ANALYSIS_SECONDS) return null;

  const isStale = (at: number | null) =>
    at === null || now - at >= STALE_THRESHOLD_MS;
  // 한쪽만 멈춘 것은 종료가 아니라 그쪽 헤드셋 문제다. 양쪽이 멈춰야 종료로 본다
  if (!isStale(lastSampleAt1) || !isStale(lastSampleAt2)) return null;

  return (
    <section
      aria-label="측정 종료 추정"
      className="max-w-[1600px] mx-auto mb-6"
    >
      <div
        role="status"
        className="flex items-start gap-3 rounded-2xl border border-sky-400/30 bg-sky-500/10 px-5 py-4 text-sky-100 shadow-lg shadow-sky-950/10"
      >
        <span
          aria-hidden="true"
          className="mt-1.5 h-3 w-3 shrink-0 rounded-full border-2 border-sky-300 bg-sky-400/30 shadow-[0_0_0_5px_rgba(56,189,248,0.12)]"
        />
        <div className="space-y-1">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-400">
            측정 종료로 보임
          </p>
          <p className="text-sm font-medium leading-relaxed">
            양쪽 스트림이 20초 이상 멈췄습니다. DE 자연 종료로 보입니다. CSV
            도착을 확인한 뒤 실험 중지를 눌러 세션을 마무리하세요.
          </p>
        </div>
      </div>
    </section>
  );
}
