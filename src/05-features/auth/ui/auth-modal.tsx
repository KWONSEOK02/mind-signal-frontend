'use client';

import React, { useState } from 'react';
import { authApi } from '@/07-shared/api/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
  theme: 'light' | 'dark';
}

interface AuthResponse {
  status: string;
  token?: string;
  message?: string;
}

const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  theme,
}) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (isLogin) {
        const response = (await authApi.login({
          email: formData.email,
          password: formData.password,
        })) as { data: AuthResponse };

        if (response.data.token) {
          localStorage.setItem('token', response.data.token);
          onLoginSuccess();
          onClose();
        }
      } else {
        await authApi.signup({
          email: formData.email,
          password: formData.password,
          name: formData.name,
        });
        setIsLogin(true);
        setFormData({ ...formData, password: '' });
        alert('회원가입이 완료되었습니다. 로그인을 진행해주세요.');
      }
    } catch (err: unknown) {
      console.error(err);
      setError(
        isLogin
          ? '로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.'
          : '회원가입에 실패했습니다. 다시 시도해주세요.'
      );
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
          <div className="flex justify-between items-center mb-8">
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
          </div>

          {/* 에러 메시지 표시 (error 변수 사용) */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
              {error}
            </div>
          )}

          {/* handleSubmit을 form에 연결 */}
          <form onSubmit={handleSubmit} className="space-vertical-4">
            {!isLogin && (
              <div className="mb-4">
                <input
                  type="text"
                  name="name"
                  placeholder="이름"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full p-3 rounded-xl border border-white/10 bg-white/5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            )}
            <div className="mb-4">
              <input
                type="email"
                name="email"
                placeholder="이메일"
                value={formData.email}
                onChange={handleChange}
                className="w-full p-3 rounded-xl border border-white/10 bg-white/5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div className="mb-6">
              <input
                type="password"
                name="password"
                placeholder="비밀번호"
                value={formData.password}
                onChange={handleChange}
                className="w-full p-3 rounded-xl border border-white/10 bg-white/5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all disabled:opacity-50"
            >
              {isLoading ? '처리 중...' : isLogin ? '로그인' : '회원가입'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className={`text-xs font-bold transition-colors hover:text-indigo-500 ${
                theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              {isLogin ? (
                <>
                  계정이 없으신가요?{' '}
                  <span className="text-indigo-500 ml-1">회원가입</span>
                </>
              ) : (
                <>
                  이미 계정이 있으신가요?{' '}
                  <span className="text-indigo-500 ml-1">로그인</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
