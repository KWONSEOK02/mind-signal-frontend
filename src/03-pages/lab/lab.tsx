'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Eye, EyeOff, Move, Zap, Info, ArrowRight } from 'lucide-react';

interface LabProps {
  theme: 'light' | 'dark';
}

interface EEGChannel {
  name: string;
  val: number;
}

const Lab: React.FC<LabProps> = ({ theme }) => {
  const [eegData, setEegData] = useState<EEGChannel[]>([]);
  const [baselineStep, setBaselineStep] = useState<
    'none' | 'eyes-open' | 'eyes-closed' | 'done'
  >('none');
  const [timer, setTimer] = useState(15);
  const [headPos, setHeadPos] = useState({ x: 0, y: 0, z: 0 });
  const prevStepRef = useRef(baselineStep);
  const isDark = theme === 'dark';

  const playBeep = useCallback((freq = 600, duration = 0.05, count = 1) => {
    try {
      const AudioContextClass = (window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext) as typeof AudioContext;
      const audioCtx = new AudioContextClass();

      const playSingle = (startTime: number, f: number, d: number) => {
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(f, startTime);
        gainNode.gain.setValueAtTime(0.1, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + d);
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start(startTime);
        oscillator.stop(startTime + d);
      };

      for (let i = 0; i < count; i++) {
        playSingle(audioCtx.currentTime + i * 0.15, freq, duration);
      }
    } catch (e) {
      console.warn('Audio playback failed', e);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const newData = [
        { name: 'AF3', val: 40 + Math.random() * 40 },
        { name: 'T7', val: 30 + Math.random() * 50 },
        { name: 'Pz', val: 50 + Math.random() * 30 },
        { name: 'T8', val: 20 + Math.random() * 60 },
        { name: 'AF4', val: 45 + Math.random() * 35 },
      ];
      setEegData(newData);
      setHeadPos({
        x: Math.sin(Date.now() / 800) * 15,
        y: Math.cos(Date.now() / 1200) * 10,
        z: Math.sin(Date.now() / 2000) * 25,
      });
    }, 80);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let t: ReturnType<typeof setInterval>;
    if (baselineStep === 'eyes-open' || baselineStep === 'eyes-closed') {
      t = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            if (baselineStep === 'eyes-open') {
              setBaselineStep('eyes-closed');
              return 15;
            } else {
              setBaselineStep('done');
              return 0;
            }
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (t) clearInterval(t);
    };
  }, [baselineStep]);

  useEffect(() => {
    if (prevStepRef.current !== baselineStep) {
      if (baselineStep === 'eyes-closed') {
        playBeep(880, 0.4, 2);
      } else if (baselineStep === 'done') {
        playBeep(1000, 0.5, 3);
      }
      prevStepRef.current = baselineStep;
    }
  }, [baselineStep, playBeep]);

  useEffect(() => {
    if (
      (baselineStep === 'eyes-open' || baselineStep === 'eyes-closed') &&
      timer > 0
    ) {
      playBeep(600, 0.05);
    }
  }, [timer, baselineStep, playBeep]);

  const startBaseline = () => {
    setBaselineStep('eyes-open');
    setTimer(15);
    playBeep(800, 0.2);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-32 space-y-12">
      <div className="flex flex-col md:flex-row justify-between items-start gap-8">
        <div className="space-y-4">
          <h2
            className={`text-4xl font-black italic uppercase tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}
          >
            Laboratory
          </h2>
          <div className="flex items-center gap-2 text-slate-500 font-bold">
            <Info size={18} className="text-indigo-500" />
            <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>
              Emotiv Cortex API 실시간 뇌파 데모
            </p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-12 gap-8">
        <div
          className={`md:col-span-8 glass p-10 rounded-[40px] border space-y-8 relative overflow-hidden group ${isDark ? 'border-white/5' : 'border-indigo-100'}`}
        >
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={eegData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke={isDark ? '#1e293b' : '#e2e8f0'}
                  opacity={0.3}
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontWeight: 'bold', fontSize: 12 }}
                />
                <YAxis hide domain={[0, 100]} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  contentStyle={{ borderRadius: '16px' }}
                />
                <Bar dataKey="val" radius={[12, 12, 0, 0]}>
                  {eegData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index % 2 === 0 ? '#6366f1' : '#a855f7'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div
          className={`md:col-span-4 glass p-10 rounded-[40px] border flex flex-col justify-between overflow-hidden relative shadow-2xl ${isDark ? 'border-white/5' : 'border-indigo-100'}`}
        >
          <h3
            className={`text-2xl font-black flex items-center gap-3 uppercase italic tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}
          >
            <Move className="text-purple-500" size={24} /> Head Track
          </h3>
          <div className="relative flex-1 flex items-center justify-center my-10">
            <div
              className={`relative w-40 h-40 rounded-3xl border-2 transition-transform duration-150 ease-out ${isDark ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-indigo-50 border-indigo-200'}`}
              style={{
                transform: `perspective(1000px) rotateX(${headPos.y}deg) rotateY(${headPos.z}deg) rotateZ(${headPos.x}deg)`,
              }}
            />
          </div>
        </div>

        <div
          className={`md:col-span-12 glass p-12 rounded-[50px] border bg-gradient-to-br relative overflow-hidden group ${isDark ? 'border-white/5 from-indigo-600/10 to-transparent' : 'border-indigo-100 from-indigo-50 to-white'}`}
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-12 relative z-10">
            <div className="space-y-6 max-w-2xl text-center md:text-left">
              <h3
                className={`text-4xl font-black italic uppercase tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}
              >
                Baseline Recording
              </h3>
              <p
                className={`text-lg font-bold leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
              >
                정밀한 분석을 위해 당신의 고유한 뇌파 상태를 정의합니다.
              </p>
            </div>

            <div
              className={`flex flex-col items-center gap-8 p-12 rounded-[40px] border min-w-[300px] shadow-2xl ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-indigo-100'}`}
            >
              {baselineStep === 'none' && (
                <button
                  onClick={startBaseline}
                  className="group px-14 py-6 bg-indigo-600 text-white rounded-3xl font-black text-2xl hover:scale-105 transition-all flex items-center gap-3"
                >
                  START <ArrowRight />
                </button>
              )}
              {(baselineStep === 'eyes-open' ||
                baselineStep === 'eyes-closed') && (
                <div className="flex flex-col items-center gap-6">
                  <div className="w-32 h-32 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin flex items-center justify-center relative">
                    <span
                      className={`text-5xl font-black absolute flex items-center justify-center ${isDark ? 'text-white' : 'text-slate-900'}`}
                    >
                      {timer}
                    </span>
                  </div>
                  <div className="font-black uppercase text-2xl text-indigo-400 italic">
                    {baselineStep === 'eyes-open' ? (
                      <>
                        <Eye size={28} /> EYES OPEN
                      </>
                    ) : (
                      <>
                        <EyeOff size={28} /> EYES CLOSED
                      </>
                    )}
                  </div>
                </div>
              )}
              {baselineStep === 'done' && (
                <div className="flex flex-col items-center gap-6">
                  <div className="w-24 h-24 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-500">
                    <Zap size={40} />
                  </div>
                  <span className="text-2xl font-black text-emerald-500 uppercase italic tracking-tighter">
                    Recording Complete
                  </span>
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
