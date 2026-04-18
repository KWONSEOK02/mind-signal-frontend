import { z } from 'zod';
import { baseSimilaritySchema } from './_base';

/**
 * [Shared] cosine_pearson_faa 알고리즘 유사도 결과 스키마 정의함
 * DE Strategy Pattern이 반환하는 구조와 1:1 대응함
 */
export const cosinePearsonFaaSchema = baseSimilaritySchema.extend({
  /** 전체 뇌파 코사인 유사도 스칼라 값 */
  overall_cosine: z.number(),
  /** 대역별 파워 비율 차이 맵 (delta/theta/alpha/beta/gamma) */
  band_ratio_diff: z.record(z.string(), z.number()),
  /** FAA(전두엽 비대칭 활성도) 절대 차이 — null 허용함 */
  faa_absolute_diff: z.number().nullable(),
});

export type CosinePearsonFaa = z.infer<typeof cosinePearsonFaaSchema>;
