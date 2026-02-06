'use client';

import React, { useRef } from 'react';
import { Lock, Share2, LogIn, Download, Users, Info } from 'lucide-react';
import html2canvas from 'html2canvas';
import { PageType } from '@/07-shared/types'; // PageType 임포트 추가

interface ResultsProps {
  theme: 'light' | 'dark';
  isLoggedIn: boolean;
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean>>;
  setCurrentPage: (page: PageType) => void;
  openAuthModal: () => void;
}

const Results: React.FC<ResultsProps> = ({
  theme,
  isLoggedIn,
  //setIsLoggedIn: _setIsLoggedIn, // 1. 사용하지 않을 경우 앞에 _를 붙여 린트 무시
  setCurrentPage,
  openAuthModal,
}) => {
  const isDark = theme === 'dark';
  const reportRef = useRef<HTMLDivElement>(null);

  const userScore = 88.4;
  const userName = '문경수';
  const partnerName = '김철수';

  const syncLevels = [
    { range: '0 - 20%', label: '서먹서먹한 사이', color: 'text-slate-500' },
    { range: '20 - 40%', label: '개성이 뚜렷한 사이', color: 'text-amber-500' },
    { range: '40 - 60%', label: '편안한 친구 사이', color: 'text-blue-500' },
    { range: '60 - 80%', label: '환상의 티키타카', color: 'text-emerald-500' },
    {
      range: '80 - 100%',
      label: '이심전심 소울메이트',
      color: 'text-indigo-500',
    },
  ];

  const currentLevel =
    syncLevels.find((lvl) => {
      const [start, end] = lvl.range.replace('%', '').split(' - ').map(Number);
      return userScore >= start && userScore <= end;
    }) || syncLevels[0];

  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (userScore / 100) * circumference;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: '뇌파 시그널 분석 리포트',
          text: `나와 ${partnerName}의 뇌파 동조율은 ${userScore.toFixed(1)}%! 결과를 확인해보세요.`,
          url: window.location.href,
        });
      } catch (err) {
        console.error('공유 실패:', err);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('공유 링크가 클립보드에 복사되었습니다.');
    }
  };

  const handleDownload = async () => {
    if (!reportRef.current) return;
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: isDark ? '#020617' : '#f8fafc',
        useCORS: true,
        logging: false,
      });
      const link = document.createElement('a');
      link.download = `neural-signal-report-${userName}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('다운로드 실패:', err);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-48 flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in zoom-in duration-700">
        <div
          className={`w-24 h-24 ${isDark ? 'bg-indigo-600/10 border-indigo-500/20' : 'bg-indigo-50 border-indigo-200'} rounded-full flex items-center justify-center text-indigo-500 border-2 shadow-[0_0_50px_rgba(99,102,241,0.2)]`}
        >
          <Lock size={48} />
        </div>
        <div className="space-y-4">
          <h2
            className={`text-5xl font-black tracking-tighter italic uppercase ${isDark ? 'text-white' : 'text-slate-900'}`}
          >
            Neural Privacy
          </h2>
          <p
            className={`text-xl font-bold max-w-lg ${isDark ? 'text-slate-500' : 'text-slate-600'}`}
          >
            실험 데이터는 개인정보 보호를 위해 비공개 처리되어 있습니다.
            <br />
            로그인하여 당신의 뇌파 시그널 리포트를 확인하세요.
          </p>
        </div>
        <button
          onClick={openAuthModal}
          className="px-10 py-5 bg-indigo-600 text-white rounded-2xl font-black text-xl flex items-center gap-3 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20"
        >
          <LogIn size={20} /> 로그인 하고 결과 보기
        </button>
      </div>
    );
  }

  return (
    <div
      ref={reportRef}
      className="max-w-5xl mx-auto px-6 py-20 space-y-24 animate-in fade-in duration-1000 bg-transparent"
    >
      {/* 리포트 헤더 */}
      <div
        className={`flex flex-col md:flex-row justify-between items-end gap-6 border-b pb-10 ${isDark ? 'border-white/5' : 'border-indigo-100'}`}
      >
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-[10px] font-black uppercase text-indigo-400 tracking-widest">
            Experiment Report #2026-0415
          </div>
          <h2
            className={`text-5xl font-black tracking-tighter italic uppercase ${isDark ? 'text-white' : 'text-slate-900'}`}
          >
            심층 분석 리포트
          </h2>
          <p
            className={`font-bold italic ${isDark ? 'text-slate-500' : 'text-slate-600'}`}
          >
            실시간 뇌파 동조화 분석 기반 정밀 결과 보고서
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleShare}
            className={`p-4 glass border rounded-2xl transition-all ${isDark ? 'border-white/10 text-slate-400 hover:text-white' : 'border-indigo-100 text-slate-500 hover:text-indigo-600'}`}
          >
            <Share2 size={20} />
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center justify-center p-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
          >
            <Download size={22} />
          </button>
        </div>
      </div>

      {/* 분석 섹션 01 */}
      <section className="space-y-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black italic shadow-lg shadow-indigo-600/20">
            01
          </div>
          <h3
            className={`text-2xl font-black italic uppercase tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}
          >
            뇌파 동조율 분석 (Neural Sync)
          </h3>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div
            className={`glass p-10 rounded-[40px] border flex flex-col justify-center space-y-8 ${isDark ? 'border-white/5' : 'border-indigo-100'}`}
          >
            <div className="space-y-6">
              <div
                className={`flex items-center justify-between p-6 rounded-3xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-indigo-100 shadow-sm'}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                    <Users size={24} />
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      참여한 사람
                    </div>
                    <div
                      className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}
                    >
                      {userName}
                    </div>
                  </div>
                </div>
              </div>
              <div
                className={`flex items-center justify-between p-6 rounded-3xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-indigo-100 shadow-sm'}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
                    <Users size={24} />
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      함께 참여한 사람
                    </div>
                    <div
                      className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}
                    >
                      {partnerName}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div
              className={`p-8 rounded-3xl border flex items-start gap-4 ${isDark ? 'bg-indigo-600/10 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100'}`}
            >
              <div className="p-2 bg-indigo-600 rounded-lg text-white">
                <Info size={20} />
              </div>
              <p
                className={`text-sm font-medium leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-700'}`}
              >
                두 피험자가 동일한 주제로 상호작용하는 동안{' '}
                <span className="font-bold text-indigo-500">
                  전두엽(Frontal)
                </span>{' '}
                영역의 뇌파 위상이 고도로 일치되었습니다.
              </p>
            </div>
          </div>

          <div
            className={`glass p-12 rounded-[40px] border flex flex-col items-center justify-center text-center relative overflow-hidden ${isDark ? 'border-white/5' : 'border-indigo-100'}`}
          >
            <div className="relative mb-8 p-6 flex items-center justify-center">
              <svg
                width="240"
                height="240"
                viewBox="0 0 200 200"
                className="-rotate-90 drop-shadow-[0_0_15px_rgba(99,102,241,0.3)]"
              >
                <circle
                  cx="100"
                  cy="100"
                  r={radius}
                  className={`fill-none ${isDark ? 'stroke-white/10' : 'stroke-indigo-100'}`}
                  strokeWidth="16"
                />
                <circle
                  cx="100"
                  cy="100"
                  r={radius}
                  className="fill-none stroke-indigo-600"
                  strokeWidth="16"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">
                  Total Sync
                </span>
                <span className="text-7xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-indigo-600 to-purple-600">
                  {userScore.toFixed(0)}%
                </span>
              </div>
            </div>
            <h4
              className={`text-2xl font-black italic uppercase ${isDark ? 'text-white' : 'text-slate-900'}`}
            >
              {currentLevel.label}
            </h4>
          </div>
        </div>
      </section>

      {/* 분석 섹션 02 */}
      <section className="space-y-8 scroll-mt-32">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center text-white font-black italic shadow-lg shadow-purple-600/20">
            02
          </div>
          <h3
            className={`text-2xl font-black italic uppercase tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}
          >
            재미로 보는 뇌BTI (Neural Profile)
          </h3>
        </div>

        <div
          className={`glass p-10 md:p-16 rounded-[50px] border overflow-hidden ${isDark ? 'border-white/5' : 'border-indigo-100'}`}
        >
          <div className="grid md:grid-cols-1 gap-12 items-start">
            <div className="space-y-10">
              <div className="space-y-6">
                <h4
                  className={`text-6xl font-black italic tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}
                >
                  ENFJ-A
                </h4>
                <h5 className="text-2xl font-black text-indigo-400 italic">
                  &quot;동조화 리더형 (Neural Synchronizer)&quot;
                </h5>
                <p
                  className={`text-lg font-bold leading-relaxed max-w-3xl ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
                >
                  참여자가 실험에 참여했을 때 활성화된 영역에 따라 분석한 유형
                  지도입니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="flex justify-center pt-20 pb-10">
        <button
          onClick={() => setCurrentPage('home')} // 실제로 사용하여 경고 해결
          className={`px-10 py-4 rounded-2xl font-black text-lg transition-all border ${
            isDark
              ? 'glass border-white/10 text-slate-400 hover:text-white hover:bg-white/5'
              : 'bg-white border-indigo-100 text-slate-500 hover:text-indigo-600 shadow-sm'
          }`}
        >
          ← 메인으로 돌아가기
        </button>
      </section>
    </div>
  );
};

export default Results;
