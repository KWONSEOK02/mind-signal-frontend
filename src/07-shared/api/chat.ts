import { api } from './base';

/** 채팅 API 응답 타입 정의함 */
export interface ChatResponse {
  status: 'success' | 'error';
  message: string;
  url: string;
  level: 1 | 2 | 3;
}

/** 문의하기 API 응답 타입 정의함 */
export interface ChatAskResponse {
  status: 'success' | 'error';
  message?: string;
}

/** 챗봇 API 클라이언트 정의함 */
export const chatApi = {
  /** 챗봇 메시지 전송 — 페이지 안내 또는 텍스트 답변 반환함 */
  sendMessage: (message: string) =>
    api.post<ChatResponse>('/chat', { message }).then((res) => res.data),

  /** 문의하기 이메일 전송함 */
  sendInquiry: (email: string, message: string) =>
    api
      .post<ChatAskResponse>('/chat/ask', { email, message })
      .then((res) => res.data),
};
