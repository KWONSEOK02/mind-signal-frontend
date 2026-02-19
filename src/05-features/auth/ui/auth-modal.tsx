'use client';

import React, { useState, useEffect } from 'react'; //useEffect 추가(모달 상태 초기화 문제 해결)
import { authApi, AuthResponse } from '@/07-shared/api/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
  theme: 'light' | 'dark';
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
  const [success, setSuccess] = useState(''); // 성공 메시지용 상태 추가
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  });

  //모달의 열림/닫힘 상태가 바뀔 때 실행.
  useEffect(() => {
    if (isOpen) {
      // 모달이 새로 열릴 때마다 항상 '로그인' 화면이 먼저 나오도록 초기화.
      setIsLogin(true);
      setError('');
      setFormData({ email: '', password: '', name: '' });
    }
  }, [isOpen]); // isOpen 값이 변경될 때마다 이 함수 실행.

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isLogin) {
        // 로그인: { data } 로 쓰면 response.data 대신 바로 data를 쓸 수 있어 편함.
        const { data } = (await authApi.login(formData)) as {
          data: AuthResponse;
        };

        if (data.token) {
          localStorage.setItem('token', data.token);
          onLoginSuccess();
          onClose();
        }
      } else {
        // 회원가입: ...formData를 쓰면 이메일, 비번, 이름을 한 번에 보낼 수 있음
        await authApi.signup({
          ...formData,
          passwordConfirm: formData.password,
          loginType: 'local',
        });

        setIsLogin(true); // 가입 성공하면 로그인 화면으로 이동
        setSuccess('회원가입이 완료되었습니다. 로그인을 진행해주세요.');
        setFormData((prev) => ({ ...prev, password: '' })); // 비번만 지워짐.
      }
    } catch (err: unknown) {
      //Swagger에 적어둔 "이미 가입된 이메일" 같은 메시지를 그대로 보여줌.
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

  // 라이트 모드에서도 테두리가 잘 보이도록 설정된 스타일
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

          {/* handleSubmit을 form에 연결 */}
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

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 mt-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? '처리 중...' : isLogin ? '로그인' : '회원가입'}
            </button>
          </form>

          <div className="mt-8 text-center select-none">
            <div
              className={`text-xs font-bold ${
                theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              {isLogin ? (
                <p className="cursor-default">
                  계정이 없으신가요?{' '}
                  <span
                    onClick={() => {
                      setIsLogin(false);
                      setError('');
                      setSuccess('');
                      setFormData({ email: '', password: '', name: '' }); //로그인->회원가입으로 전환할 때 폼 데이터 초기화
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
                      setFormData({ email: '', password: '', name: '' }); //회원가입->로그인으로 전환할 때 폼 데이터 초기화
                    }}
                    className="text-indigo-500 ml-1 cursor-pointer hover:underline decoration-2 underline-offset-4"
                  >
                    로그인
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
