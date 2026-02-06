import React, { useState } from 'react';
import { Sparkles, Bell, CheckCircle2 } from 'lucide-react';

interface ComingSoonProps {
  theme: 'light' | 'dark';
}

const ComingSoon: React.FC<ComingSoonProps> = ({ theme }) => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setIsSubmitted(true);
      setEmail('');
      setTimeout(() => setIsSubmitted(false), 5000);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-24">
      <div
        className={`relative glass rounded-[50px] p-12 md:p-24 overflow-hidden border transition-all ${
          theme === 'dark'
            ? 'border-indigo-500/20 shadow-[0_0_80px_rgba(99,102,241,0.1)]'
            : 'border-indigo-100 shadow-[0_0_50px_rgba(99,102,241,0.05)]'
        }`}
      >
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div
            className={`absolute -top-24 -left-24 w-96 h-96 blur-[120px] rounded-full transition-colors ${theme === 'dark' ? 'bg-indigo-600/10' : 'bg-indigo-600/5'}`}
          ></div>
          <div
            className={`absolute -bottom-24 -right-24 w-96 h-96 blur-[120px] rounded-full transition-colors ${theme === 'dark' ? 'bg-purple-600/10' : 'bg-purple-600/5'}`}
          ></div>
        </div>

        <div className="relative z-10 flex flex-col items-center text-center space-y-12">
          <div
            className={`inline-flex items-center gap-3 px-6 py-2 rounded-full border backdrop-blur-md transition-colors ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-slate-50/30 border-slate-200'}`}
          >
            <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
            <span
              className={`text-xs md:text-sm font-black tracking-[0.3em] uppercase ${theme === 'dark' ? 'text-white/80' : 'text-slate-500'}`}
            >
              Next Project Preview
            </span>
          </div>

          <div className="space-y-4">
            <h2
              className={`text-5xl md:text-8xl font-black tracking-tight italic transition-colors ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}
            >
              뇌파 시그널
            </h2>
            <div
              className={`inline-block px-4 py-1.5 rounded-lg border ${theme === 'dark' ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-indigo-50/50 border-indigo-100'}`}
            >
              <span className="text-xl md:text-3xl font-black tracking-[0.2em] uppercase italic bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
                SEASON 2
              </span>
            </div>
          </div>

          <div className="space-y-6">
            <p
              className={`text-xl md:text-3xl font-bold tracking-tight max-w-3xl mx-auto leading-relaxed transition-colors ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}
            >
              <span
                className={theme === 'dark' ? 'text-white' : 'text-slate-900'}
              >
                친구 매칭
              </span>
              ,{' '}
              <span
                className={theme === 'dark' ? 'text-white' : 'text-slate-900'}
              >
                소개팅 매칭 서비스
              </span>
              로 <br className="hidden md:block" />
              <span className="text-indigo-500 underline underline-offset-8 decoration-indigo-500/30">
                2026년 09월
              </span>
              에 돌아옵니다.
            </p>
          </div>

          <div className="w-full max-w-lg mt-8">
            {!isSubmitted ? (
              <form onSubmit={handleSubmit} className="relative group">
                <div className="relative flex flex-col md:flex-row gap-3">
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="알림을 받으실 이메일을 입력하세요"
                    className={`flex-1 border rounded-2xl px-6 py-5 focus:outline-none focus:border-indigo-500 transition-all ${theme === 'dark' ? 'bg-black/40 border-white/10 text-white' : 'bg-white/40 border-slate-200 text-slate-900'}`}
                  />
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-5 rounded-2xl font-black transition-all flex items-center justify-center gap-2 group/btn whitespace-nowrap"
                  >
                    <span>알림 신청하기</span>
                    <Bell size={18} />
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col items-center gap-4 animate-in zoom-in-95 duration-500">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30">
                  <CheckCircle2 className="text-green-400 w-8 h-8" />
                </div>
                <h3
                  className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}
                >
                  알림 신청 완료!
                </h3>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComingSoon;
