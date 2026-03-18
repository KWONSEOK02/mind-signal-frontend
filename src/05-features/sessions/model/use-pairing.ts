import { useState, useCallback, useRef, useEffect } from 'react';
import {
  UserRole,
  PairingSessionStatus,
  PairingData,
  SESSION_STATUS,
} from '@/07-shared';
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
  // Operator용: 페어링 완료된 세션 PairingData 배열 보관함
  const [sessions, setSessions] = useState<PairingData[]>([]);
  // Subject용: 합류한 세션의 ID 보관함
  const [sessionId, setSessionId] = useState<string | null>(null);

  const engineRef = useRef<PairingStep>(new PairingStep());

  /**
   * [OPERATOR] 다음 피실험자 페어링 단계 시작함
   * 기존 groupId 존재 시 재사용하여 동일 그룹 내 세션 생성 수행함
   */
  const startPairing = useCallback(async () => {
    // 목표 인원 달성 시 실행 차단함
    if (pairedSubjects.length >= targetSubjectCount) return;

    setStatus(SESSION_STATUS.CREATED);
    setPairingCode(null); // 추가: 새로운 API 통신을 대기하는 동안 이전 QR 코드가 노출되는 것을 방지함
    try {
      // pairing-engine을 통해 API 호출 및 상태 전이 관리 수행함
      await engineRef.current
        .execute(
          (newStatus, data) => {
            if (newStatus === SESSION_STATUS.PAIRED) {
              // PAIRED 전환 시 PairingData가 있으면 sessions 배열에 추가함
              if (data) {
                setSessions((prev) => [...prev, data]);
              }
              setPairedSubjects((prev) => {
                const nextIndex = prev.length + 1;
                return [...prev, nextIndex];
              });
            } else {
              setStatus(newStatus);
            }
          },
          (time) => setTimeLeft(time),
          groupId // 보존된 groupId 전달함
        )
        .then((data) => {
          // 최초 생성된 그룹 ID 보존 수행함
          if (!groupId) {
            setGroupId(data.groupId);
          }
          setPairingCode(data.pairingToken);
          setRole('OPERATOR');
          setStatus(SESSION_STATUS.CREATED);
        });
    } catch {
      setStatus(SESSION_STATUS.ERROR);
    }
  }, [targetSubjectCount, pairedSubjects.length, groupId]);

  /**
   * 참가자 완료 상태 감지하여 자동 다음 단계 전환 수행함
   * 동기적 setState로 인한 Cascading Renders 린트 에러 방지를 위해 비동기 처리함
   */
  useEffect(() => {
    if (pairedSubjects.length > 0) {
      // setTimeout을 사용하여 렌더링 사이클 충돌을 회피함
      const timer = setTimeout(() => {
        if (pairedSubjects.length < targetSubjectCount) {
          // 미달 시 다음 참가자 페어링 자동 트리거함
          startPairing();
        } else {
          // 완료 시 최종 상태 업데이트함
          setStatus(SESSION_STATUS.PAIRED);
        }
      }, 0);

      return () => clearTimeout(timer);
    }
  }, [pairedSubjects.length, targetSubjectCount, startPairing]);

  /**
   * [SUBJECT] 토큰 기반 세션 합류 로직 정의함
   */
  const requestPairing = useCallback(async (token: string) => {
    setStatus(SESSION_STATUS.IDLE);
    try {
      const response = await sessionApi.verifyPairing(token);
      const { data } = response.data;

      setGroupId(data.groupId);
      setSubjectIndex(data.subjectIndex ?? 1);
      setSessionId(data.id);
      setRole('SUBJECT');
      setStatus(SESSION_STATUS.PAIRED);

      return { success: true };
    } catch (error) {
      const axiosError = error as AxiosError;
      const errorStatus: PairingSessionStatus =
        axiosError.response?.status === 410 ||
        axiosError.response?.status === 401
          ? SESSION_STATUS.EXPIRED
          : SESSION_STATUS.ERROR;

      setStatus(errorStatus);
      console.error('그룹 합류 실패함:', error);
      return { success: false, status: errorStatus };
    }
  }, []);

  /**
   * 세션 상태 및 관련 리소스 초기화 수행함
   */
  const resetStatus = useCallback(() => {
    engineRef.current.clear();
    setStatus(SESSION_STATUS.IDLE);
    setGroupId(null);
    setPairingCode(null);
    setPairedSubjects([]);
    setSessions([]);
    setSubjectIndex(null);
    setSessionId(null);
    setTimeLeft(300);
  }, []);

  /**
   * 컴포넌트 언마운트 시 엔진 리소스 해제함
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
    sessions,
    sessionId,
    startPairing,
    requestPairing,
    resetStatus,
  };
};

export default usePairing;
