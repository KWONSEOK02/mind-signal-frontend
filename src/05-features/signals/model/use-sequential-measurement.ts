'use client';

import { useState, useCallback } from 'react';
import { analysisApi } from '@/07-shared/api/analysis';
import useSignal from './use-signal';

/**
 * SEQUENTIAL 측정 상태 머신 상태 타입 정의함
 * READY → SUBJECT_1_MEASURING → SUBJECT_1_DONE → SUBJECT_2_READY
 *       → SUBJECT_2_MEASURING → SUBJECT_2_DONE → ANALYZING → COMPLETED
 *       (any step) → SESSION_ABORTED
 */
export type SequentialMeasurementState =
  | 'READY'
  | 'SUBJECT_1_MEASURING'
  | 'SUBJECT_1_DONE'
  | 'SUBJECT_2_READY'
  | 'SUBJECT_2_MEASURING'
  | 'SUBJECT_2_DONE'
  | 'ANALYZING'
  | 'COMPLETED'
  | 'SESSION_ABORTED';

/**
 * [Feature] 두 피실험자의 순차 측정을 관리하는 훅 정의함
 * Subject 1 측정 완료 후 Subject 2 측정을 진행하며 최종 분석 요청 수행함
 */
export function useSequentialMeasurement(
  sessionId1: string | null,
  sessionId2: string | null,
  groupId: string | null
) {
  const [state, setState] = useState<SequentialMeasurementState>('READY');

  // 각 피실험자별 신호 훅 인스턴스 생성함
  const subject1Signal = useSignal(sessionId1);
  const subject2Signal = useSignal(sessionId2);

  /**
   * 지정된 피실험자 측정 시작 처리함
   * Subject 1은 READY 상태에서만, Subject 2는 SUBJECT_1_DONE 상태에서만 시작 가능함
   */
  const startSubject = useCallback(
    (index: 1 | 2) => {
      if (index === 1) {
        // READY 상태에서만 Subject 1 측정 시작 허용함
        if (state !== 'READY') return;
        subject1Signal.startMeasurement();
        setState('SUBJECT_1_MEASURING');
      } else {
        // SUBJECT_1_DONE 상태에서만 Subject 2 측정 시작 허용함
        if (state !== 'SUBJECT_1_DONE') return;
        subject2Signal.startMeasurement();
        setState('SUBJECT_2_MEASURING');
      }
    },
    [state, subject1Signal, subject2Signal]
  );

  /**
   * 현재 측정 중인 피실험자의 측정 중지 처리함
   */
  const stopCurrentSubject = useCallback(() => {
    if (state === 'SUBJECT_1_MEASURING') {
      void subject1Signal.stopMeasurement();
      setState('SUBJECT_1_DONE');
    } else if (state === 'SUBJECT_2_MEASURING') {
      void subject2Signal.stopMeasurement();
      setState('SUBJECT_2_DONE');
    }
    // 다른 상태에서는 무시함
  }, [state, subject1Signal, subject2Signal]);

  /**
   * 분석 요청 수행함
   * SUBJECT_2_DONE 상태에서만 호출 가능하며 ANALYZING → COMPLETED 전환함
   */
  const triggerAnalysis = useCallback(async () => {
    if (state !== 'SUBJECT_2_DONE' || !groupId) return;

    setState('ANALYZING');
    try {
      await analysisApi.postSequentialAnalysis(groupId);
      setState('COMPLETED');
    } catch {
      setState('SESSION_ABORTED');
    }
  }, [state, groupId]);

  /**
   * 세션 중단 처리함 — 임의 상태에서 SESSION_ABORTED로 전환함
   */
  const abort = useCallback(() => {
    // 측정 중이면 정리 수행함
    if (state === 'SUBJECT_1_MEASURING') {
      void subject1Signal.stopMeasurement();
    } else if (state === 'SUBJECT_2_MEASURING') {
      void subject2Signal.stopMeasurement();
    }
    setState('SESSION_ABORTED');
  }, [state, subject1Signal, subject2Signal]);

  return {
    state,
    startSubject,
    stopCurrentSubject,
    triggerAnalysis,
    abort,
    subject1Metrics: subject1Signal.currentMetrics,
    subject2Metrics: subject2Signal.currentMetrics,
    subject1ElapsedSeconds: subject1Signal.elapsedSeconds,
    subject2ElapsedSeconds: subject2Signal.elapsedSeconds,
  };
}

export default useSequentialMeasurement;
