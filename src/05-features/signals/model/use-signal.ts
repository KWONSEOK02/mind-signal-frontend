'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { measurementApi, EmotivMetrics } from '@/07-shared/api';
import { engineApi } from '@/07-shared/api/engine';
import { getSocket } from '@/07-shared/lib/socket-client';
import { config } from '@/07-shared/config/config';
import type { StopReason } from '@/07-shared/types';

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
 * [Feature] sessionId 기반 실시간 EEG 측정 제어 훅 정의함
 * HTTP POST 1회로 측정 트리거 후 Socket.io eeg-live 이벤트로 데이터 수신함
 */
const useSignal = (sessionId: string | null) => {
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [currentMetrics, setCurrentMetrics] = useState<EmotivMetrics | null>(
    null
  );
  const [lastReceivedTime, setLastReceivedTime] = useState<string | null>(null);
  // 측정 경과 시간(초) 상태 정의함
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // 소켓 이벤트 핸들러 ref로 보관하여 정확한 off 처리 가능하게 함
  const handlerRef = useRef<((payload: EegLivePayload) => void) | null>(null);
  // measurement-complete 핸들러 ref 보관함
  const completeHandlerRef = useRef<
    ((payload: MeasurementCompletePayload) => void) | null
  >(null);
  // 경과 시간 인터벌 ref 보관함
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * 측정 시작 처리함
   * 백엔드에 1회 POST 후 eeg-live 소켓 이벤트 리스너 등록함
   */
  const startMeasurement = useCallback(async () => {
    if (isMeasuring || !sessionId) return;

    try {
      // Python 엔진 spawn 트리거 수행함
      await measurementApi.startMeasurement(sessionId);
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
    } catch (error) {
      console.error('측정 시작 실패함:', error);
    }
  }, [isMeasuring, sessionId]);

  /**
   * 측정 중지 처리함
   * 소켓 이벤트 리스너 해제 및 타이머 정지 수행함
   * groupId 전달 시 BE stop-all API 호출함 — elapsedSeconds 리셋 없이 유지함
   */
  const stopMeasurement = useCallback(
    async (groupId?: string, stopReason?: StopReason) => {
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

      // 타이머 정지함 — elapsedSeconds는 lab-page.tsx 결과 이동 판단에 필요하므로 리셋하지 않음
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // groupId가 전달되면 BE stop-all API 호출함
      if (groupId) {
        try {
          await engineApi.stopAll(groupId, stopReason ?? 'ManualEarly');
        } catch (err) {
          console.error('stop-all API 실패함:', err);
        }
      }
    },
    []
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

      // 타이머 정리함
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  return {
    isMeasuring,
    currentMetrics,
    lastReceivedTime,
    elapsedSeconds,
    startMeasurement,
    stopMeasurement,
  };
};

export default useSignal;
