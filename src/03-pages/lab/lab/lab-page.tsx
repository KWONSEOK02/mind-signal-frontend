'use client';

import React, { useState, useEffect } from 'react';
import { usePairing, QRGenerator } from '@/05-features/sessions';
import { Activity, FlaskConical, BrainCircuit, Zap } from 'lucide-react';

/**
 * [Page] 듀얼 슬롯 기반 실험실 대시보드 페이지 정의함
 */
const LabPage: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const userA = usePairing();
  const userB = usePairing();

  /**
   * 하이드레이션Mismatch 및 동기적 상태 업데이트 에러 해결 수행함
   */
  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      setMounted(true);
    });
    return () => cancelAnimationFrame(frameId);
  }, []);

  if (!mounted) return null;

  /**
   * any 타입 제거를 위해 usePairing 반환 타입 명시적으로 사용함
   */
  const renderSubjectPanel = (
    user: ReturnType<typeof usePairing>,
    label: string,
    color: string
  ) => (
    <div
      className={`p-8 rounded-[2.5rem] border-2 bg-slate-900/20 border-slate-800 flex-1 flex flex-col gap-6`}
    >
      <h3
        className={`text-xs font-black uppercase tracking-widest text-${color}-500`}
      >
        {label}
      </h3>
      <div className="flex-1 flex items-center justify-center border border-slate-800/50 rounded-2xl bg-slate-950/50 min-h-[350px]">
        {user.status === 'PAIRED' ? (
          <div className="text-center animate-in zoom-in">
            <BrainCircuit
              size={64}
              className={`text-${color}-500 mb-4 animate-pulse`}
            />
            <p className="text-sm font-black text-white uppercase">
              Signal Active
            </p>
          </div>
        ) : (
          <div className="scale-95 flex flex-col items-center gap-6">
            {!user.pairingCode ? (
              <button onClick={user.startPairing} className="group">
                <Zap className="text-slate-600 group-hover:text-white mb-2" />
                <span className="text-[10px] font-black text-slate-500 uppercase">
                  Generate QR
                </span>
              </button>
            ) : (
              <QRGenerator
                value={`${window.location.origin}/join?code=${user.pairingCode}`}
                timeLeft={user.timeLeft}
                onRefresh={user.startPairing}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 p-8 flex flex-col gap-8">
      <header className="flex items-center gap-3">
        <FlaskConical className="text-indigo-500" size={28} />
        <h1 className="text-xl font-black uppercase text-white tracking-tighter">
          Mind Signal Lab
        </h1>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row gap-8 max-w-[1600px] mx-auto w-full">
        {renderSubjectPanel(userA, 'Subject Alpha', 'indigo')}
        <section className="w-full lg:w-1/3 bg-slate-900/40 border border-slate-800 rounded-[3rem] flex flex-col items-center justify-center p-12">
          <Activity size={48} className="text-slate-800 mb-8" />
          <div className="text-[6rem] font-black text-slate-900 tracking-tighter">
            {userA.status === 'PAIRED' && userB.status === 'PAIRED'
              ? '96%'
              : '00%'}
          </div>
        </section>
        {renderSubjectPanel(userB, 'Subject Beta', 'emerald')}
      </main>
    </div>
  );
};

export default LabPage;
