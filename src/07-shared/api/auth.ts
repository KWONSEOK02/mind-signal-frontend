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
 * 1.5-A: QR 페어링 관련 인터페이스 (Note A 반영)
 */
export interface PairingResponse {
  status: 'CREATED' | 'PAIRED' | 'EXPIRED' | 'ERROR';
  code?: string; // 발급된 페어링 코드
  expiresAt?: number; // 백엔드 Redis 기준 만료 타임스탬프
  message?: string;
}

export interface PairRequest {
  code: string; // 클라이언트가 스캔한 코드
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
   * [Client] 스캔한 코드를 전달하여 페어링을 요청한다.
   * 백엔드에서 원자적 페어링(Atomic Pairing)을 검증한다.
   */
  verifyPairing: (data: PairRequest) =>
    api.post<PairingResponse>('/sessions/pair', data),
  // 세션 상태를 실시간 외에 폴링이나 수동 확인이 필요할 경우 사용한다.
  checkSessionStatus: (sessionId: string) =>
    api.get<PairingResponse>(`/sessions/status/${sessionId}`),
};
