import { describe, it, expect } from 'vitest';
import { cosinePearsonFaaSchema } from './cosine_pearson_faa.schema';
import { similaritySchemaRegistry } from './index';

/**
 * cosine_pearson_faa 스키마 단위 테스트 수행함
 */
describe('cosinePearsonFaaSchema', () => {
  const validPayload = {
    algorithm: 'cosine_pearson_faa',
    similarity_score: 0.75,
    overall_cosine: 0.82,
    band_ratio_diff: {
      delta: 0.05,
      theta: -0.03,
      alpha: 0.12,
      beta: -0.07,
      gamma: 0.02,
    },
    faa_absolute_diff: 0.14,
  };

  it('유효한 페이로드가 정상 파싱 처리됨', () => {
    const result = cosinePearsonFaaSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.similarity_score).toBe(0.75);
      expect(result.data.algorithm).toBe('cosine_pearson_faa');
      expect(result.data.band_ratio_diff.alpha).toBe(0.12);
    }
  });

  it('faa_absolute_diff가 null인 경우 파싱 처리됨', () => {
    const payload = { ...validPayload, faa_absolute_diff: null };
    const result = cosinePearsonFaaSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.faa_absolute_diff).toBeNull();
    }
  });

  it('similarity_score가 1.5이면 파싱 실패 처리됨', () => {
    const payload = { ...validPayload, similarity_score: 1.5 };
    const result = cosinePearsonFaaSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('similarity_score가 음수이면 파싱 실패 처리됨', () => {
    const payload = { ...validPayload, similarity_score: -0.1 };
    const result = cosinePearsonFaaSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('algorithm 필드 누락 시 파싱 실패 처리됨', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { algorithm: _alg, ...withoutAlgorithm } = validPayload;
    const result = cosinePearsonFaaSchema.safeParse(withoutAlgorithm);
    expect(result.success).toBe(false);
  });

  it('band_ratio_diff 필드 누락 시 파싱 실패 처리됨', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { band_ratio_diff: _brd, ...withoutBandRatio } = validPayload;
    const result = cosinePearsonFaaSchema.safeParse(withoutBandRatio);
    expect(result.success).toBe(false);
  });

  it('similarity_score 경계값 0이 파싱 처리됨', () => {
    const result = cosinePearsonFaaSchema.safeParse({
      ...validPayload,
      similarity_score: 0,
    });
    expect(result.success).toBe(true);
  });

  it('similarity_score 경계값 1이 파싱 처리됨', () => {
    const result = cosinePearsonFaaSchema.safeParse({
      ...validPayload,
      similarity_score: 1,
    });
    expect(result.success).toBe(true);
  });

  it('레지스트리 default 키가 cosinePearsonFaaSchema를 가리킴', () => {
    expect(similaritySchemaRegistry.default).toBe(cosinePearsonFaaSchema);
  });
});
