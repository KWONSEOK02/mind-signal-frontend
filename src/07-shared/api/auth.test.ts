import { describe, it, expect, vi, beforeEach } from 'vitest';
import authApi from './auth';

vi.mock('./base', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

import { api } from './base';
const mockPost = api.post as ReturnType<typeof vi.fn>;
const mockGet = api.get as ReturnType<typeof vi.fn>;

describe('authApi — 인증 API 통합 테스트 수행함', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('POST /auth/login에 이메일+비밀번호 전송 처리함', async () => {
      mockPost.mockResolvedValue({
        data: { status: 'success', token: 'jwt-token-123' },
      });

      const result = await authApi.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(mockPost).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result.data.token).toBe('jwt-token-123');
    });

    it('잘못된 자격증명 시 에러 전파 처리함', async () => {
      mockPost.mockRejectedValue(new Error('Unauthorized'));

      await expect(
        authApi.login({ email: 'bad@test.com', password: 'wrong' })
      ).rejects.toThrow('Unauthorized');
    });
  });

  describe('signup', () => {
    it('POST /auth/signup에 전체 회원가입 필드 전송 처리함', async () => {
      mockPost.mockResolvedValue({
        data: { status: 'success', token: 'new-jwt' },
      });

      await authApi.signup({
        email: 'new@test.com',
        password: 'pass123',
        name: '테스트',
        passwordConfirm: 'pass123',
        loginType: 'email',
      });

      expect(mockPost).toHaveBeenCalledWith('/auth/signup', {
        email: 'new@test.com',
        password: 'pass123',
        name: '테스트',
        passwordConfirm: 'pass123',
        loginType: 'email',
      });
    });
  });

  describe('socialLogin', () => {
    it('POST /auth/social/{provider}에 code + codeVerifier 전송 처리함', async () => {
      mockPost.mockResolvedValue({
        data: { status: 'success', token: 'social-jwt' },
      });

      await authApi.socialLogin('kakao', 'auth-code', 'verifier-123');

      expect(mockPost).toHaveBeenCalledWith('/auth/social/kakao', {
        code: 'auth-code',
        codeVerifier: 'verifier-123',
      });
    });

    it('redirectUri 전달 시 body에 포함 처리함', async () => {
      mockPost.mockResolvedValue({
        data: { status: 'success', token: 'social-jwt' },
      });

      await authApi.socialLogin(
        'google',
        'auth-code',
        'verifier-123',
        'https://example.com/callback'
      );

      expect(mockPost).toHaveBeenCalledWith('/auth/social/google', {
        code: 'auth-code',
        codeVerifier: 'verifier-123',
        redirectUri: 'https://example.com/callback',
      });
    });
  });

  describe('getMe', () => {
    it('GET /user/me 호출 처리함', async () => {
      mockGet.mockResolvedValue({
        data: { name: '권석', email: 'test@test.com' },
      });

      const result = await authApi.getMe();

      expect(mockGet).toHaveBeenCalledWith('/user/me');
      expect(result.data.name).toBe('권석');
    });
  });
});
