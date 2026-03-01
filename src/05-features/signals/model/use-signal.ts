import { useState, useCallback, useRef } from 'react';
import { signalApi, EmotivMetrics } from '@/07-shared/api';

/**
 * [Model] 실시간 EMOTIV 지표 전송 및 타임스탬프 상태 관리 훅임
 */
const useSignal = (sessionId: string | null) => {
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [currentMetrics, setCurrentMetrics] = useState<EmotivMetrics | null>(
    null
  );
  const [lastSentTime, setLastSentTime] = useState<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * 데이터를 캡처하여 Redis로 전송하고 성공 시 타임스탬프 갱신함
   */
  const captureAndSend = useCallback(async () => {
    if (!sessionId) return;

    const mockMetrics: EmotivMetrics = {
      engagement: Math.random(),
      interest: Math.random(),
      excitement: Math.random(),
      stress: Math.random(),
      relaxation: Math.random(),
      focus: Math.random(),
    };

    const payload = {
      sessionId,
      timestamp: Date.now(),
      metrics: mockMetrics,
    };

    try {
      // API 호출은 부수 효과(Side Effect)이므로 이곳에서의 Date.now 사용은 허용됨
      await signalApi.sendRealtimeData(payload);

      // 상태 업데이트를 통해 안정적인 렌더링 데이터 제공함
      setCurrentMetrics(mockMetrics);
      setLastSentTime(Date.now());
    } catch (error) {
      console.error('Signal transmission failed:', error);
    }
  }, [sessionId]);

  /**
   * 측정 시작 인터벌 설정함
   */
  const startMeasurement = useCallback(() => {
    if (!sessionId) return;
    setIsMeasuring(true);
    intervalRef.current = setInterval(captureAndSend, 100);
  }, [sessionId, captureAndSend]);

  /**
   * 측정 중지 및 상태 초기화 수행함
   */
  const stopMeasurement = useCallback(() => {
    setIsMeasuring(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  return {
    isMeasuring,
    currentMetrics,
    lastSentTime, // 컴포넌트에서 직접 호출하지 않도록 안정적인 상태값 반환함
    startMeasurement,
    stopMeasurement,
  };
};

export default useSignal;
