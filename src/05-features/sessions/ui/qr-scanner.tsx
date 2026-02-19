'use client';

import React, { useState } from 'react';
import BarcodeScanner from 'react-qr-barcode-scanner';
import { Camera, AlertCircle, RefreshCw, X } from 'lucide-react';

interface QRScannerProps {
  onScanSuccess: (result: string) => void;
  onClose: () => void;
  isDark?: boolean;
}

/**
 * [Client] QR 코드를 스캔하여 세션에 참여하는 UI 컴포넌트
 */
const QRScanner: React.FC<QRScannerProps> = ({
  onScanSuccess,
  onClose,
  isDark = true,
}) => {
  const [error, setError] = useState<string | null>(null);

  /**
   * 스캔 결과 처리 함수 사용함
   * 라이브러리의 (arg0: unknown, arg1?: Result) 시그니처와 강제 일치시킴
   */
  const handleUpdate = (
    err: unknown,
    result?: { getText: () => string } | null
  ) => {
    // 1. 스캔 성공 시 결과 전달 로직 수행함
    if (result && typeof result.getText === 'function') {
      onScanSuccess(result.getText());
      return;
    }

    // 2. 에러 발생 시 처리 로직 수행함
    if (err) {
      if (err instanceof Error) {
        // 단순 미검출 에러는 무시하여 스캔을 지속함
        // 라이브러리 특성상 코드가 인식되지 않으면 매 프레임 해당 에러를 반환함
        if (err.message.includes('No MultiFormat Readers')) {
          return;
        }

        // 카메라 권한 미승인 등 실제 장애 상황만 에러로 처리함
        if (err.name === 'NotAllowedError' || err.name === 'NotFoundError') {
          setError('카메라 접근 권한이 필요하거나 장치를 찾을 수 없음');
        } else {
          setError(err.message);
        }
      } else if (
        typeof err === 'string' &&
        !err.includes('No MultiFormat Readers')
      ) {
        setError('알 수 없는 카메라 에러 발생함');
      }
    }
  };

  return (
    <div
      className={`relative flex flex-col items-center gap-6 p-6 rounded-3xl border-2 
      ${isDark ? 'bg-slate-900 border-indigo-500/30' : 'bg-white border-slate-200 shadow-2xl'}`}
    >
      {/* 상단 헤더 영역 정의함 */}
      <div className="w-full flex justify-between items-center mb-2">
        <div className="flex items-center gap-2 text-indigo-500 font-bold">
          <Camera size={20} />
          <span>QR 스캔</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-500/10 rounded-full transition-colors"
          aria-label="Close scanner"
        >
          <X
            size={24}
            className={isDark ? 'text-slate-400' : 'text-slate-600'}
          />
        </button>
      </div>

      {/* 스캐너 뷰포트 구성함 */}
      <div className="relative w-full max-w-[300px] aspect-square rounded-2xl overflow-hidden bg-black shadow-2xl border-4 border-indigo-600">
        {!error ? (
          <>
            <BarcodeScanner
              width="100%"
              height="100%"
              onUpdate={handleUpdate}
            />
            {/* 스캔 진행 상태 시각화 애니메이션 사용함 */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/2 left-0 w-full h-0.5 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.8)] animate-scan-line" />
              <div className="absolute inset-0 border-[30px] border-black/40" />
              <div className="absolute inset-[30px] border-2 border-indigo-500/50 rounded-lg" />
            </div>
          </>
        ) : (
          /* 에러 상황 피드백 섹션 정의함 */
          <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center">
            <AlertCircle size={48} className="text-red-500" />
            <p className="text-white text-sm font-medium">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 text-xs text-indigo-400 underline"
            >
              <RefreshCw size={14} /> 페이지 새로고침
            </button>
          </div>
        )}
      </div>

      {/* 하단 가이드 텍스트 구성함 */}
      <div className="text-center space-y-2">
        <p
          className={`text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}
        >
          호스트 화면의 QR 코드를 사각형 안에 맞춰주세요
        </p>
      </div>
    </div>
  );
};

export default QRScanner;
