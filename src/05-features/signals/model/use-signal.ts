import { useState, useCallback, useRef, useEffect } from 'react';
import { signalApi, EmotivMetrics } from '@/07-shared/api';

/**
 * [Feature] 그룹 ID와 인덱스를 기반으로 실시간 신호 전송을 제어함
 */
const useSignal = (groupId: string | null, subjectIndex: number | null) => {
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [currentMetrics, setCurrentMetrics] = useState<EmotivMetrics | null>(
    null
  );
  const [lastSentTime, setLastSentTime] = useState<string | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * 고유 상관 식별자(correlationId) 생성 수행함
   */
  const getCorrelationId = useCallback(() => {
    if (!groupId || subjectIndex === null) return null;
    return `${groupId}_${subjectIndex}`;
  }, [groupId, subjectIndex]);

  /**
   * 뇌파 지표 캡처 및 전송 로직 수행함
   */
  const captureAndSend = useCallback(async () => {
    const correlationId = getCorrelationId();
    if (!correlationId) return;

    // 파이썬 엔진에서 수신할 가상 데이터 생성함 (실제 연동 시 수정 필요함)
    const mockMetrics: EmotivMetrics = {
      engagement: Math.random(),
      interest: Math.random(),
      excitement: Math.random(),
      stress: Math.random(),
      relaxation: Math.random(),
      focus: Math.random(),
    };

    try {
      await signalApi.sendSignal(correlationId, mockMetrics);
      setCurrentMetrics(mockMetrics);
      setLastSentTime(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('신호 전송 실패함:', error);
    }
  }, [getCorrelationId]);

  /**
   * 실시간 측정 및 전송 시작함
   */
  const startMeasurement = useCallback(() => {
    if (isMeasuring) return;
    setIsMeasuring(true);
    // 1초 간격으로 서버에 지표 전송함
    intervalRef.current = setInterval(captureAndSend, 1000);
  }, [isMeasuring, captureAndSend]);

  /**
   * 측정 중지 및 타이머 해제 수행함
   */
  const stopMeasurement = useCallback(() => {
    setIsMeasuring(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return {
    isMeasuring,
    currentMetrics,
    lastSentTime,
    startMeasurement,
    stopMeasurement,
  };
};

export default useSignal;
