'use client';

import React, { useEffect, useRef } from 'react';
import { FlaskConical, ArrowRight } from 'lucide-react';
import { PageType } from '@/07-shared/types';

interface HomeProps {
  setCurrentPage: (page: PageType) => void;
  theme: 'light' | 'dark';
}

interface Point {
  x: number;
  y: number;
}

const Home: React.FC<HomeProps> = ({ setCurrentPage, theme }) => {
  const isDark = theme === 'dark';
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    let points: Point[] = [];
    const speed = 4;

    let currentY = 0;
    const sparkTargets: number[] = [];
    let nextSparkCountdown = Math.random() * 100 + 50;

    const resize = () => {
      if (canvas.parentElement) {
        canvas.width = canvas.parentElement.offsetWidth;
        canvas.height = canvas.parentElement.offsetHeight;
        currentY = canvas.height / 2;
        points = [];
      }
    };

    window.addEventListener('resize', resize);
    resize();

    const generateNextY = () => {
      const centerY = canvas.height / 2;

      if (sparkTargets.length > 0) {
        const target = centerY + sparkTargets[0];
        const diff = target - currentY;
        const jumpSpeed = 35;

        if (Math.abs(diff) <= jumpSpeed) {
          currentY = target;
          sparkTargets.shift();
        } else {
          currentY += Math.sign(diff) * jumpSpeed;
        }

        return currentY + (Math.random() - 0.5) * 6;
      }

      nextSparkCountdown--;
      if (nextSparkCountdown <= 0 && Math.random() > 0.2) {
        const numPeaks = Math.floor(Math.random() * 3) + 2;
        for (let i = 0; i < numPeaks; i++) {
          const sign = Math.random() > 0.5 ? 1 : -1;
          const height = Math.random() * 150 + 40;
          sparkTargets.push(sign * height);
        }
        sparkTargets.push(0);

        nextSparkCountdown = Math.random() * 150 + 50;
      }

      currentY = centerY + Math.sin(Date.now() * 0.003) * 2;
      return currentY;
    };

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < points.length; i++) {
        points[i].x += speed;
      }

      points = points.filter((p) => p.x <= canvas.width + 50);
      points.unshift({ x: 0, y: generateNextY() });

      if (points.length < 2) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      ctx.beginPath();
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'miter';
      ctx.lineCap = 'round';

      const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
      if (isDark) {
        grad.addColorStop(0, 'rgba(168, 85, 247, 0)');
        grad.addColorStop(0.2, 'rgba(216, 180, 254, 0.35)');
        grad.addColorStop(0.8, 'rgba(216, 180, 254, 0.35)');
        grad.addColorStop(1, 'rgba(168, 85, 247, 0)');
      } else {
        grad.addColorStop(0, 'rgba(139, 92, 246, 0)');
        grad.addColorStop(0.2, 'rgba(109, 40, 217, 0.2)');
        grad.addColorStop(0.8, 'rgba(109, 40, 217, 0.2)');
        grad.addColorStop(1, 'rgba(139, 92, 246, 0)');
      }
      ctx.strokeStyle = grad;

      ctx.shadowBlur = isDark ? 8 : 4;
      ctx.shadowColor = isDark
        ? 'rgba(216, 180, 254, 0.25)'
        : 'rgba(139, 92, 246, 0.15)';

      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isDark]);

  const handleNavigation = (page: PageType) => {
    window.scrollTo(0, 0);
    setCurrentPage(page);
  };

  return (
    <div className="relative pt-20 pb-32 px-6 overflow-hidden min-h-screen flex flex-col items-center">
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      </div>

      {/* 텍스트 및 버튼 콘텐츠 영역 */}
      <div className="relative z-10 max-w-7xl mx-auto flex flex-col items-center text-center">
        <div className="flex flex-col items-center gap-4 mb-10">
          <div
            className={`inline-flex items-center gap-3 px-6 py-2 rounded-full glass border cursor-default select-none ${
              isDark ? 'border-white/10' : 'border-indigo-100'
            }`}
          >
            <span
              className={`text-[10px] font-bold tracking-[0.2em] uppercase ${
                isDark ? 'text-indigo-400' : 'text-indigo-600'
              }`}
            >
              상명대학교 휴먼AI공학전공 팀 휴로(Heuro) 졸업 프로젝트
            </span>
          </div>
        </div>

        <div className="relative mb-12 select-none flex flex-col items-center">
          <h1 className="flex flex-col items-center cursor-default leading-[0.85]">
            <span
              className={`text-7xl md:text-[140px] font-black tracking-[-0.05em] ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              뇌파
            </span>
            <div className="h-4 md:h-6" />
            <span className="text-7xl md:text-[140px] font-black tracking-[-0.05em] text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-indigo-400 to-purple-500">
              시그널
            </span>
          </h1>
        </div>

        <div className="max-w-3xl space-y-10 mb-16">
          <h2
            className={`text-xl md:text-3xl font-black italic tracking-tight uppercase cursor-default select-none ${
              isDark ? 'text-indigo-400' : 'text-indigo-600'
            }`}
          >
            뇌파 동조화 기반 우정 테스트, 커플 궁합 테스트
          </h2>
          <div
            className={`space-y-4 font-bold text-base md:text-xl leading-relaxed cursor-default select-none ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}
          >
            <p>
              실시간 뇌파 동조화 분석을 통해 당신과 상대의 숨겨진 뇌파 매칭률을
              확인하세요!
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-6">
          <button
            onClick={() => handleNavigation('intro')}
            className={`group px-10 py-5 glass border rounded-3xl font-black text-lg flex items-center gap-3 cursor-pointer transition-all duration-300 ${
              isDark
                ? 'border-white/10 text-slate-300 hover:text-white hover:bg-white/10 hover:border-transparent'
                : 'border-indigo-100 text-slate-700 hover:bg-indigo-100 hover:border-transparent hover:shadow-lg shadow-indigo-500/5'
            }`}
          >
            프로젝트 소개{' '}
            <ArrowRight
              size={18}
              className="transition-transform group-hover:translate-x-2"
            />
          </button>

          <button
            onClick={() => handleNavigation('lab')}
            className="group relative px-14 py-6 bg-indigo-600 text-white rounded-3xl font-black text-xl overflow-hidden transition-all hover:bg-indigo-700 hover:scale-105 active:scale-95 shadow-[0_20px_50px_-10px_rgba(79,70,229,0.5)] cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <span className="relative z-10 flex items-center gap-4">
              <FlaskConical
                size={24}
                className="group-hover:rotate-12 transition-transform duration-300"
              />
              실험실 입장
            </span>
            <div className="absolute inset-0 border-2 border-white/20 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;
