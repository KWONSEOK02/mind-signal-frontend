import React from 'react';
import {
  Sun,
  Moon,
  User,
  LogIn,
  Menu,
  Calendar,
  Activity,
  LogOut,
} from 'lucide-react';
import { PageType } from '@/07-shared/types';

interface NavbarProps {
  currentPage: PageType;
  setCurrentPage: (page: PageType) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  isLoggedIn: boolean;
  setIsLoggedIn: (val: boolean) => void;
  userName?: string; // 추가: 백엔드에서 받은 사용자 이름
  openAuthModal: () => void;
}

const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  setCurrentPage,
  theme,
  toggleTheme,
  isLoggedIn,
  setIsLoggedIn,
  userName, // 추가
  openAuthModal,
}) => {

  // 페이지 이동과 동시에 스크롤을 맨 위로 올리는 함수 추가
  const handleNavClick = (pageId: PageType) => {
    setCurrentPage(pageId);
    window.scrollTo(0, 0); // 즉시 맨 위로 이동
  };

  const navItems: { name: string; id: PageType }[] = [
    { name: '홈', id: 'home' },
    { name: '소개', id: 'intro' },
    { name: '실험실', id: 'lab' },
    { name: '결과확인', id: 'results' },
    { name: '시즌 2', id: 'expand' },
  ];

  const GOOGLE_FORM_URL = 'https://forms.gle/g1vY9QuH1QjBzNmm9';

  // 로그아웃 핸들러
  const handleLogout = () => {
    localStorage.removeItem('token'); // 토큰 삭제
    setIsLoggedIn(false);
    setCurrentPage('home');
    window.location.reload(); // 세션 초기화를 위해 새로고침 추천
  };

  return (
    //네브바 불투명하게 변경
    <nav className={`fixed top-0 left-0 right-0 z-50 border-b py-4 transition-all duration-300 backdrop-blur-md ${
      theme === 'dark' 
        ? 'bg-slate-950/70 border-white/10' // 다크모드: 70% 불투명도 + 블러
        : 'bg-white/70 border-slate-200/50' // 라이트모드: 70% 불투명도 + 블러
    }`}>
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
        <div
          className="flex items-center gap-4 cursor-pointer group"
          onClick={() => handleNavClick('home')}
        >
          <div className="w-12 h-12 bg-slate-900 rounded-[14px] flex items-center justify-center shadow-inner relative overflow-hidden border border-white/5">
            <div className="absolute inset-0 bg-indigo-500/5 blur-xl"></div>
            <Activity
              size={24}
              className="text-indigo-500 relative z-10 drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]"
            />
          </div>
          <span
            className={`font-black text-2xl tracking-tighter transition-colors ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}
          >
            뇌파 시그널
          </span>
        </div>

        <div className="hidden md:flex items-center gap-6">
          {/* 메뉴 아이템 클릭 부분 수정 */}
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)} // 함수 호출로 변경
              className={`cursor-pointer text-sm font-bold transition-all hover:text-indigo-500 ${
                currentPage === item.id
                  ? 'text-indigo-500'
                  : theme === 'dark'
                    ? 'text-slate-400'
                    : 'text-slate-600'
              }`}
            >
              {item.name}
            </button>
          ))}

          <div className="flex items-center gap-3 ml-2 pl-4 border-l border-white/10">
            <button
              onClick={toggleTheme}
              className="cursor-pointer p-2 rounded-full hover:bg-white/5 transition-colors mr-1"
            >
              {theme === 'dark' ? (
                <Sun size={18} className="text-yellow-400" />
              ) : (
                <Moon size={18} className="text-slate-600" />
              )}
            </button>

            <div className="flex items-center">
              {!isLoggedIn ? (
                <button
                  onClick={openAuthModal}
                  className={`cursor-pointer select-none flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all border ${
      theme === 'dark'
        ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
        : 'bg-slate-100 border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
    }`}
  >
                  <LogIn size={14} />
                  로그인
                </button>
              ) : (
                <button
                  onClick={handleLogout} // 로그아웃 기능으로 변경
                  className="cursor-pointer group flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black bg-white/5 border border-white/10 text-indigo-400 hover:text-rose-400 transition-all"
                  title="로그아웃 하시겠습니까?"
                >
                  <User size={14} className="group-hover:hidden" />
                  <LogOut size={14} className="hidden group-hover:block" />
                  <span className="group-hover:hidden">
                    {userName || '사용자'}님
                  </span>
                  <span className="hidden group-hover:block">로그아웃</span>
                </button>
              )}
            </div>

            <a
              href={GOOGLE_FORM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 active:scale-95"
            >
              <Calendar size={14} />
              예약하기
            </a>
          </div>
        </div>

        <button className="md:hidden p-2 text-slate-500">
          <Menu size={24} />
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
