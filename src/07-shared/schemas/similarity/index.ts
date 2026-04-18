export { baseSimilaritySchema } from './_base';
export type { BaseSimilarity } from './_base';
export { cosinePearsonFaaSchema } from './cosine_pearson_faa.schema';
export type { CosinePearsonFaa } from './cosine_pearson_faa.schema';

import { cosinePearsonFaaSchema } from './cosine_pearson_faa.schema';
import { z } from 'zod';

/**
 * [Shared] 알고리즘명 → 스키마 레지스트리 정의함
 * 신규 알고리즘 추가 시 이 객체에만 등록하면 됨
 */
export const similaritySchemaRegistry: Record<
  string,
  z.ZodSchema<unknown>
> = {
  cosine_pearson_faa: cosinePearsonFaaSchema,
  default: cosinePearsonFaaSchema,
};
