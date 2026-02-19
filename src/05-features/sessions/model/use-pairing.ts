import { useState, useEffect, useCallback, useRef } from 'react';
import { authApi, PairingResponse } from '@/07-shared/api/auth';
import { config as appConfig } from '@07-shared/config/config';
import { AxiosError } from 'axios';

/**
 * 백엔드 공통 응답 규격 정의함
 */
interface BackendResponse<T> {
  status: string;
  data: T;
  message?: string;
}

/**
 * 페어링 데이터 상세 타입 정의함
 */
interface PairingData {
  pairingToken: string;
  expiresAt: string | number | Date;
}

/**
 * [Model] 기기 페어링 상태 및 타이머 관리 훅 정의함
 */
export const usePairing = () => {
  const [status, setStatus] = useState<
    PairingResponse['status'] | 'IDLE' | 'LOADING'
  >('IDLE');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(
    appConfig.session.pairingTimeout
  );
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /**
   * 백엔드 API 응답 파싱 및 타이머 구동 수행함
   */
  const startPairing = useCallback(async () => {
    setStatus('LOADING');
    clearTimer();
    try {
      const response = await authApi.createdPairing();
      // any 제거하고 BackendResponse 타입을 지정함
      const res = response.data as BackendResponse<PairingData>;

      if (res.status === 'success' && res.data) {
        const { pairingToken, expiresAt } = res.data;

        if (pairingToken && expiresAt) {
          setPairingCode(pairingToken);
          setStatus('CREATED');

          const expiryMs = new Date(expiresAt).getTime();
          const initialDiff = Math.max(
            0,
            Math.floor((expiryMs - Date.now()) / 1000)
          );

          setTimeLeft(initialDiff);
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
        }
      } else {
        setStatus('ERROR');
      }
    } catch (error) {
      console.error('Failed to start pairing:', error);
      setStatus('ERROR');
    }
  }, [clearTimer]);

  /**
   * 스캔된 코드를 통해 페어링 승인 여부 검증함
   */
  const requestPairing = useCallback(
    async (scannedCode: string) => {
      setStatus('LOADING');
      try {
        const response = await authApi.verifyPairing({ code: scannedCode });
        // any 제거하고 BackendResponse 타입을 지정함
        const res = response.data as BackendResponse<null>;

        if (res.status === 'success') {
          setStatus('PAIRED');
          clearTimer();
          return { success: true };
        }
        return { success: false, message: res.message };
      } catch (error) {
        const axiosError = error as AxiosError;
        const errorStatus =
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
  };
};

export default usePairing;
