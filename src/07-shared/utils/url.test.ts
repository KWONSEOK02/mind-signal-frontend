import { describe, it, expect } from 'vitest';
import extractToken from './url';

describe('extractToken — QR 토큰 추출 단위 테스트 수행함', () => {
  describe('URL + token 쿼리 파라미터', () => {
    it('token 쿼리 파라미터가 있으면 해당 값을 반환 처리함', () => {
      expect(extractToken('https://example.com/join?token=abc123')).toBe(
        'abc123'
      );
    });

    it('token 외 다른 쿼리 파라미터가 있어도 token 값만 추출 처리함', () => {
      expect(
        extractToken('https://example.com/join?mode=dual&token=xyz789&lang=ko')
      ).toBe('xyz789');
    });

    it('token 값이 빈 문자열이면 경로 마지막 세그먼트로 폴백 처리함', () => {
      // searchParams.get('token') returns '' (falsy) → 경로 세그먼트 분기로 진입
      expect(extractToken('https://example.com/join?token=')).toBe('join');
    });
  });

  describe('URL + 경로 기반 토큰', () => {
    it('쿼리 파라미터 없이 경로 마지막 세그먼트를 토큰으로 반환 처리함', () => {
      expect(extractToken('https://example.com/join/abc123')).toBe('abc123');
    });

    it('중첩 경로에서 마지막 세그먼트만 추출 처리함', () => {
      expect(extractToken('https://example.com/lab/session/token456')).toBe(
        'token456'
      );
    });

    it('경로가 루트(/)만 있으면 null 반환 처리함', () => {
      expect(extractToken('https://example.com/')).toBeNull();
    });
  });

  describe('순수 문자열 (URL 아닌 경우)', () => {
    it('일반 토큰 문자열은 그대로 반환 처리함', () => {
      expect(extractToken('abc123')).toBe('abc123');
    });

    it('앞뒤 공백을 제거하고 반환 처리함', () => {
      expect(extractToken('  abc123  ')).toBe('abc123');
    });

    it('빈 문자열은 null 반환 처리함', () => {
      expect(extractToken('')).toBeNull();
    });

    it('공백만 있는 문자열은 null 반환 처리함', () => {
      expect(extractToken('   ')).toBeNull();
    });
  });

  describe('엣지 케이스', () => {
    it('UUID 형태 토큰을 정상 추출 처리함', () => {
      expect(extractToken('550e8400-e29b-41d4-a716-446655440000')).toBe(
        '550e8400-e29b-41d4-a716-446655440000'
      );
    });

    it('한국어가 포함된 URL에서도 토큰 추출 처리함', () => {
      expect(extractToken('https://example.com/join?token=한글토큰')).toBe(
        '한글토큰'
      );
    });

    it('프래그먼트(#)가 있는 URL에서 token 파라미터 추출 처리함', () => {
      expect(
        extractToken('https://example.com/join?token=abc123#section')
      ).toBe('abc123');
    });
  });
});
