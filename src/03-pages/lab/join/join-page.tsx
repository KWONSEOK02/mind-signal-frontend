'use client';

import React, { useSyncExternalStore, useState, useRef } from 'react';
import { QRScanner, usePairing } from '@/05-features/sessions';
import { SignalMeasurer, useSignal } from '@/05-features/signals';
import { SESSION_STATUS, extractToken } from '@/07-shared'; // extractToken 유틸리티 임포트 추가함
import {
  Smartphone,
  Link as LinkIcon,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'; // AlertCircle 아이콘 추가함

const emptySubscribe = () => () => {};

/**
 * [Page] 피실험자가 그룹에 합류하고 뇌파 측정을 수행하는 페이지 정의함
 */
const JoinPage = () => {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // 중복 스캔 방지를 위한 상태 추적 변수 선언함
  const lastProcessedCode = useRef<string | null>(null);

  /**
   * 그룹 합류 및 상태 관리 수행함 (피실험자는 단일 대상이므로 인자 생략함)
   */
  const { status, groupId, subjectIndex, requestPairing, resetStatus } =
    usePairing();

  const { isMeasuring, lastSentTime, startMeasurement, stopMeasurement } =
    useSignal(groupId, subjectIndex);

  /**
   * QR 스캔 성공 시 토큰 추출 및 중복 호출 방지 로직 수행함
   */
  const handleScanSuccess = async (rawCode: string) => {
    const token = extractToken(rawCode);
    if (!token) return;

    // 동일한 토큰에 대한 중복 요청 차단함
    if (lastProcessedCode.current === token) return;
    lastProcessedCode.current = token;

    const result = await requestPairing(token);

    if (result.success) {
      setIsScannerOpen(false);
    } else {
      // 실패 시 재스캔이 가능하도록 참조값 초기화 수행함
      lastProcessedCode.current = null;
      setIsScannerOpen(false);
    }
  };

  if (!isClient) return <div className="min-h-screen bg-slate-950" />;

  return (
    <main className="min-h-screen bg-slate-950 pt-24 pb-12 px-6">
      <div className="max-w-md mx-auto space-y-8">
        <header className="text-center space-y-4">
          <div className="inline-flex p-3 rounded-2xl bg-indigo-500/10 text-indigo-500 mb-2">
            <Smartphone size={32} />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">
            Join <span className="text-indigo-500">Experiment</span>
          </h1>
          <p className="text-slate-400 text-sm font-medium leading-relaxed">
            운영자 대시보드에 표시된 QR 코드를 스캔하여
            <br />
            실험 그룹에 합류해야 함
          </p>
        </header>

        <section className="space-y-6">
          {status !== SESSION_STATUS.PAIRED ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
              {/* 에러 및 만료 상태 피드백 UI 제공함 */}
              {(status === SESSION_STATUS.EXPIRED ||
                status === SESSION_STATUS.ERROR) && (
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400">
                  <AlertCircle size={20} className="shrink-0 mt-0.5" />
                  <p className="text-sm font-medium">
                    {status === SESSION_STATUS.EXPIRED
                      ? '세션이 만료되었거나 유효하지 않은 실험 정보임. 운영자에게 새로운 QR 코드를 요청하기 바람.'
                      : '네트워크 또는 서버 오류가 발생함. 잠시 후 다시 시도하기 바람.'}
                  </p>
                </div>
              )}

              {!isScannerOpen ? (
                <button
                  onClick={() => setIsScannerOpen(true)}
                  className="w-full py-10 rounded-[2.5rem] bg-white/[0.02] border border-white/10 flex flex-col items-center gap-4 hover:bg-white/[0.04] transition-all group"
                >
                  <div className="p-4 rounded-full bg-indigo-500/20 text-indigo-400 group-hover:scale-110 transition-transform duration-500">
                    <LinkIcon size={24} />
                  </div>
                  <span className="text-sm font-bold text-white uppercase tracking-widest">
                    실험 합류하기 (QR 스캔)
                  </span>
                </button>
              ) : (
                <div className="animate-in zoom-in duration-300">
                  <QRScanner
                    onScanSuccess={handleScanSuccess}
                    onClose={() => setIsScannerOpen(false)}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6 animate-in zoom-in duration-500">
              <div className="p-8 rounded-[2.5rem] bg-indigo-600 border border-indigo-400 shadow-2xl shadow-indigo-500/20 text-white relative overflow-hidden">
                <CheckCircle2
                  className="absolute -right-4 -top-4 text-white/10"
                  size={120}
                />
                <div className="relative space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200">
                      Connection Verified
                    </p>
                  </div>
                  <h2 className="text-4xl font-black italic tracking-tighter">
                    SUBJECT{' '}
                    <span className="text-indigo-100">
                      {String(subjectIndex).padStart(2, '0')}
                    </span>
                  </h2>
                  <div className="pt-2">
                    <span className="px-3 py-1 rounded-full bg-black/20 text-[10px] font-mono text-indigo-200 border border-white/10">
                      ID: {groupId}
                    </span>
                  </div>
                </div>
              </div>

              <SignalMeasurer
                sessionId={groupId || ''}
                isMeasuring={isMeasuring}
                onStart={startMeasurement}
                onStop={stopMeasurement}
                lastSentTime={lastSentTime}
              />

              <button
                onClick={resetStatus}
                className="w-full py-4 text-xs font-bold text-slate-500 hover:text-white transition-colors uppercase tracking-widest"
              >
                다른 그룹에 참여하기
              </button>
            </div>
          )}
        </section>

        <footer className="pt-8 flex justify-center border-t border-white/5">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
            <div
              className={`w-1.5 h-1.5 rounded-full ${isMeasuring ? 'bg-emerald-500' : 'bg-slate-600'}`}
            />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Live Data Link Active
            </span>
          </div>
        </footer>
      </div>
    </main>
  );
};

export default JoinPage;
