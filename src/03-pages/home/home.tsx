'use client';

import React from 'react';
import { FlaskConical, ArrowRight } from 'lucide-react';
import { PageType } from '@/07-shared/types';

interface HomeProps {
  setCurrentPage: (page: PageType) => void;
  theme: 'light' | 'dark';
}

const Home: React.FC<HomeProps> = ({ setCurrentPage, theme }) => {
  const isDark = theme === 'dark';

  // 페이지 이동과 동시에 스크롤을 맨 위로 올리는 핸들러 함수
  const handleNavigation = (page: PageType) => {
    window.scrollTo(0, 0); // 스크롤을 최상단(x: 0, y: 0)으로 이동
    setCurrentPage(page);
  };

  return (
    <div className="relative pt-20 pb-32 px-6 overflow-hidden min-h-screen flex flex-col items-center">
      <div className="relative z-10 max-w-7xl mx-auto flex flex-col items-center text-center">
        {/* 상단 프로젝트 배지 */}
        <div className="flex flex-col items-center gap-4 mb-10">
          <div
            className={`inline-flex items-center gap-3 px-6 py-2 rounded-full glass border cursor-default select-none ${
              isDark ? 'border-white/10' : 'border-indigo-100'
            }`}
          >
            <span
              className={`text-[10px] font-bold tracking-[0.2em] uppercase ${
                isDark ? 'text-indigo-400' : 'text-indigo-600'
              }`}
            >
              상명대학교 휴먼AI공학전공 팀 휴로(Heuro) 졸업 프로젝트
            </span>
          </div>
        </div>

        <div className="relative mb-12 select-none flex flex-col items-center">
          <h1 className="flex flex-col items-center cursor-default leading-[0.85]">
            <span
              className={`text-7xl md:text-[140px] font-black tracking-[-0.05em] ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              뇌파
            </span>
            <div className="h-4 md:h-6" />
            <span className="text-7xl md:text-[140px] font-black tracking-[-0.05em] text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-indigo-400 to-purple-500">
              시그널
            </span>
          </h1>
        </div>

        <div className="max-w-3xl space-y-10 mb-16">
          <h2
            className={`text-xl md:text-3xl font-black italic tracking-tight uppercase cursor-default select-none ${
              isDark ? 'text-indigo-400' : 'text-indigo-600'
            }`}
          >
            뇌파 동조화 기반 우정 테스트, 커플 궁합 테스트
          </h2>
          <div
            className={`space-y-4 font-bold text-base md:text-xl leading-relaxed cursor-default select-none ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}
          >
            <p>
              실시간 뇌파 동조화 분석을 통해 당신과 상대의 숨겨진 뇌파 매칭률을
              확인하세요!
            </p>
          </div>
        </div>

        {/* 🔘 버튼 섹션: 구글 스타일의 호버 효과 적용 */}
        <div className="flex flex-col sm:flex-row justify-center gap-6">
          {/* 프로젝트 소개: 화살표 애니메이션 적용 */}
          <button
            onClick={() => handleNavigation('intro')}
            className={`group px-10 py-5 glass border rounded-3xl font-black text-lg flex items-center gap-3 cursor-pointer transition-all duration-300 ${
              isDark
                ? 'border-white/10 text-slate-300 hover:text-white hover:bg-white/10 hover:border-transparent'
                : 'border-indigo-100 text-slate-700 hover:bg-indigo-100 hover:border-transparent hover:shadow-lg shadow-indigo-500/5'
            }`}
          >
            프로젝트 소개{' '}
            <ArrowRight
              size={18}
              className="transition-transform group-hover:translate-x-2"
            />
          </button>

          {/* 실험실 입장: 번쩍이는 Shine 효과 및 아이콘 회전 적용 */}
          <button
            onClick={() => handleNavigation('lab')}
            className="group relative px-14 py-6 bg-indigo-600 text-white rounded-3xl font-black text-xl overflow-hidden transition-all hover:bg-indigo-700 hover:scale-105 active:scale-95 shadow-[0_20px_50px_-10px_rgba(79,70,229,0.5)] cursor-pointer"
          >
            {/* 번쩍이는 Shine 효과 레이어 */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

            <span className="relative z-10 flex items-center gap-4">
              <FlaskConical
                size={24}
                className="group-hover:rotate-12 transition-transform duration-300"
              />
              실험실 입장
            </span>

            {/* 내부 테두리 광택 */}
            <div className="absolute inset-0 border-2 border-white/20 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;
