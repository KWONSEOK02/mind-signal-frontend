'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, Loader2, Sparkles, User, Mail } from 'lucide-react';
import { chatApi } from '@/07-shared/api/chat';

/** 채팅 메시지 타입 정의함 */
interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  url?: string;
  level?: 1 | 2 | 3;
  /** 문의 폼 표시 여부 */
  showInquiryForm?: boolean;
}

const ChatAssistant: React.FC<{
  theme: 'light' | 'dark';
  groupId?: string;
}> = ({ groupId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', text: '안녕하세요! 뉴로입니다.' },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [inquiryEmail, setInquiryEmail] = useState('');
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [isSendingInquiry, setIsSendingInquiry] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isOpen]);

  /** 채팅 메시지 전송 처리함 */
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const response = await chatApi.sendMessage(userMsg, groupId);

      const botMessage: ChatMessage = {
        role: 'assistant',
        text: response.message,
        url: response.url || undefined,
        level: response.level,
        showInquiryForm: response.level === 3,
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: '연결 오류가 발생했습니다.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  /** 문의하기 폼 전송 처리함 */
  const handleInquiry = async () => {
    if (!inquiryEmail.trim() || !inquiryMessage.trim() || isSendingInquiry)
      return;
    setIsSendingInquiry(true);

    try {
      const response = await chatApi.sendInquiry(
        inquiryEmail.trim(),
        inquiryMessage.trim()
      );
      if (response.status === 'success') {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: '문의가 전송되었습니다. 감사합니다!' },
        ]);
        setInquiryEmail('');
        setInquiryMessage('');
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: response.message || '문의 전송에 실패했습니다.',
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: '문의 전송 중 오류가 발생했습니다.' },
      ]);
    } finally {
      setIsSendingInquiry(false);
    }
  };

  /** 메시지 버블 렌더링함 */
  const renderMessage = (msg: ChatMessage, i: number) => (
    <div
      key={i}
      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
      >
        <div
          className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white/10 text-slate-400'}`}
        >
          {msg.role === 'user' ? <User size={14} /> : <Sparkles size={14} />}
        </div>
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
            msg.role === 'user'
              ? 'bg-indigo-600 text-white rounded-tr-none'
              : 'glass border border-white/5 text-slate-300 rounded-tl-none'
          }`}
        >
          {msg.text}
          {msg.url ? (
            <a
              href={msg.url}
              className="block mt-2 text-indigo-400 hover:text-indigo-300 underline text-xs"
            >
              {msg.url}
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );

  /** 문의하기 폼 렌더링함 */
  const renderInquiryForm = () => (
    <div className="mx-4 mb-3 p-4 rounded-2xl border border-white/10 bg-white/5 space-y-3">
      <div className="flex items-center gap-2 text-slate-300 text-sm font-medium">
        <Mail size={14} />
        <span>담당자에게 문의하기</span>
      </div>
      <input
        type="email"
        value={inquiryEmail}
        onChange={(e) => setInquiryEmail(e.target.value)}
        placeholder="이메일 주소"
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-all"
      />
      <textarea
        value={inquiryMessage}
        onChange={(e) => setInquiryMessage(e.target.value)}
        placeholder="문의 내용을 입력하세요"
        rows={3}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-all resize-none"
      />
      <button
        onClick={handleInquiry}
        disabled={
          !inquiryEmail.trim() || !inquiryMessage.trim() || isSendingInquiry
        }
        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
      >
        {isSendingInquiry ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Send size={14} />
        )}
        {isSendingInquiry ? '전송 중...' : '문의 보내기'}
      </button>
    </div>
  );

  /** 마지막 메시지가 level 3인지 확인함 */
  const lastMessage = messages[messages.length - 1];
  const showInquiry = lastMessage?.showInquiryForm === true;

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 z-[100]">
      {isOpen ? (
        <div className="w-[calc(100vw-2rem)] sm:w-[380px] h-[70vh] sm:h-[550px] bg-gray-900 rounded-[32px] border border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
          <div className="p-6 bg-indigo-600 flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Bot size={20} />
              </div>
              <div>
                <h3 className="font-black italic">NEURO</h3>
                <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">
                  Project AI Concierge
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="cursor-pointer hover:bg-black/10 p-2 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg, i) => renderMessage(msg, i))}
            {isLoading ? (
              <div className="flex justify-start">
                <Loader2 size={20} className="animate-spin text-indigo-500" />
              </div>
            ) : null}
          </div>

          {showInquiry ? renderInquiryForm() : null}

          <div className="p-4 border-t border-white/5">
            <div className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="무엇이든 물어보세요..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-indigo-500 transition-all pr-12"
              />
              <button
                onClick={handleSend}
                className="cursor-pointer absolute right-2 top-2 p-2.5 bg-indigo-600 text-white rounded-xl"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="cursor-pointer w-16 h-16 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform active:scale-95 group"
        >
          <Bot
            size={28}
            className="group-hover:rotate-12 transition-transform"
          />
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full animate-pulse" />
        </button>
      )}
    </div>
  );
};

export default ChatAssistant;
