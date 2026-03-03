'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Smartphone, Camera } from 'lucide-react';

/**
 * [UI] 모바일 기기로 접속한 사용자에게 실험 참여를 유도하는 전용 뷰 정의함
 */
const MobileLabView: React.FC = () => {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
      <div className="space-y-10 w-full max-w-sm animate-in fade-in duration-700">
        {/* 장치 아이콘 및 시각적 효과 섹션 구성함 */}
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 bg-indigo-500/10 blur-3xl rounded-full animate-pulse" />
          <div className="relative bg-slate-900 border border-slate-800 rounded-[2.5rem] p-6 shadow-2xl">
            <Smartphone className="w-full h-full text-indigo-500" />
          </div>
        </div>

        {/* 안내 텍스트 섹션 정의함 */}
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-white uppercase tracking-tight">
            Participant Mode
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed font-medium">
            모바일 기기를 연동하여
            <br />
            실험 데이터를 전송함
          </p>
        </div>

        {/* 참여 페이지 이동 액션 버튼 구현함 */}
        <button
          onClick={() => router.push('/join')}
          className="w-full group relative px-8 py-5 bg-white rounded-2xl font-black text-slate-950 flex items-center justify-center gap-3 hover:scale-[1.02] transition-all active:scale-95"
        >
          <Camera size={22} />
          <span>실험 참여하기 (QR 스캔)</span>
        </button>

        <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] pt-4">
          Mind Signal Neural Interface
        </p>
      </div>
    </div>
  );
};

export default MobileLabView;
