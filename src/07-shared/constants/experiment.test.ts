import { describe, it, expect } from 'vitest';
import { EXPERIMENT_MODES } from './experiment';
import type { ExperimentMode } from './experiment';

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

  it('SEQUENTIAL 값이 문자열 "SEQUENTIAL"임을 확인함', () => {
    expect(EXPERIMENT_MODES.SEQUENTIAL).toBe('SEQUENTIAL');
  });

  it('ExperimentMode 타입이 SEQUENTIAL 리터럴을 수용함 (컴파일 타임 검증)', () => {
    // ExperimentMode 타입에 'SEQUENTIAL'이 포함되는지 컴파일 시점에 확인함
    const mode: ExperimentMode = 'SEQUENTIAL';
    expect(mode).toBe('SEQUENTIAL');
  });

  it('DUAL_2PC 값이 문자열 "DUAL_2PC"임을 확인함', () => {
    expect(EXPERIMENT_MODES.DUAL_2PC).toBe('DUAL_2PC');
  });

  it('EXPERIMENT_MODES 객체가 정확히 4개 키를 보유함 (Phase 16 DUAL_2PC 추가)', () => {
    expect(Object.keys(EXPERIMENT_MODES)).toHaveLength(4);
  });
});
