'use client';

import React, { useEffect, useRef } from 'react';
import Image from 'next/image';
import { FlaskConical, ArrowRight, Activity } from 'lucide-react';
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

      currentY = centerY;
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
    <div className="relative pt-8 lg:pt-24 pb-20 lg:pb-32 px-6 overflow-hidden min-h-[calc(100vh-80px)] flex flex-col items-center justify-start lg:justify-center">
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full opacity-60"
        />
      </div>

      <div className="relative z-10 w-full max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-y-4 lg:gap-y-0">
        <div className="order-1 lg:col-start-1 lg:row-start-1 flex flex-col items-center lg:items-start lg:pl-[100px] xl:pl-[150px] mb-4 lg:mb-12 w-full text-center lg:text-left">
          <div
            className={`inline-flex items-center gap-3 px-6 py-3 rounded-full glass border cursor-default select-none ${
              isDark
                ? 'border-white/10 bg-white/5'
                : 'border-indigo-100 bg-indigo-50/50'
            }`}
          >
            <span
              className={`text-[10px] sm:text-xs font-bold tracking-[0.1em] leading-relaxed uppercase text-center lg:text-left ${
                isDark ? 'text-slate-300' : 'text-slate-600'
              }`}
            >
              상명대학교 휴먼AI공학전공
              <br />
              <span className={isDark ? 'text-indigo-400' : 'text-indigo-600'}>
                TEAM_HEURO
              </span>{' '}
              졸업 프로젝트
            </span>
          </div>
        </div>

        <div className="order-2 lg:col-start-1 lg:row-start-2 relative select-none flex flex-col items-center lg:items-start lg:pl-[100px] xl:pl-[150px] mb-4 lg:mb-6 w-full">
          <h1 className="flex flex-col items-center lg:items-start cursor-default leading-[1.1] text-center lg:text-left">
            <span
              className={`text-6xl sm:text-8xl lg:text-[80px] xl:text-[100px] font-black tracking-[-0.05em] ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              뇌파
            </span>
            <span className="text-6xl sm:text-8xl lg:text-[80px] xl:text-[100px] font-black tracking-[-0.05em] text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-400 to-purple-600 pb-3">
              시그널
            </span>
          </h1>
        </div>

        <div className="order-3 lg:col-start-1 lg:row-start-3 space-y-4 lg:pl-[100px] xl:pl-[150px] mb-6 lg:mb-8 w-full flex flex-col items-center lg:items-start text-center lg:text-left">
          <h2
            className={`text-lg sm:text-2xl font-black italic tracking-tight uppercase cursor-default select-none ${
              isDark ? 'text-indigo-400' : 'text-indigo-600'
            }`}
          >
            뇌파 동조화 기반 우정 및 커플 궁합 테스트
          </h2>
          <p
            className={`font-medium text-sm sm:text-base md:text-lg leading-relaxed cursor-default select-none ${
              isDark ? 'text-slate-300' : 'text-slate-600'
            }`}
          >
            실시간 뇌파 동조화 분석을 통해
            <br className="hidden sm:block" />
            당신과 상대의 숨겨진 뇌파 매칭률을 확인하세요!
          </p>
        </div>

        <div className="order-4 lg:col-start-2 lg:row-start-1 lg:row-span-4 self-center relative w-full flex justify-center lg:justify-end z-10 pointer-events-none mb-10 lg:mb-0">
          <Image
            src="/Images/home_img.png"
            alt="뇌파 시그널 메인 이미지"
            width={800}
            height={800}
            priority
            className="w-full max-w-[70%] sm:max-w-sm lg:max-w-[90%] xl:max-w-full h-auto object-contain"
          />
        </div>

        <div className="order-5 lg:col-start-1 lg:row-start-4 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 sm:gap-6 lg:pl-[100px] xl:pl-[150px] w-full sm:w-auto">
          <button
            onClick={() => handleNavigation('intro')}
            className={`group w-full sm:w-auto px-8 py-4 glass border rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 ${
              isDark
                ? 'border-white/10 text-slate-300 hover:text-white hover:bg-white/10 hover:border-transparent'
                : 'border-indigo-100 text-slate-700 hover:bg-indigo-100 hover:border-transparent hover:shadow-lg shadow-indigo-500/5'
            }`}
          >
            프로젝트 소개
            <ArrowRight
              size={16}
              className="transition-transform group-hover:translate-x-1"
            />
          </button>

          <button
            data-testid="home-cta-lab"
            onClick={() => handleNavigation('lab')}
            className="group relative w-full sm:w-auto px-10 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-sm sm:text-base overflow-hidden transition-all hover:bg-indigo-700 hover:scale-105 active:scale-95 shadow-[0_10px_30px_-10px_rgba(79,70,229,0.5)] cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <span className="relative z-10 flex items-center justify-center gap-3">
              <Activity size={18} />
              실험실 입장
              <FlaskConical
                size={18}
                className="group-hover:rotate-12 transition-transform duration-300"
              />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;
