import { sessionApi, PairingSessionStatus, PairingData } from '@/07-shared';
import { AxiosError, AxiosResponse } from 'axios';
import type { ExperimentMode } from '@/07-shared/constants/experiment';

/**
 * 로컬 타입 정의 수행함 (API 타입 갱신 지연 및 타입 추론 오류 방지 목적)
 */
interface SessionStatusItem {
  subjectIndex: number;
  status: string;
  guestJoined: boolean;
}

interface GroupPollData {
  groupId: string;
  sessions: SessionStatusItem[];
}

interface GroupPollResponse {
  status: string;
  data: GroupPollData;
  message?: string;
}

/**
 * SEQUENTIAL 모드에서 피실험자별 상태 정의함
 * - WAITING: 연결 대기 중
 * - PAIRED: 페어링 완료 (Subject 1이 측정 중인 동안 Subject 2가 유지하는 상태)
 * - MEASURING: 측정 진행 중
 * - COMPLETED: 측정 완료
 */
export type SequentialSubjectState =
  | 'WAITING'
  | 'PAIRED'
  | 'MEASURING'
  | 'COMPLETED';

/**
 * SEQUENTIAL 모드 전환 가능 여부를 판단하는 순수 함수 정의함
 * subject 1이 MEASURING인 동안 subject 2는 PAIRED 상태를 유지함
 */
export function canTransitionSequential(
  subjectIndex: 1 | 2,
  from: SequentialSubjectState,
  to: SequentialSubjectState,
  otherSubjectState: SequentialSubjectState
): boolean {
  if (subjectIndex === 1) {
    // Subject 1은 WAITING → PAIRED → MEASURING → COMPLETED 순서로만 전환 가능함
    const allowed: Partial<
      Record<SequentialSubjectState, SequentialSubjectState[]>
    > = {
      WAITING: ['PAIRED'],
      PAIRED: ['MEASURING'],
      MEASURING: ['COMPLETED'],
    };
    return (allowed[from] ?? []).includes(to);
  }

  if (subjectIndex === 2) {
    // Subject 2는 Subject 1이 COMPLETED된 뒤에만 MEASURING 전환 가능함
    // (순차 측정 설계 의도: Subject 1 선행 → 완료 → Subject 2 시작, 겹침 금지)
    if (to === 'MEASURING') {
      return from === 'PAIRED' && otherSubjectState === 'COMPLETED';
    }
    if (to === 'COMPLETED') {
      return from === 'MEASURING';
    }
    // WAITING → PAIRED는 항상 허용함
    if (from === 'WAITING' && to === 'PAIRED') return true;
  }

  return false;
}

/**
 * [Model] 단일 피실험자 페어링 단계를 수행하는 독립 엔진 정의함
 */
export class PairingStep {
  private pollingId: NodeJS.Timeout | null = null;
  private timerId: NodeJS.Timeout | null = null;
  /** 현재 실험 모드 — SEQUENTIAL이면 상태 전환 로직 달라짐 */
  readonly mode: ExperimentMode;

  constructor(mode: ExperimentMode = 'DUAL') {
    this.mode = mode;
  }

  /**
   * 실행 중인 모든 타이머 및 폴링 자원 해제 수행함
   */
  clear() {
    if (this.pollingId) clearInterval(this.pollingId);
    if (this.timerId) clearInterval(this.timerId);
    this.pollingId = null;
    this.timerId = null;
  }

  /**
   * 단일 페어링 프로세스 실행함
   * onStatusUpdate 콜백의 data 타입을 PairingData로 명시함
   * 다중 세션 그룹화를 위해 groupId를 선택적 인자로 추가하여 연동함
   */
  async execute(
    onStatusUpdate: (status: PairingSessionStatus, data?: PairingData) => void,
    onTimeUpdate: (timeLeft: number) => void,
    groupId?: string | null
  ) {
    this.clear();
    try {
      // 전달받은 groupId가 존재하면 API 호출 시 포함하여 기존 그룹 재사용함
      const response = await sessionApi.createdPairing(groupId || undefined);
      const { data } = response.data;

      const expiry = new Date(data.expiresAt).getTime();
      this.timerId = setInterval(() => {
        const diff = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
        onTimeUpdate(diff);
        if (diff <= 0) {
          onStatusUpdate('EXPIRED');
          this.clear();
        }
      }, 1000);

      this.pollingId = setInterval(async () => {
        try {
          // 타입 단언을 통해 sessions 배열의 존재를 컴파일러에 강제 인식시킴
          const pollRes = (await sessionApi.checkSessionStatus(
            data.groupId
          )) as unknown as AxiosResponse<GroupPollResponse>;

          // 로컬 인터페이스를 사용하여 s 파라미터의 암묵적 any 타입 에러 방지함
          const currentSession = pollRes.data.data.sessions.find(
            (s: SessionStatusItem) => s.subjectIndex === data.subjectIndex
          );

          if (currentSession && currentSession.guestJoined) {
            onStatusUpdate('PAIRED', data);
            this.clear();
          }
        } catch (pollError) {
          // 401 및 410 에러 발생 시 세션 만료 상태로 즉시 전환 및 자원 해제 수행함
          const axiosError = pollError as AxiosError;
          if (
            axiosError.response?.status === 401 ||
            axiosError.response?.status === 410
          ) {
            onStatusUpdate('EXPIRED');
            this.clear();
          } else {
            console.error('폴링 오류 발생함:', pollError);
          }
        }
      }, 3000);

      return data;
    } catch (error) {
      onStatusUpdate('ERROR');
      throw error;
    }
  }
}

export default PairingStep;
