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
    passwordConfirm: '', //비밀번호 확인 상태 추가
    name: '',
  });

  //모달의 열림/닫힘 상태가 바뀔 때 실행.
  useEffect(() => {
    if (isOpen) {
      // 모달이 새로 열릴 때마다 항상 '로그인' 화면이 먼저 나오도록 초기화.
      setIsLogin(true);
      setError('');
      setFormData({ email: '', password: '', passwordConfirm: '', name: '' }); //비밀번호 확인 부분도 같이 초기화하도록 수정
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
        //가입 API 쏘기 전에 비밀번호 두 개가 똑같은지 먼저 검사
        if (formData.password !== formData.passwordConfirm) {
          setError('비밀번호가 일치하지 않습니다.');
          setIsLoading(false);
          return;
        }

        // 회원가입: ...formData를 쓰면 이메일, 비번, 이름을 한 번에 보낼 수 있음
        await authApi.signup({
          ...formData,
          //기존에 강제로 넣던 formData.password 대신, formData 안에 있는 passwordConfirm이 넘어감
          loginType: 'local',
        });

        setIsLogin(true); // 가입 성공하면 로그인 화면으로 이동
        setSuccess('회원가입이 완료되었습니다. 로그인을 진행해주세요.');
        setFormData((prev) => ({ ...prev, password: '', passwordConfirm: '' })); //성공 시 비번이랑 비번확인 칸 둘 다 지워짐.
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

            {/*회원가입(!isLogin)일 때만 나타나는 비밀번호 확인 칸 추가 */}
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

          {/* 여기서부터 추가된 외부 로그인 UI 영역 (로그인 화면일 때만 표시) */}
          {isLogin && (
            <div className="mt-8">
              {/* 구분선 및 문구 */}
              <div className="relative flex items-center justify-center mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div
                    className={`w-full border-t ${theme === 'dark' ? 'border-white/10' : 'border-slate-200'}`}
                  ></div>
                </div>
                <div
                  className={`relative px-4 text-xs font-bold ${theme === 'dark' ? 'bg-slate-900 text-slate-400' : 'bg-white text-slate-500'}`}
                >
                  외부 계정으로 로그인하기
                </div>
              </div>

              {/* 동그란 구글, 카카오 버튼들 */}
              <div className="flex justify-center gap-4">
                {/* 구글 로그인 버튼 */}
                <button
                  type="button"
                  className="flex items-center justify-center w-12 h-12 rounded-full bg-white border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  {/* 구글 공식 SVG 아이콘 */}
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

                {/* 카카오 로그인 버튼 */}
                <button
                  type="button"
                  className="flex items-center justify-center w-12 h-12 rounded-full bg-[#FEE500] hover:bg-[#FDD800] transition-colors cursor-pointer"
                >
                  {/* 카카오 공식 SVG 아이콘 (갈색) */}
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
          {/* 여기까지 외부 로그인 영역 */}

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
                      setFormData({
                        email: '',
                        password: '',
                        passwordConfirm: '',
                        name: '',
                      }); // 로그인->회원가입으로 전환할 때 폼 데이터 초기화 (passwordConfirm 포함)
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
                      }); // 회원가입->로그인으로 전환할 때 폼 데이터 초기화 (passwordConfirm 포함)
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
