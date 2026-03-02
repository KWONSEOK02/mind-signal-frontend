import { useState, useCallback, useRef, useEffect } from 'react';
import { UserRole, PairingSessionStatus, SESSION_STATUS } from '@/07-shared';
import { sessionApi } from '@/07-shared/api';
import { AxiosError } from 'axios';
import { PairingStep } from './pairing-engine';

/**
 * [Feature] 설정된 인원수에 따라 순차적 페어링을 제어하는 훅 정의함
 */
const usePairing = (targetSubjectCount: number = 2) => {
  const [status, setStatus] = useState<PairingSessionStatus>(
    SESSION_STATUS.IDLE
  );
  const [groupId, setGroupId] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [subjectIndex, setSubjectIndex] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(300);
  const [pairedSubjects, setPairedSubjects] = useState<number[]>([]);

  const engineRef = useRef<PairingStep>(new PairingStep());

  /**
   * [OPERATOR] 다음 피실험자 페어링 단계 시작함
   */
  const startPairing = useCallback(async () => {
    if (pairedSubjects.length >= targetSubjectCount) return;

    setStatus(SESSION_STATUS.CREATED);
    try {
      await engineRef.current
        .execute(
          (newStatus) => {
            if (newStatus === SESSION_STATUS.PAIRED) {
              setPairedSubjects((prev) => {
                const nextIndex = prev.length + 1;
                const newList = [...prev, nextIndex];
                if (newList.length >= targetSubjectCount) {
                  setStatus(SESSION_STATUS.PAIRED);
                } else {
                  setStatus(SESSION_STATUS.CREATED);
                }
                return newList;
              });
            } else {
              setStatus(newStatus);
            }
          },
          (time) => setTimeLeft(time)
        )
        .then((data) => {
          setGroupId(data.groupId);
          setPairingCode(data.pairingToken);
          setRole('OPERATOR');
        });
    } catch {
      setStatus(SESSION_STATUS.ERROR);
    }
  }, [targetSubjectCount, pairedSubjects.length]);

  /**
   * [SUBJECT] 토큰을 사용하여 그룹 세션에 합류 수행함
   * 확장된 PairingData 타입을 통해 subjectIndex를 안전하게 할당함
   */
  const requestPairing = useCallback(async (token: string) => {
    setStatus(SESSION_STATUS.IDLE);
    try {
      const response = await sessionApi.verifyPairing(token);
      const { data } = response.data;

      setGroupId(data.groupId);
      // PairingData 인터페이스 수정으로 인해 더 이상 타입 에러 발생하지 않음
      setSubjectIndex(data.subjectIndex ?? 1);
      setRole('SUBJECT');
      setStatus(SESSION_STATUS.PAIRED);

      return { success: true };
    } catch (error) {
      const axiosError = error as AxiosError;
      const errorStatus: PairingSessionStatus =
        axiosError.response?.status === 410
          ? SESSION_STATUS.EXPIRED
          : SESSION_STATUS.ERROR;

      setStatus(errorStatus);
      console.error('그룹 합류 실패함:', error);
      return { success: false, status: errorStatus };
    }
  }, []);

  /**
   * 모든 페어링 상태 및 리소스 초기화 수행함
   */
  const resetStatus = useCallback(() => {
    engineRef.current.clear();
    setStatus(SESSION_STATUS.IDLE);
    setGroupId(null);
    setPairingCode(null);
    setPairedSubjects([]);
    setSubjectIndex(null);
    setTimeLeft(300);
  }, []);

  /**
   * 컴포넌트 언마운트 시 리소스 해제 수행함
   */
  useEffect(() => {
    const currentEngine = engineRef.current;
    return () => currentEngine.clear();
  }, []);

  return {
    status,
    groupId,
    pairingCode,
    role,
    subjectIndex,
    timeLeft,
    pairedSubjects,
    isAllPaired: pairedSubjects.length >= targetSubjectCount,
    startPairing,
    requestPairing,
    resetStatus,
  };
};

export default usePairing;
