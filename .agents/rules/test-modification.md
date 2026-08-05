
# Test Modification Rules — Mind Signal Frontend (Vitest variant)

> **Important**: this project uses **Vitest**. Jest API (`jest.mock`, `jest.fn`, `npm test -- -u`) is forbidden.

## Regression test priority policy

E2E tests should be **happy path first, plus one core error path**. Everything else (other error branches, edge cases) belongs in component/unit tests.

| What to verify | Recommended layer | Why |
|---|---|---|
| Core user flow (success scenario) | **Playwright E2E** (1 test) | full-stack integration check, regression fail-fast signal |
| Core error response (e.g. 404) | **Playwright E2E** (1 test) | branch with high user-experience impact |
| Other error branches (401/403/500/network/timeout) | **Vitest component test** (`vi.mock` + `mockRejectedValue`) | avoids E2E time cost, isolated verification |
| Mobile keyboard / viewport effects | **Vitest component test** (`window.innerWidth` mock) | E2E viewport gating is flaky, Playwright project filters are risky |
| Non-axios errors / AbortController races | **Vitest component test** (`mockImplementation` + signal) | precise timing control, reproduces race scenarios |

**Why this policy**:
- Covering every branch in E2E is over-engineering — it raises time cost and flaky risk
- Most error paths can be isolated with mocks, so component/unit tests are faster and more stable
- A happy-path E2E is the most reliable regression signal

**How to apply**:
- PLAN.md's `## Test Strategy` section must state the layer assignment
- On verify failure, prioritize happy-path E2E fail-fast; error-path failures can go to a follow-up hotfix or backlog

## Test runner setup

| Kind | Tool | Command | Location |
|------|------|----------|------|
| Unit / Component | **Vitest** + `@vitest/browser-playwright` (real Chromium browser) | `npm run test` | co-located with source |
| E2E | Playwright | `npm run test:e2e` | `e2e/*.spec.ts` |
| Storybook | Storybook + Chromatic | `npm run storybook` | `*.stories.tsx` |

**Playwright E2E is a separate runner** — Vitest does not execute it. It has its own `playwright.config.ts`.

## When to Modify Tests

Every code change requires a corresponding test change.

| Code change type | Affected test layer | Required action |
|--------------|------------------|---------|
| New component/page | unit (+ optional snapshot) | new test file; add a snapshot and init with `vitest -u` if the UI output is stable |
| Component signature/props change | unit (direct) + integration (indirect) | update existing assertions/fixtures |
| API function signature change | unit | update assertions and MSW handlers |
| Business logic change | unit | update assertions, add edge cases |
| Dependency version bump | snapshot (may break) | check diff — `vitest -u` if intentional, otherwise fix the code |
| config / env var change | integration + smoke | update `config.ts` mocks |
| **Refactor (behavior unchanged)** | **none** | **do not touch tests — a broken test means the refactor changed behavior** |

## Vitest API — required usage pattern

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';   // wires jest-dom matchers into Vitest

// ✅ Vitest mock API
vi.mock('@/07-shared/api/base');             // module mock (not jest.mock)
const mockFn = vi.fn();                      // function mock (not jest.fn)
vi.spyOn(obj, 'method');                     // spy (not jest.spyOn)
vi.useFakeTimers();                          // fake timers
vi.restoreAllMocks();                        // restore mocks

// ❌ Forbidden — Jest API
jest.mock(...);
jest.fn();
jest.spyOn(...);
```

## Snapshot Management (Vitest)

**Never run `vitest -u` without checking the diff first.**

On a snapshot test failure:

```text
1. Read the failure diff carefully
2. Ask "was this change intentional?"
   -> YES: run `vitest -u`, then review the .snap file's git diff
   -> NO:  the code introduced a bug — fix the code, not the snapshot
3. If the updated snapshot diff still looks wrong, revert and fix the code again
```

> **First-run snapshot**: a "missing snapshot" error the first time a new snapshot test
> runs is normal — `npm run test` creates it automatically. Re-run to confirm it passes.

Snapshot update commands (Vitest):

```bash
vitest -u                         # update all snapshots
vitest run --reporter=verbose -u  # update with verbose output
```

## Dynamic-value Snapshots

**Never put non-deterministic values (timestamps, UUIDs, session IDs, etc.) in a snapshot.**

```typescript
// ❌ Forbidden — createdAt differs every run, so the snapshot always fails
expect(result).toMatchSnapshot();

