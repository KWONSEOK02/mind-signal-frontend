import { z } from 'zod';
import { baseSimilaritySchema } from './_base';

/**
 * [Shared] cosine_pearson_faa 알고리즘 유사도 결과 스키마 정의함
 * DE Strategy Pattern이 반환하는 구조와 1:1 대응함
 */
export const cosinePearsonFaaSchema = baseSimilaritySchema.extend({
  /** 알고리즘 식별자 — 이 스키마는 cosine_pearson_faa 전용 */
  algorithm: z.literal('cosine_pearson_faa'),
  /** 전체 뇌파 코사인 유사도 스칼라 값 — 코사인 유사도 범위 [-1, 1] */
  overall_cosine: z.number().min(-1).max(1),
  /** 대역별 파워 비율 차이 맵 (delta/theta/alpha/beta/gamma 5대역 고정) */
  band_ratio_diff: z.object({
    delta: z.number(),
    theta: z.number(),
    alpha: z.number(),
    beta: z.number(),
    gamma: z.number(),
  }),
  /** FAA(전두엽 비대칭 활성도) 절대 차이 — null 허용, 음수 불허 */
  faa_absolute_diff: z.number().min(0).nullable(),
});

export type CosinePearsonFaa = z.infer<typeof cosinePearsonFaaSchema>;
