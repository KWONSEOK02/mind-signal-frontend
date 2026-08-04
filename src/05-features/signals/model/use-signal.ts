'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { measurementApi, EmotivMetrics } from '@/07-shared/api';
import { engineApi } from '@/07-shared/api/engine';
import { getSocket } from '@/07-shared/lib/socket-client';
import { config } from '@/07-shared/config/config';
import type { StopReason } from '@/07-shared/types';
import type { DualSessionState } from '@/05-features/sessions/model/use-dual-session';

/**
 * eeg-live 소켓 이벤트 페이로드 구조 정의함
 */
interface EegLivePayload {
  sessionId: string;
  data: EmotivMetrics;
}

/**
 * measurement-complete 소켓 이벤트 페이로드 구조 정의함
 */
interface MeasurementCompletePayload {
  sessionId: string;
}

/**
 * dual-session-ready 이벤트 페이로드 구조 정의함 (PLAN L150)
 */
interface DualSessionReadyPayload {
  groupId: string;
  timestamp_ms: number;
}

/**
 * dual-session-failed 이벤트 페이로드 구조 정의함 (PLAN L151)
 */
interface DualSessionFailedPayload {
  groupId: string;
  error: string;
}

/**
 * stimulus_start 이벤트 페이로드 구조 정의함 (PLAN L152)
 */
interface StimulusStartPayload {
  groupId: string;
  timestamp_ms: number;
}

/**
 * WavePower 구조 — aligned_pair 페이로드에서 사용함 (PLAN L303-309)
 */
interface WavePower {
  delta: number;
  theta: number;
  alpha: number;
  beta: number;
  gamma: number;
}

/**
 * aligned_pair 이벤트 페이로드 구조 정의함 (PLAN L153, v8 H-1)
 * subject_0 키 사용 금지 — subject_1/subject_2 1-based 통일
 */
/**
 * 한 subject의 한 시점 샘플 — waves(대역 파워)와 metrics(EMOTIV 지표 6종).
 * metrics는 구버전 BE 프레임에서 없을 수 있어 optional임.
 */
interface SubjectSample {
  waves: WavePower;
  metrics?: EmotivMetrics;
}

interface AlignedPairPayload {
  groupId: string;
  timestamp_ms: number;
  subject_1: SubjectSample | null;
  subject_2: SubjectSample | null;
}

/**
 * join-room ack 응답 구조 정의함 (PLAN L276)
 */
interface JoinRoomAck {
  ok: boolean;
  groupId?: string;
  error?: string;
}

/**
 * useSignal 훅 옵션 정의함
 */
interface UseSignalOptions {
  /** DUAL_2PC 모드 활성화 여부 */
  experimentMode?: string;
  /** DUAL_2PC 세션의 groupId */
  groupId?: string | null;
  /** DUAL_2PC 세션 상태 변경 콜백 (v3 N-5: 202 Accepted 수신 시 'joining' 전이) */
  setDualSessionState?: (s: DualSessionState) => void;
}

/**
 * WavePower를 EmotivMetrics로 변환함 (간이 변환). 비유한(NaN/Infinity) 값이
 * 하나라도 있으면 null 반환해 차트 깨짐을 방지함 — eeg-live 경로 finite 검증과 정합.
 * subject_1/subject_2 동일 적용 (CodeRabbit #60).
 *
 * @param wave - 5대역 파워 값
 * @returns EmotivMetrics 또는 비유한 값 포함 시 null
 */
const METRIC_KEYS = [
  'focus',
  'engagement',
  'interest',
  'excitement',
  'stress',
  'relaxation',
] as const;

/**
 * aligned_pair가 실어 보낸 EMOTIV 지표를 검증함.
 *
 * 과거에는 metrics가 계약에 없어 대역 파워(waves)를 지표 자리에 끼워 넣었음
 * (stress에 delta, engagement과 relaxation 둘 다 alpha). delta는 약 1000 스케일이라
 * 차트 X축 domain [0,100]에서 포화돼 stress 막대만 꽉 찼음 (2026-07-10 수정).
 *
 * @param metrics - 서버가 보낸 지표 6종. 구버전 프레임에서는 undefined임
 * @returns 6종이 모두 유한수면 그대로 반환, 아니면 null 반환
 */
const sanitizeMetrics = (
  metrics: EmotivMetrics | undefined
): EmotivMetrics | null => {
  if (!metrics) return null;
  if (!METRIC_KEYS.every((k) => Number.isFinite(metrics[k]))) return null;
  return metrics;
};

