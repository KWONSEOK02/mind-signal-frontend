import { api } from './base';

/**
 * 페어링 세션의 구체적인 진행 상태 타입 정의함
 */
export type PairingSessionStatus =
  | 'IDLE'
  | 'PAIRED'
  | 'EXPIRED'
  | 'ERROR'
  | 'CREATED';

/**
 * 백엔드 응답 규격에 맞춘 페어링 데이터 구조 정의함
 */
export interface PairingResponse {
  // 바깥쪽 status: API 호출 성공 여부임
  status: 'success' | 'fail';
  data: {
    id: string;
    pairingToken: string;
    userId: string;
    // 안쪽 status: 페어링 세션의 현재 단계임
    status: PairingSessionStatus;
    pairedAt: string | null;
    expiresAt: string;
    measuredAt: string | null;
    sessionId?: string;
  };
  message?: string;
}

/**
 * 기기 페어링 및 측정 세션 관리 API 모음임
 */
const sessionApi = {
  // --- 1.5-A: QR 페어링 및 세션 제어 ---
  // 호스트용 새로운 페어링 세션 생성하고 QR 코드를 발급받는다.
  createdPairing: () => api.post<PairingResponse>('/sessions'),
  // 클라이언트용 페어링 승인 요청 처리함
  verifyPairing: (pairingToken: string) =>
    api.post<PairingResponse>(`/sessions/${pairingToken}/pair`),
  // 세션의 실시간 진행 상태 확인 수행함
  checkSessionStatus: (sessionId: string) =>
    api.get<PairingResponse>(`/sessions/status/${sessionId}`),
};

export default sessionApi;
