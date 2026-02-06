import React, { useState } from 'react';
import { Mail, MessageCircle, MapPin, Send } from 'lucide-react';

interface InquiryProps {
  theme: 'light' | 'dark';
}

const Inquiry: React.FC<InquiryProps> = ({ theme }) => {
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const email = 'mks002@icloud.com';
    const subject = encodeURIComponent(
      `[뇌파 시그널 문의] ${formData.subject}`
    );
    const body = encodeURIComponent(
      `보낸 사람: ${formData.name}\n\n내용:\n${formData.message}`
    );
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="max-w-7xl mx-auto px-6">
      <div
        className={`glass rounded-[40px] p-10 md:p-20 flex flex-col md:flex-row gap-16 border transition-all ${
          theme === 'dark'
            ? 'border-white/5 shadow-2xl'
            : 'border-slate-100 shadow-xl'
        }`}
      >
        <div className="flex-1 space-y-10">
          <div className="space-y-4">
            <div
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-bold tracking-widest uppercase transition-colors ${
                theme === 'dark'
                  ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                  : 'bg-indigo-50 border-indigo-100 text-indigo-600'
              }`}
            >
              Contact Center
            </div>
            <h2
              className={`text-4xl md:text-5xl font-black tracking-tight transition-colors ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}
            >
              문의하기
            </h2>
            <p className="text-slate-500 text-lg leading-relaxed">
              실험 참여 방법, 데이터 활용, 제휴 문의 등 궁금한 점을 남겨주시면
              연구팀에서 상세히 답변해 드립니다.
            </p>
          </div>

          <div className="grid gap-6">
            {[
              {
                icon: <Mail />,
                label: 'Email',
                value: 'mks002@icloud.com',
                color: theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600',
                bg: theme === 'dark' ? 'bg-indigo-500/10' : 'bg-indigo-50',
              },
              {
                icon: <MessageCircle />,
                label: 'Kakao',
                value: 'mks4910',
                color: theme === 'dark' ? 'text-amber-400' : 'text-amber-600',
                bg: theme === 'dark' ? 'bg-amber-500/10' : 'bg-amber-50',
              },
              {
                icon: <MapPin />,
                label: 'Location',
                value: '상명대 제1공학관 3층',
                color: theme === 'dark' ? 'text-rose-400' : 'text-rose-600',
                bg: theme === 'dark' ? 'bg-rose-500/10' : 'bg-rose-50',
              },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-6 group">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center border group-hover:scale-110 transition-all shadow-sm ${
                    theme === 'dark'
                      ? `${item.bg} ${item.color} border-white/5`
                      : `${item.bg} ${item.color} border-transparent`
                  }`}
                >
                  {item.icon}
                </div>
                <div>
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    {item.label}
                  </div>
                  <div
                    className={`text-lg font-bold transition-colors ${theme === 'dark' ? 'text-slate-200' : 'text-slate-900'}`}
                  >
                    {item.value}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1">
          <form
            onSubmit={handleSubmit}
            className={`p-8 md:p-10 rounded-3xl space-y-6 border transition-all ${
              theme === 'dark'
                ? 'bg-white/5 border-white/10'
                : 'bg-slate-50/50 border-slate-200'
            }`}
          >
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                성함 / 단체명
              </label>
              <input
                required
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="이름을 입력해 주세요."
                className={`w-full border rounded-xl px-5 py-4 focus:border-indigo-500 transition-all ${
                  theme === 'dark'
                    ? 'bg-slate-900/50 border-white/10 text-white'
                    : 'bg-white/50 border-slate-200 text-slate-900'
                }`}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                상세 내용
              </label>
              <textarea
                required
                name="message"
                value={formData.message}
                onChange={handleChange}
                rows={5}
                placeholder="궁금하신 내용을 남겨주세요."
                className={`w-full border rounded-xl px-5 py-4 focus:border-indigo-500 transition-all resize-none ${
                  theme === 'dark'
                    ? 'bg-slate-900/50 border-white/10 text-white'
                    : 'bg-white/50 border-slate-200 text-slate-900'
                }`}
              />
            </div>
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-indigo-500/20"
            >
              <span>메시지 보내기</span> <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Inquiry;