/**
 * [Feature] sessionId 기반 실시간 EEG 측정 제어 훅 정의함
 * HTTP POST 1회로 측정 트리거 후 Socket.io eeg-live 이벤트로 데이터 수신함
 *
 * DUAL_2PC 모드 추가 지원 (Phase 16 FE-5):
 * - 소켓 연결 직후 join-room emit + ack 5초 timeout + 재시도 1회
 * - dual-session-ready 이벤트 수신 → setIsMeasuring(true) 전이 (v3 N-5)
 * - dual-session-failed 이벤트 수신 → 에러 처리
 * - stimulus_start 이벤트 수신 → 로컬 수신 시각 기록
 * - aligned_pair 이벤트 수신 → DUAL_2PC 측정 데이터 처리
 */
const useSignal = (sessionId: string | null, options?: UseSignalOptions) => {
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [currentMetrics, setCurrentMetrics] = useState<EmotivMetrics | null>(
    null
  );
  // 단일 헤드셋 지원 — subject 2(노트북 B) 메트릭 상태 정의함
  const [currentMetrics2, setCurrentMetrics2] = useState<EmotivMetrics | null>(
    null
  );
  const [lastReceivedTime, setLastReceivedTime] = useState<string | null>(null);
  // subject별 마지막 샘플 수신 시각(epoch ms) — LIVE 배지 신선도 판정용임.
  // 공용 lastReceivedTime만 쓰면 한쪽만 살아 있어도 양쪽이 LIVE로 보임 (2026-07-10 수정).
  const [lastSampleAt1, setLastSampleAt1] = useState<number | null>(null);
  const [lastSampleAt2, setLastSampleAt2] = useState<number | null>(null);
  // 측정 경과 시간(초) 상태 정의함
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  // 소켓 룸 합류 완료 여부 상태 정의함
  const [roomJoined, setRoomJoined] = useState(false);

  // 소켓 이벤트 핸들러 ref로 보관하여 정확한 off 처리 가능하게 함
  const handlerRef = useRef<((payload: EegLivePayload) => void) | null>(null);
  // measurement-complete 핸들러 ref 보관함
  const completeHandlerRef = useRef<
    ((payload: MeasurementCompletePayload) => void) | null
  >(null);
  // DUAL_2PC 전용 핸들러 ref 보관함
  const dualReadyHandlerRef = useRef<
    ((payload: DualSessionReadyPayload) => void) | null
  >(null);
  const dualFailedHandlerRef = useRef<
    ((payload: DualSessionFailedPayload) => void) | null
  >(null);
  const stimulusHandlerRef = useRef<
    ((payload: StimulusStartPayload) => void) | null
  >(null);
  const alignedPairHandlerRef = useRef<
    ((payload: AlignedPairPayload) => void) | null
  >(null);
  // 로컬 stimulus 수신 시각 ref 보관함
  const stimulusLocalTimeRef = useRef<number | null>(null);
  // 경과 시간 인터벌 ref 보관함
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isDual2pc = options?.experimentMode === 'DUAL_2PC';
  const groupId = options?.groupId ?? null;
  const setDualSessionState = options?.setDualSessionState;

  /**
   * join-room emit 처리함 (ack 5초 timeout + 재시도 1회) (PLAN L148, L274-281)
   * 재시도는 단일 helper 내부에서 처리하여 재귀 참조 문제 회피함
   */
  const emitJoinRoom = useCallback((gid: string) => {
    const socket = getSocket(config.api.socketUrl ?? config.api.baseUrl);

    /** 단일 emit + ack 처리 내부 helper 정의함 */
    const doEmit = (isRetry: boolean) => {
      let ackReceived = false;

      const timeoutId = setTimeout(() => {
        if (!ackReceived && !isRetry) {
          // 5초 내 ack 없으면 재시도 1회 수행함
          console.warn('join-room ack timeout — 재시도 1회 수행함');
          doEmit(true);
        } else if (!ackReceived) {
          console.error('join-room ack 재시도도 실패함');
        }
      }, 5000);

      socket.emit('join-room', gid, (response: JoinRoomAck) => {
        ackReceived = true;
        clearTimeout(timeoutId);
        if (response.ok) {
          setRoomJoined(true);
        } else {
          console.error('join-room 실패함:', response.error);
        }
      });
    };

    doEmit(false);
  }, []);

  /**
   * DUAL_2PC 소켓 이벤트 리스너 등록 처리함 (PLAN L150-168)
   */
  const registerDualListeners = useCallback(
    (gid: string) => {
      const socket = getSocket(config.api.socketUrl ?? config.api.baseUrl);

      // 이전 등록분을 먼저 해제함. 시작이 실패한 뒤 다시 누르면 같은 소켓에
      // 핸들러가 겹쳐 붙어 이벤트 1건이 여러 번 처리됨
      if (dualReadyHandlerRef.current) {
        socket.off('dual-session-ready', dualReadyHandlerRef.current);
      }
      if (dualFailedHandlerRef.current) {
        socket.off('dual-session-failed', dualFailedHandlerRef.current);
      }
      if (stimulusHandlerRef.current) {
        socket.off('stimulus_start', stimulusHandlerRef.current);
      }
      if (alignedPairHandlerRef.current) {
        socket.off('aligned_pair', alignedPairHandlerRef.current);
      }

      // dual-session-ready: 202 수신 후 BE 준비 완료 시 측정 시작 전이 (v3 N-5)
      const dualReadyHandler = ({
        groupId: incomingGid,
        timestamp_ms,
      }: DualSessionReadyPayload) => {
        if (incomingGid !== gid) return; // 다른 그룹 이벤트 무시함
        // v3 N-5: 202 Accepted 직후 setIsMeasuring(true) 금지, 이 이벤트 수신 시에만 전이함
        setIsMeasuring(true);
        setDualSessionState?.('measuring');
        // 경과 시간 타이머 시작함
        timerRef.current = setInterval(() => {
          setElapsedSeconds((prev) => prev + 1);
        }, 1000);
        // 서버 timestamp 기준 skew 로깅함 (로컬 수신 시각과 비교용)
        console.info(
          `dual-session-ready 수신: server_ts=${timestamp_ms}, local_ts=${Date.now()}, skew=${Date.now() - timestamp_ms}ms`
        );
      };

      // dual-session-failed: 에러 표시 + 측정 중 해제 (PLAN L151)
      const dualFailedHandler = ({
        groupId: incomingGid,
        error,
      }: DualSessionFailedPayload) => {
        if (incomingGid !== gid) return; // 다른 그룹 이벤트 무시함
        setIsMeasuring(false);
        setDualSessionState?.('aborted');
        console.error('DUAL_2PC 측정 실패함:', error);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };

      // stimulus_start: 로컬 수신 시각 기록 + skew 계산 (PLAN L152)
      const stimulusHandler = ({
        groupId: incomingGid,
        timestamp_ms,
      }: StimulusStartPayload) => {
        if (incomingGid !== gid) return; // 다른 그룹 이벤트 무시함
        const localReceivedAt = Date.now();
        stimulusLocalTimeRef.current = localReceivedAt;
        console.info(
          `stimulus_start 수신: server_ts=${timestamp_ms}, local_ts=${localReceivedAt}, skew=${localReceivedAt - timestamp_ms}ms`
        );
      };

      // aligned_pair: DUAL_2PC 모드 전용 측정 데이터 처리 (PLAN L153, v8 H-1)
      // payload: {groupId, timestamp_ms, subject_1, subject_2} — subject_0 키 사용 금지
      const alignedPairHandler = ({
        groupId: incomingGid,
        subject_1,
        subject_2,
      }: AlignedPairPayload) => {
        if (incomingGid !== gid) return; // 다른 그룹 이벤트 무시함
        // subject_1 데이터 기준으로 currentMetrics 업데이트함 (finite 검증, CodeRabbit #60)
        if (subject_1) {
          const metrics = sanitizeMetrics(subject_1.metrics);
          if (metrics) {
            setCurrentMetrics(metrics);
            setLastSampleAt1(Date.now());
            setLastReceivedTime(new Date().toLocaleTimeString());
          }
        }
        // subject_2(노트북 B) 데이터 → currentMetrics2 업데이트함 (단일 헤드셋 지원)
        if (subject_2) {
          const metrics2 = sanitizeMetrics(subject_2.metrics);
          if (metrics2) {
            setCurrentMetrics2(metrics2);
            setLastSampleAt2(Date.now());
            setLastReceivedTime(new Date().toLocaleTimeString());
          }
        }
      };

      dualReadyHandlerRef.current = dualReadyHandler;
      dualFailedHandlerRef.current = dualFailedHandler;
      stimulusHandlerRef.current = stimulusHandler;
      alignedPairHandlerRef.current = alignedPairHandler;

      socket.on('dual-session-ready', dualReadyHandler);
      socket.on('dual-session-failed', dualFailedHandler);
      socket.on('stimulus_start', stimulusHandler);
      socket.on('aligned_pair', alignedPairHandler);
    },
    [setDualSessionState]
  );

  /**
   * DUAL_2PC 소켓 이벤트 리스너 해제 처리함
   */
  const unregisterDualListeners = useCallback(() => {
    const socket = getSocket(config.api.socketUrl ?? config.api.baseUrl);

    if (dualReadyHandlerRef.current) {
      socket.off('dual-session-ready', dualReadyHandlerRef.current);
      dualReadyHandlerRef.current = null;
    }
    if (dualFailedHandlerRef.current) {
      socket.off('dual-session-failed', dualFailedHandlerRef.current);
      dualFailedHandlerRef.current = null;
    }
    if (stimulusHandlerRef.current) {
      socket.off('stimulus_start', stimulusHandlerRef.current);
      stimulusHandlerRef.current = null;
    }
    if (alignedPairHandlerRef.current) {
      socket.off('aligned_pair', alignedPairHandlerRef.current);
      alignedPairHandlerRef.current = null;
    }
  }, []);

  /**
   * DUAL_2PC 소켓 룸 합류 + 리스너 등록만 수행함 (HTTP spawn 없음).
   * 측정은 그룹 단위 startDualByGroup으로 트리거되고, FE는 이 메서드로 룸에 합류해
   * aligned_pair를 수신함 — handleStartExperiment(DUAL_2PC)에서 호출.
   */
  const joinDualRoom = useCallback(() => {
    if (!isDual2pc || !groupId) return;
    // 여기서 setIsMeasuring(true) 를 하지 않음. 룸 합류는 리스너를 붙이는
    // 준비 단계일 뿐이고 측정이 시작된 것이 아님. 시작 전이는 아래
    // registerDualListeners 의 dual-session-ready 핸들러가 단독으로 담당함
    // (v3 N-5). 여기서 미리 켜면 startDualByGroup 이 실패해도 화면은 측정
    // 중으로 보임 — DUAL_2PC 가 기본 모드가 되면서 이 경로가 기본 흐름이 됨
    setDualSessionState?.('joining');

    const socket = getSocket(config.api.socketUrl ?? config.api.baseUrl);
    emitJoinRoom(groupId);
    registerDualListeners(groupId);

    const completeHandler = (
      payload: MeasurementCompletePayload & { groupId?: string }
    ) => {
      if ((payload.groupId ?? null) !== groupId) return; // 다른 그룹 무시함
      setIsMeasuring(false);
      setDualSessionState?.('completed');
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    completeHandlerRef.current = completeHandler;
    socket.on('measurement-complete', completeHandler);
  }, [
    isDual2pc,
    groupId,
    setDualSessionState,
    emitJoinRoom,
    registerDualListeners,
  ]);

  /**
   * 측정 시작 처리함
   *
   * DUAL_2PC: 202 Accepted 수신 → setIsMeasuring(true) 즉시 금지 (v3 N-5)
   *           dual-session-ready 이벤트 수신 시에만 setIsMeasuring(true) 전이함
   * 기존 모드: 200 OK 수신 즉시 setIsMeasuring(true) 전이함
   */
  const startMeasurement = useCallback(async () => {
    if (isMeasuring || !sessionId) return;

    try {
      // Python 엔진 spawn 트리거 수행함
      await measurementApi.startMeasurement(sessionId);

      if (isDual2pc && groupId) {
        // DUAL_2PC: 202 Accepted 수신 — 아직 측정 시작 안 됨 (PLAN L160-163)
        // setIsMeasuring(true) 호출 금지 — dual-session-ready 이벤트 대기함
        setDualSessionState?.('joining');

        const socket = getSocket(config.api.socketUrl ?? config.api.baseUrl);

        // 소켓 연결 직후 join-room emit 수행함 (PLAN L148, L276)
        emitJoinRoom(groupId);

        // DUAL_2PC 전용 이벤트 리스너 등록함
        registerDualListeners(groupId);

        // measurement-complete (DUAL_2PC 경우 room emit — groupId 매칭)
        const completeHandler = (
          payload: MeasurementCompletePayload & { groupId?: string }
        ) => {
          const incomingGroupId = payload.groupId ?? null;
          if (incomingGroupId !== groupId) return; // 다른 그룹 이벤트 무시함
          setIsMeasuring(false);
          setDualSessionState?.('completed');
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
        };
        completeHandlerRef.current = completeHandler;
        socket.on('measurement-complete', completeHandler);
      } else {
        // DUAL/BTI 기존 경로 — 200 OK 즉시 전이 (PLAN L164-167)
        setIsMeasuring(true);

        const socket = getSocket(config.api.socketUrl ?? config.api.baseUrl);

        // eeg-live 이벤트 핸들러 등록 및 ref 보관함
        const handler = ({ sessionId: incomingId, data }: EegLivePayload) => {
          if (incomingId !== sessionId) return; // 다른 세션 데이터 무시함
          // 6개 지표가 모두 유한한 숫자인지 검증함 (NaN/undefined 방어 처리함)
          if (
            !data ||
            !isFinite(data.engagement) ||
            !isFinite(data.interest) ||
            !isFinite(data.excitement) ||
            !isFinite(data.stress) ||
            !isFinite(data.relaxation) ||
            !isFinite(data.focus)
          )
            return;
          setCurrentMetrics(data);
          setLastSampleAt1(Date.now());
          setLastReceivedTime(new Date().toLocaleTimeString());
        };

        handlerRef.current = handler;
        socket.on('eeg-live', handler);

        // measurement-complete 이벤트 수신함
        const completeHandler = ({
          sessionId: incomingId,
        }: MeasurementCompletePayload) => {
          if (incomingId !== sessionId) return; // 다른 세션 완료 신호 무시함
          setIsMeasuring(false);
          // 타이머 정지함 — elapsedSeconds는 lab-page.tsx 결과 이동 판단에 필요하므로 리셋하지 않음
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
        };

        completeHandlerRef.current = completeHandler;
        socket.on('measurement-complete', completeHandler);

        // 경과 시간 타이머 시작함
        timerRef.current = setInterval(() => {
          setElapsedSeconds((prev) => prev + 1);
        }, 1000);
      }
    } catch (error) {
      console.error('측정 시작 실패함:', error);
    }
  }, [
    isMeasuring,
    sessionId,
    isDual2pc,
    groupId,
    setDualSessionState,
    emitJoinRoom,
    registerDualListeners,
  ]);

  /**
   * 측정 중지 처리함
   * 소켓 이벤트 리스너 해제 및 타이머 정지 수행함
   * groupId 전달 시 BE stop-all API 호출함 — elapsedSeconds 리셋 없이 유지함
   */
  const stopMeasurement = useCallback(
    async (stopGroupId?: string, stopReason?: StopReason) => {
      setIsMeasuring(false);

      const socket = getSocket(config.api.socketUrl ?? config.api.baseUrl);

      if (handlerRef.current) {
        socket.off('eeg-live', handlerRef.current);
        handlerRef.current = null;
      }

      // measurement-complete 리스너 해제함
      if (completeHandlerRef.current) {
        socket.off('measurement-complete', completeHandlerRef.current);
        completeHandlerRef.current = null;
      }

      // DUAL_2PC 전용 리스너 해제함
      unregisterDualListeners();

      // 타이머 정지함 — elapsedSeconds는 lab-page.tsx 결과 이동 판단에 필요하므로 리셋하지 않음
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // groupId가 전달되면 BE stop-all API 호출함
      if (stopGroupId) {
        try {
          await engineApi.stopAll(stopGroupId, stopReason ?? 'ManualEarly');
        } catch (err) {
          console.error('stop-all API 실패함:', err);
        }
      }
    },
    [unregisterDualListeners]
  );

  // 언마운트 시 소켓 리스너 및 타이머 정리함
  useEffect(() => {
    return () => {
      const socket = getSocket(config.api.socketUrl ?? config.api.baseUrl);

      if (handlerRef.current) {
        socket.off('eeg-live', handlerRef.current);
        handlerRef.current = null;
      }

      // measurement-complete 리스너 정리함
      if (completeHandlerRef.current) {
        socket.off('measurement-complete', completeHandlerRef.current);
        completeHandlerRef.current = null;
      }

      // DUAL_2PC 전용 리스너 정리함
      unregisterDualListeners();

      // 타이머 정리함
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [unregisterDualListeners]);

  return {
    isMeasuring,
    currentMetrics,
    currentMetrics2,
    lastReceivedTime,
    lastSampleAt1,
    lastSampleAt2,
    elapsedSeconds,
    roomJoined,
    startMeasurement,
    joinDualRoom,
    stopMeasurement,
  };
};

export default useSignal;
