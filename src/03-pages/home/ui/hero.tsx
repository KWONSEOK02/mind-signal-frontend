import React from 'react';

interface HeroProps {
  theme: 'light' | 'dark';
}

const Hero: React.FC<HeroProps> = ({ theme }) => {
  return (
    <div className="relative min-h-[60vh] flex flex-col items-center justify-center text-center px-6 overflow-hidden">
      <div className="relative z-10 flex flex-col items-center animate-in fade-in duration-1000">
        <div className="mb-6">
          <div className="px-4 py-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-[10px] font-bold tracking-widest uppercase text-indigo-400">
            2026 휴먼AI공학전공 졸업 프로젝트
          </div>
        </div>
        <h1
          className={`text-6xl md:text-8xl font-black tracking-tighter mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}
        >
          뇌파 시그널
        </h1>
        <p className="max-w-xl text-slate-500 font-medium">
          실시간 뇌파 동조화 분석을 통해 인연의 깊이를 확인하세요.
        </p>
      </div>
    </div>
  );
};

export default Hero;
