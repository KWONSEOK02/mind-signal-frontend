import { sessionApi, PairingSessionStatus, PairingData } from '@/07-shared'; // PairingData 임포트 추가함
import { AxiosError } from 'axios'; // 에러 처리를 위한 AxiosError 임포트 추가함

/**
 * [Model] 단일 피실험자 페어링 단계를 수행하는 독립 엔진 정의함
 */
export class PairingStep {
  private pollingId: NodeJS.Timeout | null = null;
  private timerId: NodeJS.Timeout | null = null;

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
   * onStatusUpdate 콜백의 data 타입을 PairingData로 명시하여 any 제거함
   */
  async execute(
    onStatusUpdate: (status: PairingSessionStatus, data?: PairingData) => void,
    onTimeUpdate: (timeLeft: number) => void
  ) {
    this.clear();
    try {
      const response = await sessionApi.createdPairing();
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
          const pollRes = await sessionApi.checkSessionStatus(data.groupId);
          if (pollRes.data.data.guestJoined) {
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
