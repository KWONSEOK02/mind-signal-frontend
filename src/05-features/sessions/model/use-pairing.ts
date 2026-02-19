import { useState, useEffect, useCallback, useRef } from 'react';
import { authApi, PairingSessionStatus } from '@/07-shared/api/auth';
import { config as appConfig } from '@07-shared/config/config';
import { AxiosError } from 'axios';

/**
 * UI 전용 로컬 상태와 백엔드 세션 상태를 결합함
 */
export type PairingUIStatus = PairingSessionStatus | 'IDLE' | 'LOADING';

/**
 * [Model] 기기 페어링 상태 및 타이머 관리 훅 정의함
 */
export const usePairing = () => {
  const [status, setStatus] = useState<PairingUIStatus>('IDLE');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(
    appConfig.session.pairingTimeout
  );
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * 실행 중인 타이머를 초기화하고 참조를 제거함
   */
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /**
   * 세션 생성 API 호출 및 데이터 파싱 수행함
   */
  const startPairing = useCallback(async () => {
    setStatus('LOADING');
    clearTimer();
    try {
      const response = await authApi.createdPairing();
      const res = response.data;

      // API 응답 성공 시 내부 상태 업데이트 수행함
      if (res.status === 'success' && res.data) {
        setPairingCode(res.data.pairingToken);
        setStatus('CREATED');
        const expiryMs = new Date(res.data.expiresAt).getTime();
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
      } else {
        setStatus('ERROR');
      }
    } catch (error) {
      console.error('Pairing 시작 실패함:', error);
      setStatus('ERROR');
    }
  }, [clearTimer]);

  /**
   * 휴대폰에서 스캔한 코드로 승인 요청 및 최종 상태 확인 수행함
   */
  const requestPairing = useCallback(
    async (scannedCode: string) => {
      setStatus('LOADING');
      try {
        // 동적 경로 파라미터 활용하여 API 호출함
        const response = await authApi.verifyPairing(scannedCode);
        const res = response.data;

        // API 성공 여부와 세션의 PAIRED 상태를 동시 검증함
        if (res.status === 'success' && res.data.status === 'PAIRED') {
          setStatus('PAIRED');
          clearTimer();
          return { success: true };
        }
        return { success: false, message: res.message };
      } catch (error) {
        const axiosError = error as AxiosError;
        const errorStatus: PairingUIStatus =
          axiosError.response?.status === 410 ? 'EXPIRED' : 'ERROR';
        setStatus(errorStatus);
        return { success: false, errorStatus };
      }
    },
    [clearTimer]
  );

  /**
   * 컴포넌트 언마운트 시 타이머 정리 수행함
   */
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  return { status, pairingCode, timeLeft, startPairing, requestPairing };
};

export default usePairing;
