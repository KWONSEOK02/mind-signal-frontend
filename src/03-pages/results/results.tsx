'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Lock,
  Share2,
  LogIn,
  Download,
  Users,
  Info,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { PageType } from '@/07-shared/types';
import { analysisApi } from '@/07-shared/api/analysis';
import sessionApi from '@/07-shared/api/session';
import type { AnalysisResultData } from '@/07-shared/api/analysis';
import { getSocket } from '@/07-shared/lib/socket-client';
import { config } from '@/07-shared/config/config';
import {
  POLLING_TIMEOUT_SECONDS,
  POLLING_INTERVAL_MS,
} from '@/07-shared/constants/experiment';
import type { AnalysisTier } from '@/07-shared/types';
import MyResultsList from './my-results-list';
import SimilarityResultView from './similarity-result-view';
import { cosinePearsonFaaSchema, similaritySchemaRegistry } from '@/07-shared/schemas/similarity';
import type { CosinePearsonFaa } from '@/07-shared/schemas/similarity';

interface ResultsProps {
  theme: 'light' | 'dark';
  isLoggedIn: boolean;
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean>>;
  setCurrentPage: (page: PageType) => void;
  openAuthModal: () => void;
  groupId?: string;
}

const Results: React.FC<ResultsProps> = ({
  theme,
  isLoggedIn,
  setCurrentPage,
  openAuthModal,
  groupId,
}) => {
  const isDark = theme === 'dark';
  const reportRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const [analysisData, setAnalysisData] = useState<AnalysisResultData | null>(
    null
  );
  const [userName, setUserName] = useState<string>('');
  const [partnerName, setPartnerName] = useState<string>('');
  const [loading, setLoading] = useState(!!groupId && isLoggedIn);
  const [error, setError] = useState<string | null>(null);
  const [tier, setTier] = useState<AnalysisTier | null>(null);
  const [pollingTimedOut, setPollingTimedOut] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStartRef = useRef<number>(0);
  const sessionsRef = useRef<Array<{ isMe?: boolean; userName?: string }>>([]);
  const fetchDataRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!groupId || !isLoggedIn) return;

    let cancelled = false;

    const fetchData = async () => {
      try {
        const [analysisRes, statusRes] = await Promise.all([
          analysisApi.getResult(groupId).catch(() => null),
          sessionApi.checkSessionStatus(groupId),
        ]);

        if (cancelled) return;

        // 세션 상태에서 userName/partnerName 추출함
        const sessions = statusRes.data?.data?.sessions ?? [];
        sessionsRef.current = sessions; // ref에 보관하여 폴링 콜백에서 접근 가능
        const mySess = sessions.find((s) => s.isMe);
        const partnerSess = sessions.find((s) => !s.isMe);
        setUserName(mySess?.userName || '');
        setPartnerName(partnerSess?.userName || '');

        if (analysisRes?.status === 'success' && analysisRes.data) {
          setAnalysisData(analysisRes.data);
          setLoading(false);
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        } else {
          // 분석 결과 미존재 — 폴링함
          setError('분석이 진행 중입니다...');
          pollStartRef.current = Date.now();

          if (!pollTimerRef.current) {
            pollTimerRef.current = setInterval(async () => {
              // 타임아웃 체크
              const elapsed = (Date.now() - pollStartRef.current) / 1000;
              if (elapsed >= POLLING_TIMEOUT_SECONDS) {
                if (pollTimerRef.current) clearInterval(pollTimerRef.current);
                pollTimerRef.current = null;
                if (!cancelled) {
                  setPollingTimedOut(true);
                  setLoading(false);
                  setError(null);
                }
                return;
              }

              try {
                const res = await analysisApi.getResult(groupId);
                if (!cancelled && res?.status === 'success' && res.data) {
                  setAnalysisData(res.data);
                  setError(null);
                  setLoading(false);
                  if (pollTimerRef.current) clearInterval(pollTimerRef.current);

                  // Tier 판정: isBTI인데 원래 DUAL이었으면 PARTIAL
                  // SEQUENTIAL 결과는 tier 오탐 방지를 위해 제외함
                  if (
                    res.data.isBTI &&
                    sessionsRef.current.length >= 2 &&
                    res.data.analysis_mode !== 'SEQUENTIAL'
                  ) {
                    setTier('PARTIAL');
                  } else {
                    setTier('VALID');
                  }
                }
              } catch {
                // 계속 폴링함
              }
            }, POLLING_INTERVAL_MS);
          }
        }
      } catch {
        if (!cancelled) {
          setError('일시적 오류가 발생했습니다.');
          setLoading(false);
        }
      }
    };

    fetchDataRef.current = fetchData;
    fetchData();
    return () => {
      cancelled = true;
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [groupId, isLoggedIn]);

  // analysis-status 소켓 이벤트 리스너 등록함
  useEffect(() => {
    if (!groupId) return;
    const socket = getSocket(config.api.socketUrl ?? config.api.baseUrl);

    const handler = (payload: {
      groupId: string;
      tier: AnalysisTier;
      message: string;
    }) => {
      if (payload.groupId !== groupId) return;
      setTier(payload.tier);
      if (payload.tier === 'ABORTED') {
        setPollingTimedOut(true);
        setLoading(false);
        setError(null);
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
      }
    };

    socket.on('analysis-status', handler);
    return () => {
      socket.off('analysis-status', handler);
    };
  }, [groupId]);

  // SEQUENTIAL 모드 분기 처리 — similarity_features를 Zod 파싱함
  if (analysisData?.analysis_mode === 'SEQUENTIAL') {
    let parsedSimilarity: CosinePearsonFaa | null = null;

    if (analysisData.similarity_features) {
      // 알고리즘 이름 기반으로 스키마 선택함 (없으면 cosine_pearson_faa 기본 사용)
      const algorithmKey =
        typeof analysisData.similarity_features['algorithm'] === 'string'
          ? analysisData.similarity_features['algorithm']
          : 'cosine_pearson_faa';

      const schema = similaritySchemaRegistry[algorithmKey] ?? cosinePearsonFaaSchema;
      const parseResult = schema.safeParse(analysisData.similarity_features);

      if (parseResult.success) {
        parsedSimilarity = parseResult.data as CosinePearsonFaa;
      }
      // 파싱 실패 시 parsedSimilarity는 null 유지 — fallback UI 표시됨
    }

    return <SimilarityResultView data={parsedSimilarity} />;
  }

  const userScore = analysisData?.matchingScore ?? 0;

  const syncLevels = [
    { range: '0 - 20%', label: '"서먹서먹한 사이"', color: 'text-slate-500' },
    {
      range: '20 - 40%',
      label: '"개성이 뚜렷한 사이"',
      color: 'text-amber-500',
    },
    { range: '40 - 60%', label: '"편안한 친구 사이"', color: 'text-blue-500' },
    {
      range: '60 - 80%',
      label: '"환상의 티키타카"',
      color: 'text-emerald-500',
    },
    {
      range: '80 - 100%',
      label: '"이심전심 소울메이트"',
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

  // groupId 없는 경우 — 내 실험 결과 목록 렌더링함
  if (isLoggedIn && !groupId) {
    return (
      <MyResultsList
        theme={theme}
        isLoggedIn={isLoggedIn}
        openAuthModal={openAuthModal}
        setCurrentPage={setCurrentPage}
      />
    );
  }

  // 로딩 상태
  if (isLoggedIn && loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-24 sm:py-48 flex flex-col items-center justify-center text-center space-y-6">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
        <p
          className={`text-lg font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
        >
          {error || '분석 결과를 불러오는 중...'}
        </p>
      </div>
    );
  }

  // ABORTED 상태 — 측정 시간 부족으로 분석 불가
  if (isLoggedIn && tier === 'ABORTED') {
    return (
      <div className="max-w-7xl mx-auto px-6 py-24 sm:py-48 flex flex-col items-center justify-center text-center space-y-6">
        <div className="w-20 h-20 bg-rose-500/10 border-2 border-rose-500/20 rounded-full flex items-center justify-center">
          <AlertCircle size={40} className="text-rose-400" />
        </div>
        <h2
          className={`text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}
        >
          분석 불가
        </h2>
        <p
          className={`text-lg ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
        >
          측정 시간이 너무 짧아 분석할 수 없습니다.
          <br />
          재측정이 필요합니다.
        </p>
        <button
          onClick={() => router.push('/lab/join')}
          className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold cursor-pointer hover:bg-indigo-700 transition-all"
        >
          재측정하기
        </button>
      </div>
    );
  }

  // 폴링 타임아웃 — ABORTED가 아닌데 결과 없음
  if (isLoggedIn && pollingTimedOut && !analysisData && tier !== 'ABORTED') {
    return (
      <div className="max-w-7xl mx-auto px-6 py-24 sm:py-48 flex flex-col items-center justify-center text-center space-y-6">
        <h2
          className={`text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}
        >
          결과를 가져올 수 없습니다
        </h2>
        <p
          className={`text-lg ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
        >
          분석 서버 응답 시간이 초과되었습니다.
        </p>
        <div className="flex gap-4">
          <button
            onClick={() => {
              setPollingTimedOut(false);
              setLoading(true);
              setError(null);
              // 기존 폴링 타이머 정리 후 재시작함
              if (pollTimerRef.current) {
                clearInterval(pollTimerRef.current);
                pollTimerRef.current = null;
              }
              if (fetchDataRef.current) fetchDataRef.current();
            }}
            className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold cursor-pointer hover:bg-indigo-700 transition-all"
          >
            재시도
          </button>
          <button
            onClick={() => setCurrentPage('home')}
            className={`px-8 py-4 rounded-2xl font-bold cursor-pointer transition-all ${
              isDark
                ? 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
          >
            메인으로
          </button>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (isLoggedIn && error && !analysisData) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-24 sm:py-48 flex flex-col items-center justify-center text-center space-y-6">
        <p
          className={`text-lg font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
        >
          {error}
        </p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-24 sm:py-48 flex flex-col items-center justify-center text-center space-y-12 animate-in fade-in zoom-in duration-700">
        <div
          className={`w-24 h-24 ${isDark ? 'bg-indigo-600/10 border-indigo-500/20' : 'bg-indigo-50 border-indigo-200'} rounded-full flex items-center justify-center text-indigo-500 border-2 shadow-[0_0_50px_rgba(99,102,241,0.2)]`}
        >
          <Lock size={48} />
        </div>
        <div className="space-y-6">
          <h2
            className={`text-5xl font-black tracking-tighter uppercase ${isDark ? 'text-white' : 'text-slate-900'}`}
          >
            Neural Privacy
          </h2>
          <p
            className={`text-xl font-semibold max-w-2xl mx-auto ${isDark ? 'text-slate-500' : 'text-slate-600'}`}
          >
            실험 데이터는 개인정보 보호를 위해 비공개 처리되어 있습니다.
            <br />
            로그인하여 당신의 뇌파 시그널 리포트를 확인하세요.
          </p>
        </div>
        <button
          onClick={openAuthModal}
          className="cursor-pointer px-10 py-5 bg-indigo-600 text-white rounded-2xl font-black text-xl flex items-center gap-3 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20"
        >
          <LogIn size={20} /> 로그인 하고 결과 보기
        </button>
      </div>
    );
  }

  return (
    <div
      ref={reportRef}
      className="max-w-5xl mx-auto px-6 pt-20 pb-20 sm:py-20 space-y-24 animate-in fade-in duration-1000 bg-transparent"
    >
      {/* 리포트 헤더 */}
      <div
        className={`flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b pb-10 ${isDark ? 'border-white/5' : 'border-indigo-100'}`}
      >
        {/* 모바일은 text-left, 웹 화면은 md:text-center 적용 */}
        <div className="space-y-2 text-left md:text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-[10px] font-black uppercase text-indigo-400 tracking-widest">
            Experiment Report
          </div>
          <h2
            className={`text-3xl sm:text-5xl font-black tracking-tighter uppercase ${isDark ? 'text-white' : 'text-slate-900'}`}
          >
            심층 분석 리포트
          </h2>
          <p
            className={`text-sm sm:text-base font-bold ${isDark ? 'text-slate-500' : 'text-slate-600'}`}
          >
            실시간 뇌파 동조화 분석 기반 정밀 결과 보고서
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleShare}
            className={`p-4 glass border rounded-2xl transition-all cursor-pointer ${isDark ? 'border-white/10 text-slate-400 hover:text-white' : 'border-indigo-100 text-slate-500 hover:text-indigo-600'}`}
          >
            <Share2 size={20} />
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center justify-center cursor-pointer p-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
          >
            <Download size={22} />
          </button>
        </div>
      </div>

      {/* PARTIAL 안내 배지 — 한 명 데이터만 분석된 경우 표시함 */}
      {tier === 'PARTIAL' ? (
        <div
          className={`flex items-center gap-3 px-5 py-3 rounded-2xl ${
            isDark
              ? 'bg-amber-500/10 border border-amber-500/20'
              : 'bg-amber-50 border border-amber-200'
          }`}
        >
          <Info size={18} className="text-amber-500 shrink-0" />
          <p
            className={`text-sm font-medium ${isDark ? 'text-amber-300' : 'text-amber-700'}`}
          >
            한 분의 데이터만 분석되었습니다 (BTI 개인 분석 모드)
          </p>
        </div>
      ) : null}

      {/* 분석 섹션 01 — DUAL이면 동조율, BTI면 개인 메트릭 */}
      {analysisData?.isBTI ? (
        <section className="space-y-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-indigo-600/20">
              01
            </div>
            <h3
              className={`text-base sm:text-2xl font-black uppercase tracking-tighter sm:tracking-tight whitespace-nowrap ${isDark ? 'text-white' : 'text-slate-900'}`}
            >
              개인 뇌파 프로필 (Neural Profile)
            </h3>
          </div>

          {analysisData.metricsMean ? (
            <div
              className={`glass p-10 rounded-[40px] border space-y-6 ${isDark ? 'border-white/5' : 'border-indigo-100'}`}
            >
              <h4
                className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}
              >
                감정 메트릭 평균
              </h4>
              {Object.entries(analysisData.metricsMean).map(([key, val]) => (
                <div key={key} className="flex items-center gap-4">
                  <span
                    className={`w-24 text-sm font-bold capitalize ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
                  >
                    {key}
                  </span>
                  <div
                    className={`flex-1 h-4 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-indigo-100'}`}
                  >
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, val * 100).toFixed(0)}%`,
                      }}
                    />
                  </div>
                  <span
                    className={`w-12 text-sm font-bold text-right ${isDark ? 'text-white' : 'text-slate-900'}`}
                  >
                    {(val * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          {analysisData.wavesMean ? (
            <div
              className={`glass p-10 rounded-[40px] border space-y-6 ${isDark ? 'border-white/5' : 'border-indigo-100'}`}
            >
              <h4
                className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}
              >
                뇌파 대역 파워
              </h4>
              {(() => {
                const total = Object.values(analysisData.wavesMean!).reduce(
                  (a, b) => a + b,
                  0
                );
                return Object.entries(analysisData.wavesMean!).map(
                  ([key, val]) => {
                    const pct = total > 0 ? (val / total) * 100 : 0;
                    return (
                      <div key={key} className="flex items-center gap-4">
                        <span
                          className={`w-24 text-sm font-bold capitalize ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
                        >
                          {key}
                        </span>
                        <div
                          className={`flex-1 h-4 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-indigo-100'}`}
                        >
                          <div
                            className="h-full bg-purple-500 rounded-full transition-all"
                            style={{ width: `${pct.toFixed(0)}%` }}
                          />
                        </div>
                        <span
                          className={`w-12 text-sm font-bold text-right ${isDark ? 'text-white' : 'text-slate-900'}`}
                        >
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                    );
                  }
                );
              })()}
            </div>
          ) : null}
        </section>
      ) : (
        <section className="space-y-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-indigo-600/20">
              01
            </div>
            <h3
              className={`text-base sm:text-2xl font-black uppercase tracking-tighter sm:tracking-tight whitespace-nowrap ${isDark ? 'text-white' : 'text-slate-900'}`}
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
                  <span className="text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-indigo-600 to-purple-600">
                    {userScore.toFixed(0)}%
                  </span>
                </div>
              </div>
              <h4 className="text-2xl font-black uppercase bg-[linear-gradient(to_right,#6672F4_0%,#00DA90_100%)] bg-clip-text text-transparent">
                {currentLevel.label}
              </h4>
            </div>
          </div>
        </section>
      )}

      {/* 분석 섹션 02 */}
      <section className="space-y-8 scroll-mt-32">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-purple-600/20">
            02
          </div>
          <h3
            className={`text-base sm:text-2xl font-black uppercase tracking-tighter sm:tracking-tight whitespace-nowrap ${isDark ? 'text-white' : 'text-slate-900'}`}
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
                  className={`text-6xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}
                >
                  ENFJ-A
                </h4>
                <h5 className="text-2xl font-black text-indigo-400">
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
          className={`group px-10 py-5 glass border rounded-3xl font-black text-lg flex items-center gap-3 cursor-pointer transition-all duration-300 ${
            isDark
              ? 'border-white/10 text-slate-300 hover:text-white hover:bg-white/10 hover:border-transparent'
              : 'border-indigo-100 text-slate-700 hover:bg-indigo-100 hover:border-transparent hover:shadow-lg shadow-indigo-500/5'
          }`}
        >
          ← 메인으로 돌아가기
        </button>
      </section>
    </div>
  );
};

export default Results;
