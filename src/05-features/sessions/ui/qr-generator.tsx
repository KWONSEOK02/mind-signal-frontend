// src/05-features/sessions/ui/qr-generator.tsx
'use client';

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { RefreshCw, Timer, AlertTriangle } from 'lucide-react';

interface QRGeneratorProps {
  value: string; // 백엔드에서 생성된 페어링 코드 사용
  timeLeft: number; // usePairing 훅에서 계산된 남은 시간(초) 사용
  onRefresh: () => void; // 코드 재발급 요청 함수 사용
  isDark?: boolean; // 테마 설정에 따른 스타일 분기 사용
}

/**
 * [Host] 기기 페어링을 위한 QR 코드 발급 UI 컴포넌트
 */
export const QRGenerator: React.FC<QRGeneratorProps> = ({
  value,
  timeLeft,
  onRefresh,
  isDark = true,
}) => {
  // 만료 시간 임계값(60초) 확인 로직 사용
  const isExpiringSoon = timeLeft < 60;

  return (
    <div
      className={`flex flex-col items-center gap-6 p-8 rounded-3xl border-2 border-dashed 
      ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-white border-slate-200 shadow-xl'}`}
    >
      {/* QR 코드 렌더링 영역함 */}
      <div className="p-4 bg-white rounded-2xl shadow-inner">
        <QRCodeSVG
          value={value}
          size={200}
          level="H"
          includeMargin={false}
          imageSettings={{
            src: '/logo.png', // 프로젝트 로고 삽입 가능함
            x: undefined,
            y: undefined,
            height: 40,
            width: 40,
            excavate: true,
          }}
        />
      </div>

      {/* 상태 정보 및 타이머 표시부 사용함 */}
      <div className="flex flex-col items-center gap-3">
        <div
          className={`flex items-center gap-2 font-mono text-2xl font-bold 
          ${isExpiringSoon ? 'text-red-500 animate-pulse' : 'text-indigo-500'}`}
        >
          {isExpiringSoon ? <AlertTriangle size={20} /> : <Timer size={20} />}
          <span>
            {Math.floor(timeLeft / 60)}:
            {(timeLeft % 60).toString().padStart(2, '0')}
          </span>
        </div>

        <div className="text-center space-y-1">
          <p
            className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}
          >
            모바일 기기에서 QR 코드를 스캔하세요
          </p>
          <p className="text-xs opacity-50 font-mono tracking-widest uppercase">
            Code: {value}
          </p>
        </div>
      </div>

      {/* 재발급 액션 버튼 정의함 */}
      <button
        onClick={onRefresh}
        className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-bold transition-all active:scale-95
          ${
            isDark
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
              : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg'
          }`}
      >
        <RefreshCw size={18} />새 코드 발급
      </button>

      {/* 5분 만료 안내 텍스트 포함함 */}
      <p className="text-[10px] opacity-40 uppercase tracking-tighter text-center">
        Security Note: Pairing sessions expire in 300s
        <br />
        for atomic device connection guarantee.
      </p>
    </div>
  );
};

export default QRGenerator;
