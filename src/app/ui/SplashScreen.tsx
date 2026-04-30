'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnimating(true);
    }, 2000);

    const removeTimer = setTimeout(() => {
      setIsVisible(false);
    }, 4000);

    return () => {
      clearTimeout(timer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
          .heart-splash {
            mask-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTEyIDIxLjM1bC0xLjQ1LTEuMzJDNS40IDE1LjM2IDIgMTIuMjggMiA4LjUgMiA1LjQyIDQuNDIgMyA3LjUgM2MxLjc0IDAgMy40MS44MSA0LjUgMi4wOUMxMy4wOSAzLjgxIDE0Ljc2IDMgMTYuNSAzIDE5LjU4IDMgMjIgNS40MiAyMiA4LjVjMCAzLjc4LTMuNCA2Ljg2LTguNTUgMTEuNTRTMTIgMjEuMzV6Ii8+PC9zdmc+');
            mask-position: center;
            mask-repeat: no-repeat;
            mask-size: 1500%;
            -webkit-mask-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTEyIDIxLjM1bC0xLjQ1LTEuMzJDNS40IDE1LjM2IDIgMTIuMjggMiA4LjUgMiA1LjQyIDQuNDIgMyA3LjUgM2MxLjc0IDAgMy40MS44MSA0LjUgMi4wOUMxMy4wOSAzLjgxIDE0Ljc2IDMgMTYuNSAzIDE5LjU4IDMgMjIgNS40MiAyMiA4LjVjMCAzLjc4LTMuNCA2Ljg2LTguNTUgMTEuNTRTMTIgMjEuMzV6Ii8+PC9zdmc+');
            -webkit-mask-position: center;
            -webkit-mask-repeat: no-repeat;
            -webkit-mask-size: 1500%;
          }
          
          .heart-splash-animate {
            animation: heartShrink 1.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          }

          @keyframes heartShrink {
            0% {
              mask-size: 1500%;
              -webkit-mask-size: 1500%;
              opacity: 1;
            }
            80% {
              opacity: 1;
            }
            100% {
              mask-size: 0%;
              -webkit-mask-size: 0%;
              opacity: 0; 
            }
          }
        `,
        }}
      />

      <div
        className={`fixed top-0 left-0 w-screen h-screen bg-white flex justify-center items-center z-[9999] heart-splash ${isAnimating ? 'heart-splash-animate' : ''}`}
      >
        <div className="flex flex-col items-center gap-[12px] md:gap-[16px]">
          {/* 모바일: w-[250px], h-[80px] / PC(md 이상): w-[350px], h-[112px] */}
          <Image
            src="/Images/splash.png"
            alt="뇌파시그널 로고"
            width={350}
            height={112}
            priority
            className="w-[250px] h-[80px] md:w-[350px] md:h-[112px] object-contain transition-all duration-300"
          />

          <p className="text-[#7C55A0] text-[14px] md:text-[18px] font-medium m-0 tracking-[-0.5px] transition-all duration-300">
            뇌파 동조화 기반 우정 및 커플 궁합 테스트
          </p>
        </div>
      </div>
    </>
  );
}
