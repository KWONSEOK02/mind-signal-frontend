'use client';

import React, { useState } from 'react';

import {
  Users,
  GraduationCap,
  Heart,
  Sparkles,
  ChevronRight,
  Bell,
  CheckCircle2,
} from 'lucide-react';

interface ExpandProps {
  theme: 'light' | 'dark';
}

type TabType = 'study' | 'friend' | 'date';

const Expand: React.FC<ExpandProps> = ({ theme }) => {
  const [activeTab, setActiveTab] = useState<TabType>('study');

  const [email, setEmail] = useState('');

  const [isSubmitted, setIsSubmitted] = useState(false);

  const isDark = theme === 'dark';

  const studyGroups = [
    {
      title: '토익 900+ 뇌파 시너지팀',

      members: 4,

      match: 88,

      category: '어학',
    },

    { title: '코딩 테스트 협동 연구', members: 3, match: 92, category: 'IT' },

    { title: '공모전 영상 제작 크루', members: 5, match: 85, category: '예술' },
  ];

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();

    if (email) {
      setIsSubmitted(true);

      setTimeout(() => {
        setIsSubmitted(false);

        setEmail('');
      }, 5000);
    }
  };

  return (
    <div
      className={`max-w-7xl mx-auto px-6 py-32 space-y-16 ${
        isDark ? 'text-white' : 'text-slate-900'
      }`}
    >
      <div className="text-center space-y-4">
        <h2 className="text-5xl font-black tracking-tighter italic uppercase">
          To Be Continued
        </h2>

        <p className="text-xl text-slate-500 font-bold max-w-2xl mx-auto">
          2026년 2학기에 찾아뵙겠습니다.
        </p>
      </div>

      <div className="flex justify-center gap-4 flex-wrap">
        {[
          {
            id: 'study' as TabType,

            icon: <GraduationCap size={18} />,

            label: '팀플/공부',
          },

          {
            id: 'friend' as TabType,

            icon: <Users size={18} />,

            label: '친구 매칭',
          },

          { id: 'date' as TabType, icon: <Heart size={18} />, label: '소개팅' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);

              setIsSubmitted(false);
            }}
            // 라이트 모드일 때 테두리를 border-slate-300으로 살짝 더 어둡게 조정

            className={`px-8 py-4 rounded-2xl border font-black transition-all flex items-center gap-3 cursor-pointer ${
              activeTab === tab.id
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : isDark
                  ? 'bg-transparent text-slate-400 border-white/10 hover:border-white/20 hover:text-white'
                  : 'bg-white text-slate-500 border-slate-300 hover:border-slate-400 hover:text-slate-900'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {activeTab === 'study' ? (
          studyGroups.map((group, i) => (
            <div
              key={i}
              // 다크 모드일 때 Coming Soon 박스와 동일하게 bg-white/5, border-white/10 적용

              className={`p-8 rounded-[40px] border space-y-6 group transition-all cursor-pointer ${
                isDark
                  ? 'bg-white/5 border-white/10 hover:border-white/20'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex justify-between items-start">
                <span
                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${
                    isDark
                      ? 'bg-white/10 text-slate-300'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {group.category}
                </span>

                <div className="flex items-center gap-1 text-emerald-500 font-black text-xs">
                  <Sparkles size={14} /> Match {group.match}%
                </div>
              </div>

              <h3 className="text-2xl font-black italic leading-tight group-hover:text-indigo-500">
                {group.title}
              </h3>

              <div
                className={`flex items-center justify-between pt-6 border-t ${
                  isDark ? 'border-white/10' : 'border-slate-100'
                }`}
              >
                <span className="text-sm font-bold text-slate-500">
                  {group.members}명 참여 중
                </span>

                <button className="p-2 bg-indigo-600 rounded-xl text-white group-hover:translate-x-1 transition-all">
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div
            className={`col-span-3 py-24 text-center space-y-10 rounded-[50px] border relative overflow-hidden ${
              isDark
                ? 'bg-white/5 border-white/10'
                : 'bg-white border-slate-200'
            }`}
          >
            <h3 className="text-3xl font-black italic uppercase">
              Coming Soon
            </h3>

            {!isSubmitted ? (
              <form
                onSubmit={handleSubscribe}
                className="max-w-md mx-auto px-6"
              >
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    // 라이트 모드일 때 이메일 입력창 라인이 잘 보이도록 border-slate-300 추가

                    className={`flex-1 border rounded-2xl px-4 py-4 text-sm outline-none transition-all ${
                      isDark
                        ? 'bg-transparent border-white/10 focus:border-white/30 text-white'
                        : 'bg-transparent border-slate-300 focus:border-slate-400 text-slate-900 placeholder:text-slate-400'
                    }`}
                  />

                  <button
                    type="submit"
                    className="bg-indigo-600 text-white cursor-pointer px-8 py-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 hover:bg-indigo-700"
                  >
                    <Bell size={16} /> 신청
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-emerald-500 font-black flex flex-col items-center gap-2">
                <CheckCircle2 /> 신청 완료!
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Expand;
