'use client';

import React, { useState, useEffect } from 'react';
import { authApi, AuthResponse } from '@/07-shared/api'; // 프로젝트 배럴 파일 컨벤션 준수함

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
  theme: 'light' | 'dark';
}

/**
 * [Feature] 사용자 인증(로그인/회원가입) 및 외부 계정 연동 기능을 제공하는 모달 컴포넌트임
 */
const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  theme,
}) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    passwordConfirm: '', // 비밀번호 확인 필드 추가함
    name: '',
  });

  /**
   * 모달 노출 상태 변경 시 폼 데이터 및 에러 상태 초기화 수행함
   */
  useEffect(() => {
    if (isOpen) {
      setIsLogin(true);
      setError('');
      setSuccess('');
      setFormData({ email: '', password: '', passwordConfirm: '', name: '' });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  /**
   * 인증 폼 제출 핸들러 정의함
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isLogin) {
        // 1. 로그인 프로세스 수행함
        const { data } = (await authApi.login(formData)) as {
          data: AuthResponse;
        };

        if (data.token) {
          localStorage.setItem('token', data.token);
          onLoginSuccess();
          onClose();
        }
      } else {
        // 2. 회원가입 프로세스 전 유효성 검사 수행함
        if (formData.password !== formData.passwordConfirm) {
          setError('비밀번호가 일치하지 않습니다.');
          setIsLoading(false);
          return;
        }

        // 3. 회원가입 API 요청 수행함
        await authApi.signup({
          ...formData,
          loginType: 'local',
        });

        setIsLogin(true);
        setSuccess('회원가입이 완료되었습니다. 로그인을 진행해주세요.');
        setFormData((prev) => ({ ...prev, password: '', passwordConfirm: '' }));
      }
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      const serverMessage = axiosError.response?.data?.message;
      setError(serverMessage || '요청 처리에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const inputStyle = `w-full p-3 rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
    theme === 'dark'
      ? 'border-white/10 bg-white/5 text-white'
      : 'border-slate-300 bg-white text-slate-900'
  }`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
        onClick={onClose}
      />

      <div
        className={`relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 shadow-2xl ${
          theme === 'dark'
            ? 'bg-slate-900 text-white'
            : 'bg-white text-slate-900'
        }`}
      >
        <div className="p-8">
          <header className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl font-black tracking-tight mb-1">
                {isLogin ? '반갑습니다!' : '시작하기'}
              </h2>
              <p
                className={
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                }
              >
                {isLogin
                  ? '서비스를 이용하려면 로그인하세요.'
                  : '새로운 계정을 생성하세요.'}
              </p>
            </div>
          </header>

          {success && (
            <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-500 text-sm font-bold text-center">
              {success}
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <input
                type="text"
                name="name"
                placeholder="이름"
                value={formData.name}
                onChange={handleChange}
                className={inputStyle}
                required
              />
            )}
            <input
              type="email"
              name="email"
              placeholder="user@example.com"
              value={formData.email}
              onChange={handleChange}
              className={inputStyle}
              required
            />
            <input
              type="password"
              name="password"
              placeholder="비밀번호"
              value={formData.password}
              onChange={handleChange}
              className={inputStyle}
              required
            />
            {!isLogin && (
              <input
                type="password"
                name="passwordConfirm"
                placeholder="비밀번호 확인"
                value={formData.passwordConfirm}
                onChange={handleChange}
                className={inputStyle}
                required
              />
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 mt-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? '처리 중...' : isLogin ? '로그인' : '회원가입'}
            </button>
          </form>

          {/* 외부 로그인 UI 영역 반영함 */}
          {isLogin && (
            <div className="mt-8">
              <div className="relative flex items-center justify-center mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div
                    className={`w-full border-t ${theme === 'dark' ? 'border-white/10' : 'border-slate-200'}`}
                  />
                </div>
                <div
                  className={`relative px-4 text-xs font-bold ${theme === 'dark' ? 'bg-slate-900 text-slate-400' : 'bg-white text-slate-500'}`}
                >
                  외부 계정으로 로그인하기
                </div>
              </div>
              <div className="flex justify-center gap-4">
                <button
                  type="button"
                  className="flex items-center justify-center w-12 h-12 rounded-full bg-white border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="24"
                    height="24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  className="flex items-center justify-center w-12 h-12 rounded-full bg-[#FEE500] hover:bg-[#FDD800] transition-colors cursor-pointer"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="24"
                    height="24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fill="#391B1B"
                      d="M12 3c-5.523 0-10 3.535-10 7.898 0 2.816 1.83 5.282 4.606 6.702-.158.547-.532 1.944-.556 2.062-.03.14.048.14.12.106.096-.046 2.37-1.572 3.33-2.28.792.215 1.63.333 2.5.333 5.523 0 10-3.535 10-7.898C22 6.535 17.523 3 12 3z"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}

          <footer className="mt-8 text-center select-none">
            <div
              className={`text-xs font-bold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}
            >
              {isLogin ? (
                <p className="cursor-default">
                  계정이 없으신가요?{' '}
                  <span
                    onClick={() => {
                      setIsLogin(false);
                      setError('');
                      setSuccess('');
                      setFormData({
                        email: '',
                        password: '',
                        passwordConfirm: '',
                        name: '',
                      });
                    }}
                    className="text-indigo-500 ml-1 cursor-pointer hover:underline decoration-2 underline-offset-4"
                  >
                    회원가입
                  </span>
                </p>
              ) : (
                <p className="cursor-default">
                  이미 계정이 있으신가요?{' '}
                  <span
                    onClick={() => {
                      setIsLogin(true);
                      setError('');
                      setSuccess('');
                      setFormData({
                        email: '',
                        password: '',
                        passwordConfirm: '',
                        name: '',
                      });
                    }}
                    className="text-indigo-500 ml-1 cursor-pointer hover:underline decoration-2 underline-offset-4"
                  >
                    로그인
                  </span>
                </p>
              )}
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
