import { api } from './base';

// ERD의 User 테이블 구조를 반영한 인터페이스 정의
export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest extends LoginRequest {
  name: string;
  passwordConfirm: string; // 추가
  loginType: string; // 추가
  brainType?: string; // 추가
  membershipLevel?: string; // 추가
}

export interface AuthResponse {
  status: string;
  token?: string;
  message?: string;
}

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

export const authApi = {
  // data: any 대신 정의한 인터페이스 사용
  login: (data: LoginRequest) => api.post<AuthResponse>('/auth/login', data),
  signup: (data: SignupRequest) => api.post<AuthResponse>('/auth/signup', data),
  getMe: () => api.get('/user/me'),
  // --- 1.5-A: QR 페어링 및 세션 제어 ---
  //[Host] 새로운 페어링 세션을 생성하고 QR 코드를 발급받는다.
  createdPairing: () => api.post<PairingResponse>('/sessions'),
  /**
   * [Client] 휴대폰 승인 요청 (POST /api/sessions/:pairingToken/pair)
   * 백엔드 라우트 /:pairingToken/pair 구조에 맞게 수정함
   */
  verifyPairing: (pairingToken: string) =>
    api.post<PairingResponse>(`/sessions/${pairingToken}/pair`),
  // 세션 상태를 실시간 외에 폴링이나 수동 확인이 필요할 경우 사용한다.
  checkSessionStatus: (sessionId: string) =>
    api.get<PairingResponse>(`/sessions/status/${sessionId}`),
};
