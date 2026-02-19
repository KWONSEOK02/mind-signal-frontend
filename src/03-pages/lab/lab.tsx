'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Info, ArrowRight, Link, Activity } from 'lucide-react';
import { usePairing, QRGenerator, QRScanner } from '@/05-features/sessions';

interface LabProps {
  theme: 'light' | 'dark';
}

interface DataItem {
  name: string;
  val: number;
}

interface MetricItem {
  label: string;
  value: number;
}

interface BrainRawData {
  waves: Record<string, number>;
  metrics: Record<string, number>;
}

/**
 * 실험실(Lab) 페이지 컴포넌트
 */
const Lab: React.FC<LabProps> = ({ theme }) => {
  const { status, pairingCode, timeLeft, startPairing, requestPairing } =
    usePairing();

  const [waveData, setWaveData] = useState<DataItem[]>([]);
  const [psychMetrics, setPsychMetrics] = useState<MetricItem[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [baselineStep, setBaselineStep] = useState<
    'none' | 'eyes-open' | 'eyes-closed' | 'done'
  >('none');

  const isDark = theme === 'dark';

  /**
   * 뇌파 데이터 변환 및 상태 업데이트 함수 사용함
   */
  const updateBrainData = useCallback((rawData: BrainRawData) => {
    const waves = Object.entries(rawData.waves).map(([name, val]) => ({
      name: name.toUpperCase(),
      val: val,
    }));
    setWaveData(waves);

    const metrics = Object.entries(rawData.metrics).map(([label, value]) => ({
      label: label.toUpperCase(),
      value: value * 100,
    }));
    setPsychMetrics(metrics);
  }, []);

  /**
   * 페어링 완료 시 시뮬레이션 데이터 업데이트함
   * 린트 에러 방지를 위해 비동기 프레임(setTimeout)에서 실행하여 카스케이딩 렌더링 차단함
   */
  useEffect(() => {
    if (status === 'PAIRED') {
      const initialData: BrainRawData = {
        waves: {
          delta: 13.9,
          theta: 15.8,
          alpha: 4.7,
          beta: 274.7,
          gamma: 134.0,
        },
        metrics: {
          focus: 0.71,
          engagement: 0.4,
          interest: 0.31,
          excitement: 0.48,
          stress: 0.27,
          relaxation: 0.31,
        },
      };

      const timeoutId = setTimeout(() => {
        updateBrainData(initialData);
      }, 0);

      return () => clearTimeout(timeoutId);
    }
  }, [status, updateBrainData]);

  /**
   * Web Audio API 활용 비프음 재생 함수 사용함
   * Window 인터페이스 확장을 통해 any 타입 제거함
   */
  const playBeep = useCallback((freq = 600, duration = 0.05, count = 1) => {
    try {
      const AudioContextClass = (window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext) as typeof AudioContext;
      const audioCtx = new AudioContextClass();

      const playSingle = (startTime: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.1, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      for (let i = 0; i < count; i++) {
        playSingle(audioCtx.currentTime + i * 0.15);
      }
    } catch (e) {
      console.error('Audio playback failed:', e);
    }
  }, []);

  if (status !== 'PAIRED') {
    return (
      <div
        className={`flex flex-col items-center justify-center min-h-[80vh] p-6 ${isDark ? 'text-white' : 'text-slate-900'}`}
      >
        <div className="max-w-4xl w-full grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-bold tracking-widest uppercase">
              Step 01. Device Connection
            </div>
            <h1 className="text-5xl font-black italic tracking-tighter leading-none uppercase">
              Connect Your <br />
              <span className="text-indigo-500">Mind Signal</span>
            </h1>
            <p
              className={`text-lg leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
            >
              뇌파 측정을 시작하려면 전용 기기와의 페어링이 필요합니다. <br />
              QR 코드를 스캔하면 실험에 참여하실 수 있습니다.
            </p>
          </div>

          <div className="flex flex-col items-center justify-center">
            {status === 'IDLE' || status === 'ERROR' || status === 'EXPIRED' ? (
              <button
                onClick={startPairing}
                className="group relative px-12 py-6 bg-indigo-600 rounded-3xl font-black text-2xl italic tracking-tighter hover:bg-indigo-500 transition-all active:scale-95 shadow-2xl shadow-indigo-500/20"
              >
                <div className="flex items-center gap-4">
                  <Link size={32} />
                  GENERATE QR CODE
                </div>
              </button>
            ) : status === 'CREATED' ? (
              <QRGenerator
                value={pairingCode || ''}
                timeLeft={timeLeft}
                onRefresh={startPairing}
                isDark={isDark}
              />
            ) : (
              <div className="animate-pulse text-indigo-500 font-black italic tracking-widest">
                CONNECTING...
              </div>
            )}

            <button
              onClick={() => setShowScanner(true)}
              className="mt-8 text-sm opacity-50 hover:opacity-100 underline underline-offset-4"
            >
              이미 기기를 가지고 계신가요? 스캔하기
            </button>
          </div>
        </div>

        {showScanner && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <QRScanner
              onScanSuccess={(code) => {
                requestPairing(code);
                setShowScanner(false);
              }}
              onClose={() => setShowScanner(false)}
              isDark={isDark}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`p-8 ${isDark ? 'bg-slate-950 text-white' : 'bg-white text-slate-900'}`}
    >
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="flex justify-between items-end">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-500 font-bold italic">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              LIVE DATA STREAMING
            </div>
            <h2
              className={`text-4xl font-black italic tracking-tighter uppercase ${isDark ? 'text-white' : 'text-slate-900'}`}
            >
              EEG Real-time Monitor
            </h2>
          </div>
        </div>

        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {psychMetrics.map((item) => (
            <div
              key={item.label}
              className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
            >
              <div className="text-xs font-bold text-indigo-400 mb-1">
                {item.label}
              </div>
              <div className="text-2xl font-black italic">
                {item.value.toFixed(1)}%
              </div>
              <div className="w-full bg-slate-700 h-1 mt-2 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-500 h-full transition-all duration-500"
                  style={{ width: `${item.value}%` }}
                />
              </div>
            </div>
          ))}
        </section>

        <div className="grid lg:grid-cols-3 gap-8">
          <div
            className={`lg:col-span-2 p-8 rounded-3xl border ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
          >
            <div className="flex items-center gap-2 mb-6 text-indigo-500 font-bold italic text-sm">
              <Activity size={18} /> POWER BAND DISTRIBUTION
            </div>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={waveData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isDark ? '#334155' : '#e2e8f0'}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: isDark ? '#94a3b8' : '#64748b',
                      fontSize: 12,
                      fontWeight: 'bold',
                    }}
                  />
                  <Tooltip
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{
                      borderRadius: '12px',
                      border: 'none',
                      backgroundColor: '#1e293b',
                      color: '#fff',
                    }}
                  />
                  <Bar dataKey="val" radius={[6, 6, 0, 0]} barSize={40}>
                    {waveData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          [
                            '#6366f1',
                            '#818cf8',
                            '#4f46e5',
                            '#4338ca',
                            '#3730a3',
                          ][index % 5]
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-6">
            <div
              className={`p-8 rounded-3xl border h-full flex flex-col justify-center items-center text-center ${isDark ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100'}`}
            >
              {baselineStep === 'none' ? (
                <div className="space-y-6">
                  <div className="w-20 h-20 rounded-full bg-indigo-500/20 flex items-center justify-center mx-auto text-indigo-500">
                    <Info size={32} />
                  </div>
                  <h3 className="text-xl font-black italic uppercase tracking-tight">
                    Calibration Needed
                  </h3>
                  <button
                    onClick={() => {
                      setBaselineStep('eyes-open');
                      playBeep(800, 0.1, 2);
                    }}
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-500 transition-all"
                  >
                    START BASELINE <ArrowRight size={20} />
                  </button>
                </div>
              ) : (
                <div className="animate-pulse text-indigo-500 font-bold italic tracking-widest">
                  COLLECTING BASELINE...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Lab;
