import React from 'react';
import { Activity, Mail } from 'lucide-react';
import { PageType } from '@/07-shared/types';

interface FooterProps {
  theme: 'light' | 'dark';
  setCurrentPage: (page: PageType) => void;
}

const Footer: React.FC<FooterProps> = ({ theme, setCurrentPage }) => {
  const isDark = theme === 'dark';

  const handleNavClick = (pageId: PageType) => {
    setCurrentPage(pageId); // 페이지 변경
    window.scrollTo({ top: 0, behavior: 'smooth' }); // 스크롤을 맨 위로 부드럽게
  };

  const sitemaps: { name: string; id: PageType }[] = [
    { name: '홈', id: 'home' },
    { name: '프로젝트 소개', id: 'intro' },
    { name: '실험실', id: 'lab' },
    { name: '결과확인', id: 'results' },
    { name: '시즌 2', id: 'expand' },
  ];

  return (
    <footer
      className={`transition-colors duration-500 border-t pt-24 pb-12 mt-20 ${
        isDark ? 'bg-slate-950 border-white/5' : 'bg-white border-slate-200'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-12 mb-20">
          <div className="col-span-2 space-y-8">
            <div
              className="flex items-center gap-3 group"
              onClick={() => handleNavClick('home')}
            >
              <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center border border-white/5">
                <Activity className="text-indigo-500 w-6 h-6 drop-shadow-[0_0_5px_rgba(99,102,241,0.5)]" />
              </div>
              <span
                className={`cursor-default font-black text-2xl tracking-tighter uppercase transition-colors ${isDark ? 'text-white' : 'text-slate-900'}`}
              >
                뇌파 시그널
              </span>
            </div>
            <div className="space-y-4">
              <p
                className={`text-sm md:text-base max-w-lg leading-relaxed transition-colors ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
              >
                <span
                  className={`font-bold transition-colors ${isDark ? 'text-slate-200' : 'text-slate-900'}`}
                >
                  휴먼AI공학전공 팀 휴로(Heuro) 졸업 프로젝트에 참여해주셔서
                  감사합니다.
                </span>
                <br />본 프로젝트는 202110844 문경수 학생을 포함한 팀 휴로의
                책임 하에 운영되며, 참여자 여러분께 혁신적인 경험과 유의미한
                통찰을 제공하겠습니다.
              </p>
              <div className="flex items-center gap-2 text-[12px] font-bold text-slate-500">
                <Mail size={14} className="text-indigo-500" />
                <span>프로젝트 관련 문의 : mks002@icloud.com</span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h4
              className={`cursor-default text-xs font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
            >
              SITEMAP
            </h4>
            <ul
              className={`font-bold text-[14px] space-y-3 transition-colors ${isDark ? 'text-slate-400' : 'text-slate-600'} flex flex-col items-start`}
            >
              {sitemaps.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => handleNavClick(item.id)}
                    className="cursor-pointer hover:text-indigo-500 transition-colors"
                  >
                    {item.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-6">
            <h4
              className={`cursor-default text-xs font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
            >
              Policy
            </h4>
            <ul
              className={`font-bold text-[14px] space-y-3 transition-colors ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
            >
              <li className="hover:text-indigo-500 cursor-pointer transition-colors">
                개인정보처리방침
              </li>
              <li className="hover:text-indigo-500 cursor-pointer transition-colors">
                이용약관
              </li>
              <li className="hover:text-indigo-500 cursor-pointer transition-colors">
                데이터 보호 규정
              </li>
              <li className="hover:text-indigo-500 cursor-pointer transition-colors">
                연구 윤리 준수
              </li>
            </ul>
          </div>
        </div>

        <div
          className={`pt-10 border-t flex flex-col md:flex-row justify-between items-center gap-4 text-[11px] font-black tracking-[0.2em] uppercase transition-colors ${
            isDark
              ? 'border-white/5 text-slate-700'
              : 'border-slate-100 text-slate-400'
          }`}
        >
          <p>@ 2026 HEURO PROJECT. ALL RIGHTS RESERVED.</p>
          <div className="flex gap-6">
            <a
              href="https://www.smu.ac.kr"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-indigo-500 transition-colors"
            >
              상명대학교
            </a>
            <a
              href="https://hi.smu.ac.kr"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-indigo-500 transition-colors"
            >
              휴먼AI공학전공
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
