import { describe, it, expect, vi, beforeEach } from 'vitest';
import { chatApi } from './chat';

/**
 * Axios 인스턴스를 모킹하여 API 레이어를 네트워크에서 격리함
 * 실제 HTTP 요청 없이 요청 형식 + 응답 처리를 검증함
 */
vi.mock('./base', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

import { api } from './base';
const mockPost = api.post as ReturnType<typeof vi.fn>;

describe('chatApi — 챗봇 API 통합 테스트 수행함', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendMessage', () => {
    const mockChatResponseData = {
      status: 'success' as const,
      message: '실험실 페이지로 이동합니다',
      url: '/lab',
      level: 1 as const,
    };

    it('POST /chat에 message + groupId body 구성 처리함', async () => {
      mockPost.mockResolvedValue({ data: mockChatResponseData });

      await chatApi.sendMessage('실험실 어떻게 가요', 'group-123');

      expect(mockPost).toHaveBeenCalledWith('/chat', {
        message: '실험실 어떻게 가요',
        groupId: 'group-123',
      });
    });

    it('groupId 미전달 시 undefined로 body 구성 처리함', async () => {
      mockPost.mockResolvedValue({ data: mockChatResponseData });

      await chatApi.sendMessage('도움말');

      expect(mockPost).toHaveBeenCalledWith('/chat', {
        message: '도움말',
        groupId: undefined,
      });
    });

    it('응답 언래핑(.then(res => res.data)) 처리함', async () => {
      mockPost.mockResolvedValue({ data: mockChatResponseData });

      const result = await chatApi.sendMessage('안녕');

      // res.data를 반환하므로 axios response 래퍼가 없는 body 직접 반환 검증함
      expect(result).toEqual(mockChatResponseData);
      expect(result.status).toBe('success');
      expect(result.url).toBe('/lab');
      expect(result.level).toBe(1);
    });

    it('API 실패 시 에러 전파 처리함', async () => {
      mockPost.mockRejectedValue(new Error('Chat service unavailable'));

      await expect(chatApi.sendMessage('안녕')).rejects.toThrow(
        'Chat service unavailable'
      );
    });
  });

  describe('sendInquiry', () => {
    const mockInquiryResponseData = {
      status: 'success' as const,
      message: '문의가 접수되었습니다',
    };

    it('POST /chat/ask에 email + message body 구성 처리함', async () => {
      mockPost.mockResolvedValue({ data: mockInquiryResponseData });

      await chatApi.sendInquiry('test@example.com', '문의 내용입니다');

      expect(mockPost).toHaveBeenCalledWith('/chat/ask', {
        email: 'test@example.com',
        message: '문의 내용입니다',
      });
    });

    it('응답 언래핑(.then(res => res.data)) 처리함', async () => {
      mockPost.mockResolvedValue({ data: mockInquiryResponseData });

      const result = await chatApi.sendInquiry(
        'test@example.com',
        '문의합니다'
      );

      // res.data를 반환하므로 axios response 래퍼가 없는 body 직접 반환 검증함
      expect(result).toEqual(mockInquiryResponseData);
      expect(result.status).toBe('success');
      expect(result.message).toBe('문의가 접수되었습니다');
    });

    it('API 실패 시 에러 전파 처리함', async () => {
      mockPost.mockRejectedValue(new Error('Email service error'));

      await expect(
        chatApi.sendInquiry('test@example.com', '문의합니다')
      ).rejects.toThrow('Email service error');
    });
  });
});
