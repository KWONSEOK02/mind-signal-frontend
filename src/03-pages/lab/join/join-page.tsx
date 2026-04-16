'use client';

import React, {
  useSyncExternalStore,
  useState,
  useRef,
  useEffect,
} from 'react';
import { useSearchParams } from 'next/navigation'; // 추가됨: URL 파라미터 감지용
import { QRScanner, usePairing } from '@/05-features/sessions';
import { SignalMeasurer, useSignal } from '@/05-features/signals';
import { SESSION_STATUS, extractToken } from '@/07-shared';
import { MIN_ANALYSIS_SECONDS } from '@/07-shared/constants/experiment';
import {
  Smartphone,
  Link as LinkIcon,
  CheckCircle2,
  AlertCircle,
  RefreshCw, // 추가됨: 재시도 버튼 아이콘
} from 'lucide-react';

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

  const searchParams = useSearchParams();
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  // 측정 중지 확인 다이얼로그 표시 상태 관리함
  const [showStopDialog, setShowStopDialog] = useState(false);

  // 중복 스캔 방지를 위한 상태 추적 변수 선언함
  const lastProcessedCode = useRef<string | null>(null);

  /**
   * 그룹 합류 및 상태 관리 수행함 (피실험자는 단일 대상이므로 인자 생략함)
   */
  const {
    status,
    groupId,
    subjectIndex,
    sessionId,
    requestPairing,
    resetStatus,
  } = usePairing();

  const {
    isMeasuring,
    lastReceivedTime,
    elapsedSeconds,
    startMeasurement,
    stopMeasurement,
  } = useSignal(sessionId ?? null);

  /**
   * URL 기반 자동 페어링 로직 수행함 (새로 추가된 누락 복구 기능)
   */
  useEffect(() => {
    if (!isClient) return;

    const rawCode = searchParams?.get('code');
    const token = rawCode ? extractToken(rawCode) : null;

    if (token && token !== lastProcessedCode.current) {
      lastProcessedCode.current = token;
      resetStatus();
      requestPairing(token);
    }
  }, [searchParams, isClient, requestPairing, resetStatus]);

  /**
   * 측정 중지 버튼 클릭 시 확인 다이얼로그 표시함
   */
  const handleStopClick = () => {
    setShowStopDialog(true);
  };

  /**
   * 다이얼로그 확인 시 stop-all API 호출 후 다이얼로그 닫기 수행함
   */
  const handleStopConfirm = async () => {
    setShowStopDialog(false);
    await stopMeasurement(groupId ?? undefined, 'ManualEarly');
  };

  /**
   * 다이얼로그 취소 시 닫기 수행함
   */
  const handleStopCancel = () => {
    setShowStopDialog(false);
  };

  /**
   * 재시도 및 중복 가드 초기화 로직 수행함 (새로 추가된 기능)
   */
  const handleRetry = () => {
    lastProcessedCode.current = null;
    resetStatus();
    setIsScannerOpen(false);
  };

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
      // 실패 시 즉각적인 재스캔이 가능하도록 참조값 초기화 수행함
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
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400">
                    <AlertCircle size={20} className="shrink-0 mt-0.5" />
                    <p className="text-sm font-medium">
                      {status === SESSION_STATUS.EXPIRED
                        ? '세션이 만료되었거나 유효하지 않은 실험 정보임. 운영자에게 새로운 QR 코드를 요청하기 바람.'
                        : '네트워크 또는 서버 오류가 발생함. 잠시 후 다시 시도하기 바람.'}
                    </p>
                  </div>
                  {/* 추가됨: 스마트 재시도 버튼 */}
                  <button
                    onClick={handleRetry}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-white/5 text-sm font-bold text-white hover:bg-white/10 transition-colors"
                  >
                    <RefreshCw size={16} />
                    다시 시도하기
                  </button>
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
                onStop={handleStopClick}
                lastSentTime={lastReceivedTime}
                elapsedSeconds={elapsedSeconds}
              />

              {/* 측정 중지 확인 다이얼로그 — MIN_ANALYSIS_SECONDS 기준 경고/확인 분기함 */}
              {showStopDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6">
                  <div className="w-full max-w-sm p-6 rounded-3xl bg-slate-900 border border-white/10 space-y-4">
                    {elapsedSeconds < MIN_ANALYSIS_SECONDS ? (
                      <>
                        <div className="flex items-center gap-2 text-amber-400">
                          <AlertCircle size={20} />
                          <span className="font-bold text-sm">
                            데이터 부족 경고
                          </span>
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed">
                          현재 측정 시간:{' '}
                          <span className="font-bold text-white">
                            {Math.floor(elapsedSeconds / 60)}분{' '}
                            {elapsedSeconds % 60}초
                          </span>
                          <br />
                          최소 분석 시간({Math.floor(MIN_ANALYSIS_SECONDS / 60)}
                          분)에{' '}
                          <span className="font-bold text-amber-400">
                            {MIN_ANALYSIS_SECONDS - elapsedSeconds}초
                          </span>{' '}
                          부족합니다.
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 text-emerald-400">
                          <CheckCircle2 size={20} />
                          <span className="font-bold text-sm">분석 가능</span>
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed">
                          현재 측정 시간:{' '}
                          <span className="font-bold text-white">
                            {Math.floor(elapsedSeconds / 60)}분{' '}
                            {elapsedSeconds % 60}초
                          </span>
                          <br />
                          충분한 데이터가 수집되었습니다.
                        </p>
                      </>
                    )}
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={handleStopCancel}
                        className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-sm font-bold text-slate-300 hover:bg-white/10 transition-colors"
                      >
                        계속 측정
                      </button>
                      <button
                        onClick={handleStopConfirm}
                        className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors ${
                          elapsedSeconds < MIN_ANALYSIS_SECONDS
                            ? 'bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:bg-amber-500/30'
                            : 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30'
                        }`}
                      >
                        {elapsedSeconds < MIN_ANALYSIS_SECONDS
                          ? '그래도 종료'
                          : '측정 종료'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleRetry} // 다른 그룹 참여 시에도 Ref를 깔끔하게 지우기 위해 handleRetry로 교체함
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
