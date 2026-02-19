'use client';

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { RefreshCw, Timer, AlertTriangle } from 'lucide-react';

interface QRGeneratorProps {
  value: string; // 백엔드 발급 페어링 코드 사용함
  timeLeft: number; // 남은 시간(초) 데이터 사용함
  onRefresh: () => void; // 재발급 요청 함수 사용함
  isDark?: boolean; // 테마별 스타일 분기 사용함
}

/**
 * [Feature] 카드 규격에 최적화된 콤팩트 QR 생성 컴포넌트 정의함
 */
export const QRGenerator: React.FC<QRGeneratorProps> = ({
  value,
  timeLeft,
  onRefresh,
  isDark = true,
}) => {
  // 60초 미만 시 위험 상태 판단 로직 수행함
  const isExpiringSoon = timeLeft < 60;

  return (
    <div
      className={`flex flex-col items-center gap-4 p-5 rounded-3xl border-2 border-dashed w-full max-w-[260px] mx-auto transition-all
      ${isDark ? 'bg-slate-900/40 border-slate-700/50' : 'bg-white border-slate-200 shadow-lg'}`}
    >
      {/* QR 영역: 점선 컨테이너 내부 배치를 위해 140px로 축소 수행함 */}
      <div className="p-3 bg-white rounded-2xl shadow-sm flex items-center justify-center border border-slate-100">
        <QRCodeSVG
          value={value}
          size={140}
          level="H"
          includeMargin={false}
          imageSettings={{
            src: '/logo-sm.png',
            x: undefined,
            y: undefined,
            height: 28,
            width: 28,
            excavate: true,
          }}
        />
      </div>

      {/* 정보 표시부: 컴포넌트 밀도를 높이기 위해 간격 재설정 수행함 */}
      <div className="flex flex-col items-center gap-1.5 w-full">
        <div
          className={`flex items-center gap-1.5 font-mono text-lg font-black tracking-tighter
          ${isExpiringSoon ? 'text-red-500 animate-pulse' : 'text-indigo-500'}`}
        >
          {isExpiringSoon ? <AlertTriangle size={16} /> : <Timer size={16} />}
          <span>
            {Math.floor(timeLeft / 60)}:
            {(timeLeft % 60).toString().padStart(2, '0')}
          </span>
        </div>

        <div className="text-center">
          <p
            className={`text-[11px] font-bold leading-tight ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
          >
            기기로 QR 코드를 스캔하세요
          </p>
          <p className="text-[9px] opacity-40 font-mono tracking-tight break-all mt-0.5 px-1 uppercase">
            {value.split('=')[1] || value}
          </p>
        </div>
      </div>

      {/* 액션 버튼: 콤팩트 규격에 맞춰 패딩 조정 수행함 */}
      <button
        onClick={onRefresh}
        className={`flex items-center gap-2 px-4 py-1.5 rounded-full font-bold text-[11px] transition-all active:scale-95
          ${isDark ? 'bg-indigo-600/90 hover:bg-indigo-500 text-white' : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-sm'}`}
      >
        <RefreshCw size={14} />새 코드 발급
      </button>

      {/* 보안 안내: 레이아웃 간섭을 최소화하도록 폰트 크기 하향 조정 수행함 */}
      <p className="text-[8px] opacity-30 uppercase tracking-tighter text-center leading-none">
        Pairing expires in 300s for security.
      </p>
    </div>
  );
};

// FSD Barrel File 규격 준수를 위해 기본 내보내기 포함함
export default QRGenerator;
