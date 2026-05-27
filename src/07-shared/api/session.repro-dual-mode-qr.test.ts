import { describe, it, expect, vi, beforeEach } from 'vitest';
import sessionApi from './session';

/**
 * DUAL 모드 QR 미생성 버그 재현 테스트 수행함
 *
 * root cause: createdPairing(groupId?: string) 내부에서
 *   `api.post('/sessions', { groupId: groupId || null })`
 * groupId 인자 없이 호출하면 `groupId: null`을 BE에 전송함.
 * BE는 null을 허용하지 않아 400 반환 → pairingCode 미세팅 → QR 미표시.
 */
vi.mock('./base', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

import { api } from './base';
const mockPost = api.post as ReturnType<typeof vi.fn>;

// ────────────────────────────────────────────────────────────────────────────
// 회귀 시뮬레이션 매핑
//
// Simulation A (현재 동작 — 버그 박제):
//   groupId 없이 createdPairing() 호출 → body = { groupId: null }
//   → 현재 코드 그대로라면 PASS (버그 존재 확인)
//
// Simulation B (fix 후 기대 동작 — 현재 FAIL):
//   fix 후에는 body에 groupId 키 자체 없거나 undefined여야 함
//   → 현재 코드에서는 FAIL (null이므로)
//
// Simulation C (정상 케이스 — groupId 있을 때 전달):
//   groupId='abc' 전달 시 body = { groupId: 'abc' } → PASS (의도 동작 확인)
// ────────────────────────────────────────────────────────────────────────────

describe('Reproduce: createdPairing이 BE에 null 전송하는 버그 박제함', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Simulation A: 옵션 D 적용 후 동작 박제 — groupId 인자 없으면 키 자체 생략함
   *
   * 조건부 spread (`groupId ? { groupId } : {}`) 결과 body에 groupId 키 자체
   * 없음. fix 무력화 시 (예: `{ groupId: groupId || null }` 회귀) 이 테스트가
   * FAIL로 전환되어 회귀 경보 역할 수행함.
   */
  it('[Sim-A] groupId 인자 없이 호출 시 body에 groupId 키 자체 없음 (옵션 D 박제)', async () => {
    // arrange
    mockPost.mockResolvedValue({
      data: {
        status: 'success',
        data: {
          groupId: '65c9f0b2a1b2c3d4e5f67899',
          subjectIndex: 0,
          pairingToken: 'token-abc',
          expiresAt: '2026-06-01T12:00:00Z',
        },
      },
    });

    // act
    await sessionApi.createdPairing();

    // assert: 빈 객체 전송 박제 — groupId 키 자체 없음
    expect(mockPost).toHaveBeenCalledWith('/sessions', {});

    // 명시적 spy received body 인용
    const receivedBody = mockPost.mock.calls[0][1] as Record<string, unknown>;
    expect(receivedBody).not.toHaveProperty('groupId');
  });

  /**
   * Simulation B: fix 후 기대 동작 박제 — 현재 FAIL
   *
   * fix 후에는 groupId 인자가 없을 때 body에 groupId 키가 없어야 하거나
   * undefined여야 함. 현재 코드(groupId || null)는 null을 박으므로 이 테스트는
   * 현재 FAIL임. fix 적용 시 PASS로 전환됨.
   */
  it('[Sim-B] 회귀 시뮬레이션 B — fix 후에는 body에 groupId 키가 없어야 함 (현재 FAIL)', async () => {
    // arrange
    mockPost.mockResolvedValue({
      data: {
        status: 'success',
        data: {
          groupId: 'group-123',
          subjectIndex: 0,
          pairingToken: 'token-abc',
          expiresAt: '2026-06-01T12:00:00Z',
        },
      },
    });

    // act
    await sessionApi.createdPairing();

    // assert: fix 후 기대 — groupId 키 자체 없음 또는 undefined
    // 현재는 null이 들어오므로 FAIL
    const receivedBody = mockPost.mock.calls[0][1] as Record<string, unknown>;
    expect(receivedBody).not.toHaveProperty('groupId');
  });

  /**
   * Simulation C: groupId 정상 전달 케이스 — 현재 PASS (의도 동작 확인)
   *
   * 유효한 groupId 문자열을 전달하면 body에 올바르게 포함됨을 검증함.
   * 이 테스트는 fix 전후 모두 PASS여야 함.
   */
  it('[Sim-C] groupId 전달 시 body에 해당 값이 정상 포함 처리됨', async () => {
    // arrange
    mockPost.mockResolvedValue({
      data: {
        status: 'success',
        data: {
          groupId: 'existing-group',
          subjectIndex: 0,
          pairingToken: 'token-xyz',
          expiresAt: '2026-06-01T12:00:00Z',
        },
      },
    });

    // act
    await sessionApi.createdPairing('existing-group');

    // assert: groupId 값이 body에 정상 전달됨
    expect(mockPost).toHaveBeenCalledWith('/sessions', {
      groupId: 'existing-group',
    });

    const receivedBody = mockPost.mock.calls[0][1] as { groupId: unknown };
    expect(receivedBody.groupId).toBe('existing-group');
  });

  /**
   * Simulation A-2: 빈 문자열 인자도 키 생략 처리됨 (옵션 D D-5 시나리오)
   *
   * 조건부 spread는 falsy(null/undefined/'') 모두 키 제거함. fix 무력화 시
   * 빈 문자열이 null로 전송되는 회귀가 재발하면 이 테스트가 경보 역할 수행함.
   */
  it('[Sim-A2] 빈 문자열 groupId 전달 시에도 body에 groupId 키 자체 없음 (옵션 D 박제)', async () => {
    // arrange
    mockPost.mockResolvedValue({
      data: {
        status: 'success',
        data: {
          groupId: '65c9f0b2a1b2c3d4e5f6788a',
          subjectIndex: 0,
          pairingToken: 'token-def',
          expiresAt: '2026-06-01T12:00:00Z',
        },
      },
    });

    // act: 빈 문자열 전달 — falsy
    await sessionApi.createdPairing('');

    // assert: 빈 객체로 전송 — 키 자체 없음
    const receivedBody = mockPost.mock.calls[0][1] as Record<string, unknown>;
    expect(receivedBody).not.toHaveProperty('groupId');
  });
});
