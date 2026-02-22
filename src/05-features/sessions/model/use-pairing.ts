import { useState, useEffect, useCallback, useRef } from 'react';
import { authApi, PairingSessionStatus } from '@/07-shared/api/auth';
import { config as appConfig } from '@/07-shared/config/config';
import { AxiosError } from 'axios';

/**
 * UI 전용 상태(IDLE, LOADING, PENDING)를 포함한 페어링 상태 타입 정의함
 */
export type PairingUIStatus =
  | PairingSessionStatus
  | 'IDLE'
  | 'LOADING'
  | 'PENDING';

/**
 * [Model] 기기 페어링 상태 관리 및 타이머 로직을 제어하는 커스텀 훅 정의함
 */
const usePairing = () => {
  const [status, setStatus] = useState<PairingUIStatus>('IDLE');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(
    appConfig.session.pairingTimeout
  );
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * 활성화된 타이머 인스턴스 제거 수행함
   */
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /**
   * 페어링 관련 모든 로컬 상태 초기값으로 리셋함
   */
  const resetStatus = useCallback(() => {
    clearTimer();
    setStatus('IDLE');
    setPairingCode(null);
    setTimeLeft(appConfig.session.pairingTimeout);
  }, [clearTimer]);

  /**
   * 신규 페어링 세션 발급 및 만료 타이머 시작함
   */
  const startPairing = useCallback(async () => {
    setStatus('LOADING');
    clearTimer();
    try {
      const response = await authApi.createdPairing();
      const res = response.data;

      if (res.status === 'success') {
        setPairingCode(res.data.pairingToken);
        setStatus('PENDING');
        setTimeLeft(appConfig.session.pairingTimeout);

        timerRef.current = setInterval(() => {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              clearTimer();
              setStatus('EXPIRED');
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setStatus('ERROR');
      }
    } catch (error) {
      console.error('페어링 시작 실패함:', error);
      setStatus('ERROR');
    }
  }, [clearTimer]);

  /**
   * 모바일 스캔 코드 검증 및 최종 페어링 승인 수행함
   */
  const requestPairing = useCallback(
    async (scannedCode: string) => {
      setStatus('LOADING');
      try {
        const response = await authApi.verifyPairing(scannedCode);
        const res = response.data;

        if (res.status === 'success' && res.data.status === 'PAIRED') {
          setStatus('PAIRED');
          clearTimer();
          return { success: true };
        }
        return { success: false, message: res.message };
      } catch (error) {
        const axiosError = error as AxiosError;

        // 410 상태 코드 판별 및 에러 로그 기록함
        console.error('Pairing 검증 중 오류 발생함:', axiosError);

        const errorStatus: PairingUIStatus =
          axiosError.response?.status === 410 ? 'EXPIRED' : 'ERROR';
        setStatus(errorStatus);
        return { success: false, errorStatus };
      }
    },
    [clearTimer]
  );

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  return {
    status,
    pairingCode,
    timeLeft,
    startPairing,
    requestPairing,
    resetStatus,
  };
};

export default usePairing;
