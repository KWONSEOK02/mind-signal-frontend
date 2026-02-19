import { useState, useEffect, useCallback, useRef } from 'react';
import { authApi, PairingResponse } from '@/07-shared/api/auth';
import { AxiosError } from 'axios';

export const usePairing = () => {
  const [status, setStatus] = useState<
    PairingResponse['status'] | 'IDLE' | 'LOADING'
  >('IDLE');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(300);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startPairing = useCallback(async () => {
    setStatus('LOADING');
    clearTimer();
    try {
      const response = await authApi.createdPairing();
      const { code, expiresAt } = response.data;
      if (code && expiresAt) {
        setPairingCode(code);
        setStatus('CREATED');
        const initialDiff = Math.max(
          0,
          Math.floor((expiresAt - Date.now()) / 1000)
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
    } catch (error) {
      console.error('Failed to start pairing:', error);
      setStatus('ERROR');
    }
  }, [clearTimer]);

  const requestPairing = useCallback(
    async (scannedCode: string) => {
      setStatus('LOADING');
      try {
        const response = await authApi.verifyPairing({ code: scannedCode });
        if (response.data.status === 'PAIRED') {
          setStatus('PAIRED');
          clearTimer();
          return { success: true };
        }
        return { success: false, message: response.data.message };
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

  return { status, pairingCode, timeLeft, startPairing, requestPairing };
};

export default usePairing;
