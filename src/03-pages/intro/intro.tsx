import React, { useState } from 'react';
import {
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import Image from 'next/image';

interface IntroProps {
  theme: 'light' | 'dark';
}

const Intro: React.FC<IntroProps> = ({ theme }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const isDark = theme === 'dark';

  const faqs = [
    {
      q: '뇌파 측정은 안전한가요?',
      a: '네, 매우 안전합니다. Emotiv Insight는 비침습적인 방식으로 작동하며, 전자기파를 방출하는 것이 아니라 두피에서 발생하는 미세한 전기 신호만을 읽어내는 수동적 센서 장치입니다. 젤을 사용하지 않는 건식 센서로 위생적이며 인체에 무해합니다.',
    },
    {
      q: '실험 참여 시간은 총 얼마나 소요되나요?',
      a: '장비 착용 및 신호 최적화에 3분, 베이스라인 측정(눈 뜨고/감고)에 1분, 그리고 메인 실험 상호작용에 약 5~10분이 소요됩니다. 전체 과정은 약 15분 내외로 종료됩니다.',
    },
    {
      q: '수집된 뇌파 데이터는 어떻게 관리되나요?',
      a: '졸업 프로젝트 연구 목적으로만 활용되며, 모든 데이터는 익명화 처리를 거쳐 암호화된 서버에 보관됩니다. 프로젝트 결과 발표 및 심사가 종료되는 2026년 말에 모든 데이터는 영구 파기될 예정입니다.',
    },
    {
      q: '안경을 쓰고 있어도 측정이 가능한가요?',
      a: '네, 가능합니다. Emotiv Insight는 귀 윗부분을 감싸는 형태지만 안경 테와 간섭을 최소화하도록 설계되었습니다. 다만, 신호가 불안정할 경우 잠시 안경을 벗거나 위치를 조정할 수 있습니다.',
    },
    {
      q: '뇌파를 통해 제 생각을 읽을 수 있는 건가요?',
      a: "아니요, 구체적인 생각(단어, 이미지 등)을 읽어내는 것은 현대 기술로도 매우 제한적입니다. 본 프로젝트는 '생각'이 아닌 '두 사람의 뇌파 패턴이 얼마나 유사하게 동조(Sync)되는지'의 정도와 집중도, 이완도 등 심리 지표만을 분석합니다.",
    },
    {
      q: '카페인 섭취가 실험 결과에 영향을 주나요?',
      a: '고농도의 카페인은 뇌의 각성 상태를 높여 베타파(Beta wave)를 활성화시킬 수 있습니다. 보다 정확한 평상시 뇌파 매칭을 위해 실험 전 2시간 이내에는 과도한 카페인 섭취를 지양해 주시는 것을 권장합니다.',
    },
    {
      q: '결과에서 제공되는 뇌BTI는 무엇인가요?',
      a: "재미로 보는 뇌BTI는 기존 설문 방식의 MBTI와 달리, 특정 자극에 반응하는 뇌파의 활성 영역과 주파수 특성을 기반으로 분류한 '뇌과학적 성격 유형'입니다. 더욱 객관적이고 무의식적인 성향을 나타냅니다.",
    },
    {
      q: '결과 확인은 언제까지 가능한가요?',
      a: '별도의 고유 코드 발급 없이, 본 웹사이트에서 로그인하시면 언제든 자신의 분석 리포트를 다시 조회할 수 있습니다. 개인정보 보호를 위해 실험 시 등록한 이메일 계정으로 로그인한 사용자만 본인의 분석 결과에 접근할 수 있습니다.',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-32 space-y-32">
      <div className="grid md:grid-cols-2 gap-16 items-center">
        <div className="space-y-8">
          <div className="space-y-4">
            <h2
              className={`text-5xl font-black tracking-tighter italic leading-none ${isDark ? 'text-white' : 'text-slate-900'}`}
            >
              감정의 데이터화,
              <br />
              인연의 가시화
            </h2>
            <p
              className={`text-xl font-bold leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
            >
              뇌파 시그널 프로젝트는 인간의 무의식적 반응인{' '}
              <span
                className={`${isDark ? 'text-white decoration-indigo-500' : 'text-indigo-600 decoration-indigo-300'} underline underline-offset-4`}
              >
                뇌파 동조화
              </span>
              를 통해 인연의 깊이를 정량적으로 분석하는 공학적 시도입니다.
            </p>
          </div>
        </div>
        <div
          className={`glass p-1 rounded-[50px] border ${isDark ? 'border-white/5' : 'border-indigo-100'} shadow-2xl overflow-hidden relative group`}
        >
          <Image
            src="https://framerusercontent.com/images/WUV1fZgVSOY2jdQ59SFX4Mmom0.webp?width=1430&height=1240"
            alt="EEG Headset"
            width={1430}
            height={1240}
            className="w-full h-full object-cover rounded-[48px] brightness-75 transition-transform duration-1000 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent opacity-60" />
          <div className="absolute bottom-10 left-10 space-y-1">
            <h4 className="text-xl font-black italic uppercase text-white">
              Emotiv Insight
            </h4>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Precision EEG Device
            </p>
          </div>
        </div>
      </div>
      <div className="space-y-12">
        <h3
          className={`text-3xl font-black italic uppercase tracking-tighter text-center ${isDark ? 'text-white' : 'text-slate-900'}`}
        >
          이벤트 진행 단계
        </h3>
        <div className="grid md:grid-cols-4 gap-8">
          {[
            {
              step: '01',
              title: '이벤트 참여 전 간단한 설문조사',
              desc: '이벤트 진행 전 간단한 설문조사를 진행자와 함께 진행합니다.',
            },
            {
              step: '02',
              title: 'Baseline 설정 및 반응 측정',
              desc: '두 사용자는 Emotiv Insight 기기를 착용하고, 이벤트 진행자와 30초의 명상, 5~10분 가량 대화 및 영상을 시청합니다.',
            },
            {
              step: '03',
              title: '두 사용자의 뇌파 데이터 분석',
              desc: '이벤트 참여 이후 저희가 만든 분석 알고리즘 기반으로 참여자 뇌파 분석 리포트를 작성합니다. 수집된 뇌파 데이터는 델타, 세타, 알파, 베타, 감마파형으로 분류해서 수집됩니다.',
            },
            {
              step: '04',
              title: '결과확인',
              desc: '이벤트 참여자는 당일 밤 10시에 카카오톡 및 이메일로 뇌파 분석 리포트를 제공받습니다. 뇌파 분석에 관한 추가 궁금한 사항이 있으면 저희 웹사이트에 방문해서 확인하실 수 있습니다.',
            },
          ].map((item, i) => (
            <div
              key={i}
              className={`rounded-3xl ${
                isDark
                  ? 'p-0'
                  : 'p-[2px] bg-[linear-gradient(to_bottom_right,#e9d5ff,#fbcfe8,#bae6fd,#fef08a)]'
              }`}
            >
              <div
                className={`h-full p-8 space-y-4 ${
                  isDark
                    ? 'rounded-3xl bg-white/5 border border-white/5' // 다크모드: 배경과 비슷한 차분한 회색 박스 (테두리도 동일하게 맞춤)
                    : 'glass rounded-[calc(1.5rem-2px)] bg-white/95' // 라이트모드: 흰색 바탕
                }`}
              >
                <span
                  className={`text-4xl font-black italic ${
                    isDark ? 'text-purple-400' : 'text-purple-300' // 라이트모드는 더 부드러운 파스텔톤 보라색으로!
                  }`}
                >
                  {item.step}
                </span>
                <h4
                  className={`text-lg font-black whitespace-nowrap tracking-tight ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  {item.title}
                </h4>
                <p
                  className={`text-sm font-medium leading-relaxed ${
                    isDark ? 'text-slate-400' : 'text-slate-600'
                  }`}
                >
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-12 max-w-4xl mx-auto">
        <div className="text-center space-y-2">
          <h3
            className={`text-3xl font-black italic uppercase tracking-tighter flex items-center justify-center gap-3 ${isDark ? 'text-white' : 'text-slate-900'}`}
          >
            <HelpCircle className="text-indigo-500" /> FAQ
          </h3>
          <p className="text-slate-500 font-bold text-sm">
            실험에 대해 가장 많이 묻는 8가지 질문입니다.
          </p>
        </div>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className={`glass rounded-2xl border ${isDark ? 'border-white/10' : 'border-indigo-200'} overflow-hidden transition-all duration-300`}
            >
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className={`w-full cursor-pointer p-6 flex items-center justify-between font-black text-left hover:bg-white/5 transition-colors ${openFaq === i ? 'text-indigo-500 bg-white/5' : isDark ? 'text-slate-200' : 'text-slate-800'}`}
              >
                <div className="flex items-center gap-4">
                  {/* Q는 선명한 인디고 색상으로 고정! */}
                  <span
                    className={`italic text-xl ${isDark ? 'text-indigo-500' : 'text-indigo-500'}`}
                  >
                    Q.
                  </span>
                  <span>{faq.q}</span>
                </div>
                {openFaq === i ? (
                  <ChevronUp size={20} />
                ) : (
                  <ChevronDown size={20} />
                )}
              </button>
              {openFaq === i && (
                <div
                  className={`p-8 bg-white/5 border-t ${isDark ? 'border-white/5 text-slate-400' : 'border-indigo-200 text-slate-700'} font-medium leading-relaxed animate-in slide-in-from-top-4 duration-500 flex gap-4`}
                >
                  {/* A는 Q랑 확실히 대비되게 보라색으로 고정! */}
                  <span
                    className={`italic text-xl font-black ${isDark ? 'text-purple-400' : 'text-purple-500'}`}
                  >
                    A.
                  </span>
                  <span>{faq.a}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Intro;
