import { api } from './base';

// ERD의 User 테이블 구조를 반영한 인터페이스 정의
export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest extends LoginRequest {
  name: string;
  passwordConfirm: string; // 추가
  loginType: string;      // 추가
  brainType: string;      // 추가
  membershipLevel: string; // 추가
}

export interface AuthResponse {
  status: string;
  token?: string;
  message?: string;
}

export const authApi = {
  // data: any 대신 정의한 인터페이스 사용
  login: (data: LoginRequest) => api.post<AuthResponse>('/auth/login', data),
  signup: (data: SignupRequest) => api.post<AuthResponse>('/auth/signup', data),
  getMe: () => api.get('/user/me'),
};
