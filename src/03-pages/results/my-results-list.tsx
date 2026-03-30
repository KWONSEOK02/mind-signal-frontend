'use client';

import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PageType } from '@/07-shared/types';
import { analysisApi } from '@/07-shared/api/analysis';
import type { MyResultItem } from '@/07-shared/api/analysis';

interface MyResultsListProps {
  theme: 'light' | 'dark';
  isLoggedIn: boolean;
  openAuthModal: () => void;
  setCurrentPage: (page: PageType) => void;
}

/** 내 실험 결과 목록 컴포넌트 — 마운트 시 API 호출 후 카드 그리드 렌더링함 */
const MyResultsList: React.FC<MyResultsListProps> = ({
  theme,
  isLoggedIn,
  openAuthModal,
  setCurrentPage,
}) => {
  const isDark = theme === 'dark';
  const router = useRouter();

  const [items, setItems] = useState<MyResultItem[]>([]);
  const [fetched, setFetched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 비로그인 상태 — 페치 스킵함
    if (!isLoggedIn) return;

    let cancelled = false;

    const fetchMyResults = async () => {
      try {
        const res = await analysisApi.getMyResults();
        if (!cancelled) {
          setItems(res.data);
          setFetched(true);
        }
      } catch {
        if (!cancelled) {
          setError('결과 목록을 불러오는 데 실패했습니다.');
          setFetched(true);
        }
      }
    };

    fetchMyResults();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  // 로그인 상태이나 아직 API 응답 대기 중인 경우 로딩 표시함
  const loading = isLoggedIn && !fetched;

  // 날짜 포맷 변환함 (ISO → 한국식 날짜, 누락 시 폴백 처리함)
  const formatDate = (iso: string | null | undefined) => {
    if (!iso) return '날짜 없음';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '날짜 없음';
    return d.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // 비로그인 상태 렌더링함
  if (!isLoggedIn) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-24 sm:py-48 flex flex-col items-center justify-center text-center space-y-6">
        <p
          className={`text-lg font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
        >
          로그인 후 결과를 확인할 수 있습니다.
        </p>
        <button
          onClick={openAuthModal}
          className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold cursor-pointer hover:bg-indigo-700 transition-all"
        >
          로그인하기
        </button>
      </div>
    );
  }

  // 로딩 상태 렌더링함
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-24 sm:py-48 flex flex-col items-center justify-center text-center space-y-6">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
        <p
          className={`text-lg font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
        >
          결과 목록을 불러오는 중...
        </p>
      </div>
    );
  }

  // 에러 상태 렌더링함
  if (error !== null) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-24 sm:py-48 flex flex-col items-center justify-center text-center space-y-6">
        <p
          className={`text-lg font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
        >
          {error}
        </p>
        <button
          onClick={() => setCurrentPage('home')}
          className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold cursor-pointer hover:bg-indigo-700 transition-all"
        >
          메인으로 돌아가기
        </button>
      </div>
    );
  }

  // 빈 목록 상태 렌더링함
  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-24 sm:py-48 flex flex-col items-center justify-center text-center space-y-6">
        <p
          className={`text-lg font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
        >
          아직 참여한 실험이 없습니다. 실험실에서 측정을 시작하세요.
        </p>
        <button
          onClick={() => setCurrentPage('lab')}
          className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold cursor-pointer hover:bg-indigo-700 transition-all"
        >
          실험실로 이동
        </button>
      </div>
    );
  }

  // 결과 목록 카드 그리드 렌더링함
  return (
    <div className="max-w-5xl mx-auto px-6 pt-20 pb-20 sm:py-20 space-y-12 animate-in fade-in duration-700">
      <div
        className={`border-b pb-10 ${isDark ? 'border-white/5' : 'border-indigo-100'}`}
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-[10px] font-black uppercase text-indigo-400 tracking-widest mb-4">
          My Experiments
        </div>
        <h2
          className={`text-3xl sm:text-5xl font-black tracking-tighter uppercase ${isDark ? 'text-white' : 'text-slate-900'}`}
        >
          내 실험 결과 목록
        </h2>
        <p
          className={`mt-2 text-sm sm:text-base font-bold ${isDark ? 'text-slate-500' : 'text-slate-600'}`}
        >
          참여한 실험의 뇌파 동조율 분석 결과를 확인하세요.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        {items.map((item) => (
          <button
            key={item.groupId}
            onClick={() => router.push(`/results?groupId=${item.groupId}`)}
            className={`glass text-left p-8 rounded-[32px] border cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${
              isDark
                ? 'border-white/5 hover:border-indigo-500/30 hover:shadow-indigo-500/10'
                : 'border-indigo-100 hover:border-indigo-300 hover:shadow-indigo-100'
            }`}
          >
            {/* 날짜 표시함 */}
            <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">
              {formatDate(item.createdAt)}
            </div>

            {/* 참여자 이름 표시함 */}
            <div
              className={`text-xl font-black mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}
            >
              {item.user1Name ?? '알 수 없음'}{' '}
              <span
                className={`font-medium text-base ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
              >
                &amp;
              </span>{' '}
              {item.user2Name ?? '알 수 없음'}
            </div>

            {/* 매칭 점수 표시함 */}
            <div className="flex items-end gap-1 mt-4">
              <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-indigo-600 to-purple-600">
                {item.matchingScore.toFixed(1)}%
              </span>
              <span
                className={`text-sm font-bold mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
              >
                동조율
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default MyResultsList;
