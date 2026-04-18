'use client';

import React from 'react';
import type { CosinePearsonFaa } from '@/07-shared/schemas/similarity';

interface SimilarityResultViewProps {
  /** Zod 파싱된 유사도 결과 — null이면 fallback UI 표시함 */
  data: CosinePearsonFaa | null;
  /** 현재 UI 테마 — Results 페이지에서 전달받음 */
  theme: 'light' | 'dark';
}

/**
 * [Page] SEQUENTIAL 모드 반응 유사도 분석 결과 뷰 정의함
 * similarity_score, overall_cosine, band_ratio_diff, faa_absolute_diff 표시함
 * Results 페이지의 light/dark 테마 prop을 존중하여 대비를 유지함
 */
const SimilarityResultView: React.FC<SimilarityResultViewProps> = ({
  data,
  theme,
}) => {
  const isDark = theme === 'dark';

  // 테마별 클래스 토큰 계산함
  const surfaceBorderClass = isDark ? 'border-white/5' : 'border-slate-200';
  const scoreBarTrackClass = isDark ? 'bg-white/10' : 'bg-slate-200';
  const headingTextClass = isDark ? 'text-white' : 'text-slate-900';
  const subtleTextClass = isDark ? 'text-slate-500' : 'text-slate-500';
  const bodyTextClass = isDark ? 'text-slate-300' : 'text-slate-700';
  const mutedTextClass = isDark ? 'text-slate-400' : 'text-slate-600';
  const tableRowBorderClass = isDark ? 'border-white/5' : 'border-slate-200';

  // Zod 파싱 실패 또는 알 수 없는 구조인 경우 fallback 렌더링함
  if (data === null) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-24 flex flex-col items-center justify-center text-center space-y-6">
        <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/20">
          <p className="text-amber-400 font-bold text-lg">
            분석 결과 구조 변경 감지 — 새 알고리즘 적용됨
          </p>
          <p className={`text-sm mt-2 ${mutedTextClass}`}>
            결과를 표시할 수 없습니다. 관리자에게 문의하세요.
          </p>
        </div>
      </div>
    );
  }

  const scorePercent = (data.similarity_score * 100).toFixed(1);
  const scoreWidth = `${(data.similarity_score * 100).toFixed(0)}%`;

  return (
    <div className="max-w-5xl mx-auto px-6 pt-20 pb-20 space-y-16 animate-in fade-in duration-1000">
      {/* 헤더 */}
      <div
        className={`flex flex-col gap-2 border-b pb-10 ${surfaceBorderClass}`}
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-[10px] font-black uppercase text-emerald-400 tracking-widest w-fit">
          Sequential Experiment Report
        </div>
        <h2
          className={`text-3xl sm:text-5xl font-black tracking-tighter uppercase ${headingTextClass}`}
        >
          반응 유사도 분석 리포트
        </h2>
        <p className={`text-sm font-bold ${subtleTextClass}`}>
          시분할 순차 측정 기반 뇌파 반응 유사도 분석 결과임
        </p>
      </div>

      {/* 반응 유사도 점수 섹션 */}
      <section className="space-y-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-emerald-600/20">
            01
          </div>
          <h3
            className={`text-base sm:text-2xl font-black uppercase tracking-tighter ${headingTextClass}`}
          >
            반응 유사도 점수
          </h3>
        </div>

        <div
          className={`glass p-10 rounded-[40px] border space-y-6 ${surfaceBorderClass}`}
        >
          {/* 점수 표시 바 */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span
                className={`text-sm font-bold uppercase tracking-wider ${mutedTextClass}`}
              >
                반응 유사도
              </span>
              <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
                {scorePercent}%
              </span>
            </div>
            <div
              className={`h-5 rounded-full overflow-hidden ${scoreBarTrackClass}`}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700"
                style={{ width: scoreWidth }}
              />
            </div>
            <div
              className={`flex justify-between text-[10px] font-bold ${subtleTextClass}`}
            >
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      </section>

      {/* overall_cosine 섹션 */}
      <section className="space-y-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-teal-600/20">
            02
          </div>
          <h3
            className={`text-base sm:text-2xl font-black uppercase tracking-tighter ${headingTextClass}`}
          >
            전체 코사인 유사도
          </h3>
        </div>

        <div
          className={`glass p-8 rounded-[32px] border flex items-center gap-6 ${surfaceBorderClass}`}
        >
          <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
            <span className="text-teal-400 font-black text-xl">
              {data.overall_cosine.toFixed(3)}
            </span>
          </div>
          <div>
            <p
              className={`text-xs font-black uppercase tracking-widest ${subtleTextClass}`}
            >
              Overall Cosine
            </p>
            <p className={`text-sm mt-1 ${bodyTextClass}`}>
              두 피실험자 간 뇌파 신호의 전체 코사인 유사도 값임
            </p>
          </div>
        </div>
      </section>

      {/* band_ratio_diff 섹션 */}
      <section className="space-y-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-indigo-600/20">
            03
          </div>
          <h3
            className={`text-base sm:text-2xl font-black uppercase tracking-tighter ${headingTextClass}`}
          >
            뇌파 대역별 파워 비율 차이
          </h3>
        </div>

        <div
          className={`glass p-8 rounded-[32px] border space-y-4 ${surfaceBorderClass}`}
        >
          <table className="w-full text-sm">
            <thead>
              <tr
                className={`text-[10px] font-black uppercase tracking-widest ${subtleTextClass}`}
              >
                <th className="text-left pb-4">대역</th>
                <th className="text-right pb-4">비율 차이</th>
              </tr>
            </thead>
            <tbody className="space-y-2">
              {Object.entries(data.band_ratio_diff).map(([band, diff]) => (
                <tr key={band} className={`border-t ${tableRowBorderClass}`}>
                  <td className={`py-3 font-bold capitalize ${bodyTextClass}`}>
                    {band}
                  </td>
                  <td
                    className={`py-3 font-black text-right ${
                      diff >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {diff >= 0 ? '+' : ''}
                    {diff.toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* faa_absolute_diff 섹션 */}
      <section className="space-y-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-purple-600/20">
            04
          </div>
          <h3
            className={`text-base sm:text-2xl font-black uppercase tracking-tighter ${headingTextClass}`}
          >
            전두엽 비대칭 활성도 차이 (FAA)
          </h3>
        </div>

        <div
          className={`glass p-8 rounded-[32px] border flex items-center gap-6 ${surfaceBorderClass}`}
        >
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            {data.faa_absolute_diff !== null ? (
              <span className="text-purple-400 font-black text-lg">
                {data.faa_absolute_diff.toFixed(3)}
              </span>
            ) : (
              <span className={`font-black text-sm ${subtleTextClass}`}>
                N/A
              </span>
            )}
          </div>
          <div>
            <p
              className={`text-xs font-black uppercase tracking-widest ${subtleTextClass}`}
            >
              FAA Absolute Diff
            </p>
            <p className={`text-sm mt-1 ${bodyTextClass}`}>
              {data.faa_absolute_diff !== null
                ? '두 피실험자 간 전두엽 비대칭 활성도 절대 차이값임'
                : '데이터 없음 — 측정 조건 미충족'}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SimilarityResultView;
