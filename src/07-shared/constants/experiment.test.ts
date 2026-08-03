import { describe, it, expect } from 'vitest';
import { EXPERIMENT_MODES } from './experiment';

/**
 * EXPERIMENT_MODES 상수 및 ExperimentMode 타입 단위 테스트 수행함
 */
describe('EXPERIMENT_MODES — 실험 모드 상수 검증함', () => {
  it('DUAL 값이 문자열 "DUAL"임을 확인함', () => {
    expect(EXPERIMENT_MODES.DUAL).toBe('DUAL');
  });

  it('BTI 값이 문자열 "BTI"임을 확인함', () => {
    expect(EXPERIMENT_MODES.BTI).toBe('BTI');
  });

  it('DUAL_2PC 값이 문자열 "DUAL_2PC"임을 확인함', () => {
    expect(EXPERIMENT_MODES.DUAL_2PC).toBe('DUAL_2PC');
  });

  it('SEQUENTIAL 키가 제거됨 (SESSION-W002)', () => {
    expect('SEQUENTIAL' in EXPERIMENT_MODES).toBe(false);
  });

  it('EXPERIMENT_MODES 객체가 정확히 3개 키를 보유함 (SESSION-W002 로 SEQUENTIAL 제거)', () => {
    expect(Object.keys(EXPERIMENT_MODES)).toHaveLength(3);
  });
});
