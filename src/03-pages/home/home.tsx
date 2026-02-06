'use client';

import React from 'react';
import { FlaskConical } from 'lucide-react';
import { PageType } from '@/07-shared/types';

interface HomeProps {
  setCurrentPage: (page: PageType) => void;
  theme: 'light' | 'dark';
}

const Home: React.FC<HomeProps> = ({ setCurrentPage, theme }) => {
  const isDark = theme === 'dark';

  return (
    <div className="relative pt-32 pb-32 px-6 overflow-hidden min-h-screen flex flex-col items-center">
      <div className="relative z-10 max-w-7xl mx-auto flex flex-col items-center text-center">
        <div className="flex flex-col items-center gap-4 mb-10">
          <div
            className={`inline-flex items-center gap-3 px-6 py-2 rounded-full glass border ${isDark ? 'border-white/10' : 'border-indigo-100'}`}
          >
            <span
              className={`text-[10px] font-bold tracking-[0.2em] uppercase ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}
            >
              상명대학교 휴먼AI공학전공 팀 휴로(Heuro) 졸업 프로젝트
            </span>
          </div>
        </div>

        <div className="relative mb-12 select-none flex flex-col items-center">
          <h1 className="flex flex-col items-center">
            <span
              className={`text-[64px] md:text-[110px] font-black tracking-[-0.05em] leading-none ${isDark ? 'text-white' : 'text-slate-900'}`}
            >
              뇌파
            </span>
            <div className="h-6 md:h-10" />
            <span className="text-[64px] md:text-[110px] font-black tracking-[-0.05em] leading-none text-transparent bg-clip-text bg-gradient-to-br from-indigo-600 via-indigo-400 to-indigo-300">
              시그널
            </span>
          </h1>
        </div>

        <div className="max-w-3xl space-y-10">
          <h2
            className={`text-xl md:text-3xl font-black italic tracking-tight uppercase ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}
          >
            뇌파 동조화 기반 우정 테스트, 커플 궁합 테스트
          </h2>
          <div
            className={`space-y-4 font-bold text-base md:text-xl leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
          >
            <p>
              실시간 뇌파 동조화 분석을 통해 당신과 상대의 숨겨진 뇌파 매칭률을
              확인하세요!
            </p>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-5 pt-12">
          <button
            onClick={() => setCurrentPage('intro')}
            className={`px-10 py-5 glass border rounded-2xl font-black text-lg flex items-center gap-3 ${isDark ? 'border-white/10 text-slate-300' : 'border-indigo-100 text-slate-700'}`}
          >
            <span className="text-indigo-400">✦</span> 프로젝트 소개
          </button>
          <button
            onClick={() => setCurrentPage('lab')}
            className="group px-12 py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg hover:bg-indigo-700 transition-all active:scale-95"
          >
            <span className="relative flex items-center gap-3">
              <FlaskConical size={20} /> 실험실 입장
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;
