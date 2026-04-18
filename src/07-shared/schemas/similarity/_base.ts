import { z } from 'zod';

/**
 * [Shared] 유사도 분석 결과 기본 스키마 정의함
 * 모든 알고리즘이 공통으로 반환하는 최소 필드 집합임
 */
export const baseSimilaritySchema = z.object({
  /** 알고리즘 식별자 */
  algorithm: z.string(),
  /** 정규화된 유사도 점수 (0~1 범위) */
  similarity_score: z.number().min(0).max(1),
});

export type BaseSimilarity = z.infer<typeof baseSimilaritySchema>;
