'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, AlertCircle, RefreshCw, X } from 'lucide-react';

interface QRScannerProps {
  onScanSuccess: (result: string) => void;
  onClose: () => void;
  isDark?: boolean;
}

/**
 * [Client] QR 코드를 스캔하여 세션에 참여하는 UI 컴포넌트.
 * Html5Qrcode 라이브러리 기반으로 카메라 접근 및 QR 인식 수행함.
 */
const QRScanner: React.FC<QRScannerProps> = ({
  onScanSuccess,
  onClose,
  isDark = true,
}) => {
  const [error, setError] = useState<string | null>(null);

  // Html5Qrcode 인스턴스 보관용 ref 사용함
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    // Strict Mode 이중 마운트 및 언마운트 후 콜백 실행 방지 플래그 사용함
    let cancelled = false;

    // DOM id 기반으로 Html5Qrcode 인스턴스 생성함
    const html5QrCode = new Html5Qrcode('qr-reader');
    html5QrCodeRef.current = html5QrCode;

    // start() Promise 보관하여 cleanup 경쟁 조건(race condition) 방지함
    // start()가 pending 중 언마운트 시 cleanup이 완료 후 자원 해제 수행함
    const startPromise = html5QrCode
      .start(
        { facingMode: 'environment' },
        { fps: 20, qrbox: { width: 220, height: 220 } },
        (decodedText: string) => {
          // 언마운트 이후 콜백 실행 방지 플래그 확인함
          if (!cancelled) onScanSuccess(decodedText);
        },
        (_error: string) => {
          // 미검출 프레임 에러는 정상 동작이므로 무시함
        }
      )
      .catch((err: unknown) => {
        if (cancelled) return;
        // 카메라 권한 거부 및 장치 미발견 에러 처리함
        if (err instanceof Error) {
          if (err.name === 'NotAllowedError') {
            setError(
              '카메라 접근 권한이 필요함. 브라우저 설정에서 허용해주세요.'
            );
          } else if (err.name === 'NotFoundError') {
            setError(
              '카메라 장치를 찾을 수 없음. 카메라 연결 상태를 확인해주세요.'
            );
          } else {
            setError(err.message);
          }
        } else {
          setError('알 수 없는 카메라 에러 발생함');
        }
      });

    // cleanup: start() 완료 후 순차적 자원 해제 수행함 (경쟁 조건 방지)
    return () => {
      cancelled = true;
      startPromise
        .then(() => {
          if (html5QrCode.isScanning) return html5QrCode.stop();
        })
        .then(() => html5QrCode.clear())
        .catch(() => {
          // stop 실패 시에도 clear 수행하여 DOM 정리함
          try {
            html5QrCode.clear();
          } catch {
            // clear 실패 시 무시함
          }
        });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
            {/* Html5Qrcode가 마운트할 DOM 컨테이너 사용함. id 필수 */}
            <div id="qr-reader" className="w-full h-full" />

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
