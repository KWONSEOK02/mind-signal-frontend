import React from 'react';
import { Calendar, ExternalLink } from 'lucide-react';

interface ReservationProps {
  theme: 'light' | 'dark';
}

const Reservation: React.FC<ReservationProps> = ({ theme }) => {
  const GOOGLE_FORM_URL = 'https://forms.gle/g1vY9QuH1QjBzNmm9';

  const handleReservation = () => {
    window.open(GOOGLE_FORM_URL, '_blank');
  };

  return (
    <div className="max-w-5xl mx-auto px-6">
      <div
        className={`glass p-10 md:p-16 rounded-[40px] relative overflow-hidden group cursor-pointer border transition-all duration-500 shadow-xl ${
          theme === 'dark'
            ? 'border-white/5 hover:border-indigo-500/30'
            : 'border-white hover:border-indigo-300'
        }`}
        onClick={handleReservation}
      >
        {/* Animated background glow */}
        <div
          className={`absolute inset-0 transition-opacity duration-700 opacity-0 group-hover:opacity-100 ${
            theme === 'dark'
              ? 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10'
              : 'bg-gradient-to-r from-indigo-50/20 to-purple-50/20'
          }`}
        ></div>

        <div
          className={`absolute top-0 right-0 p-10 pointer-events-none group-hover:scale-110 transition-all duration-700 ${
            theme === 'dark'
              ? 'opacity-[0.03] text-white'
              : 'opacity-[0.05] text-indigo-900'
          }`}
        >
          <Calendar size={320} className="fill-current" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10 text-center md:text-left">
          <div className="space-y-6">
            <div
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-bold tracking-widest uppercase transition-colors ${
                theme === 'dark'
                  ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                  : 'bg-indigo-50 border-indigo-100 text-indigo-600'
              }`}
            >
              Schedule your session
            </div>
            <h2
              className={`text-4xl md:text-5xl font-black leading-tight transition-colors ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}
            >
              지금 바로 <br />
              <span className="text-indigo-500">실험 참여를 예약</span>하세요
            </h2>
            <p
              className={`text-lg max-w-md font-medium leading-relaxed transition-colors ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}
            >
              당신의 뇌파 데이터를 통해 우정과 사랑의 깊이를 확인해보세요. 구글
              폼을 통해 간편하게 예약하실 수 있습니다.
            </p>
          </div>

          <div className="flex-shrink-0">
            <button
              onClick={handleReservation}
              className={`font-black px-10 py-6 rounded-2xl shadow-xl transition-all transform hover:-translate-y-1 active:scale-95 flex items-center gap-4 text-xl ${
                theme === 'dark'
                  ? 'bg-indigo-600 text-white shadow-indigo-900/40 hover:bg-indigo-500'
                  : 'bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700'
              }`}
            >
              <span>예약 폼 작성하기</span>
              <ExternalLink size={24} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reservation;