// ✅ Correct — use a matcher for dynamic values
expect(result).toMatchObject({
  sessionId: expect.any(String),
  createdAt: expect.any(Number),
  data: [/* fixed values only */],
});

// ✅ Or mock Date.now
vi.setSystemTime(new Date('2026-01-01'));
```

## API Mocking — MSW

MSW 2.x is installed in this project (see `package.json`). API-dependent tests must be isolated with MSW.

```typescript
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  http.get('/api/sessions/:id', ({ params }) => {
    return HttpResponse.json({ sessionId: params.id, status: 'CREATED' });
  }),
  http.post('/api/sessions', () => {
    return HttpResponse.json({ sessionId: 'mock-id' }, { status: 201 });
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

**MSW server file location**: `public/mockServiceWorker.js` (`msw.workerDirectory: ["public"]` config).

## Real-browser component test example (`@vitest/browser-playwright`)

`@vitest/browser-playwright` + Playwright Chromium runs component tests in a real browser (it's the Playwright provider package for Vitest's browser mode). Usable when `vitest.config.ts` has browser mode configured; combine with a fake-timer pattern for polling hooks:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// vi.mock is hoisted above imports, so its factory must not close over a
// later-initialized variable — build the mock with vi.hoisted and keep the
// vi.mock call at top level. For per-test mocking use vi.doMock + dynamic import.
const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }));
vi.mock('@/07-shared/api/base', () => ({ api: { get: mockGet } }));

// polling hook test — use fake timers
describe('use-pairing', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('3초 간격으로 세션 상태 폴링함', async () => {
    // Arrange
    mockGet.mockResolvedValue({ status: 'PAIRED' });

    // Act — render, then advance timers
    vi.advanceTimersByTime(3000);

    // Assert
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2));
  });
});
```

## Test Modification Checklist (5 steps)

1. **Identify the affected layer** — see the mapping table above; when unsure, include more layers.
2. **Run existing tests first** — `npm run test` to see the pre-change state (distinguish pre-existing failures from newly caused ones).
3. **Update tests to match new behavior** — update assertions/fixtures/mocks; create new test files for new features.
4. **Run the verification loop** — confirm `npm run verify` passes fully; see `.agents/rules/verification-loop.md`.
5. **Review the test diff** — if `git diff` shows test changes disproportionate to the code change, reconsider the approach.

## Check Existing Project Patterns

Before creating a new test file:

- **Placement**: test files are co-located with source (`*.test.tsx` in the same folder).
- **Import style**: use the `@/07-shared/...` alias — no relative paths crossing layer boundaries.
- **Test libraries**: `@testing-library/react` + `userEvent`. No enzyme.

## Prohibitions

- **No running `vitest -u` without checking the diff first** — always read the snapshot diff.
- **No deleting tests just to pass CI** — fix the code or update the test correctly.
- **No suppressing test failures with `// eslint-disable` or `@ts-ignore`** — that hides a real bug.
- **`it.skip()` / `xit()` requires a stated reason and an issue link.**
- **No changing test assertions in a refactor PR** — a broken test means behavior changed, i.e. the refactor failed.
- **No Jest API** — `jest.mock`, `jest.fn`, `jest.spyOn`, `npm test -- -u`.

## New Feature Test Requirements

When adding a new component, API function, or hook:

- **Minimum**: 1 happy-path unit test + 1 edge-case unit test.
- **Component**: a render test + a test for the main interaction (click, submit).
- **API function**: MSW mock + response-handling test.
- **Polling hook**: `vi.useFakeTimers()` + verify interval behavior.
- **Snapshot**: add one if the UI output is stable.

## Tests Depending on External Resources

Tests that depend on a real backend URL or external service must be isolated with MSW or `vi.mock`. CI has no access to external services, so an unisolated test fails the whole suite.

```typescript
// ✅ Correct — isolate the API with MSW
server.use(http.get('/api/sessions', () => HttpResponse.json(mockData)));

// ❌ Forbidden — calling the real backend URL directly
const res = await fetch('https://mind-signal-backend-74ab2db9e087.herokuapp.com/api/sessions');
```

---

> **Distinction from Playwright E2E**: `e2e/*.spec.ts` files are Playwright-only,
> separate from the `test` step (Vitest) in `npm run verify`.
> Run E2E with `npm run test:e2e`; see the separate `playwright.config.ts`.
